import { useCallback, useEffect, useState } from "react"
import { useLoaderData } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { toast } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { useStore } from "../../../hooks/api/store.tsx"
import { storeLoader } from "./loader.ts"

import { SingleColumnPageSkeleton } from "../../../components/common/skeleton/skeleton.tsx"
import { SingleColumnPage } from "../../../components/layout/pages/index.ts"
import { useDashboardExtension } from "../../../extensions/index.ts"
import { StoreStatusSection } from "./components/store-status-section/store-status-section.tsx"
import { useMe, useUpdateMe } from "../../../hooks/api"
import { useSetup } from "../../../hooks/api/setup.tsx"

import { Form } from "../../../components/common/form"
import { KeyboundForm } from "../../../components/utilities/keybound-form"
import {
  StickySaveBar,
  SUPPORTED_FORMATS,
  SUPPORTED_FORMATS_FILE_EXTENSIONS,
} from "../../../components/common/inline-edit"
import { FileType } from "../../../components/common/file-upload"
import { fetchQuery, uploadFilesQuery } from "../../../lib/client"
import { queryClient } from "../../../lib/query-client"
import { StoreSettingsSchema, StoreSettingsSchemaType } from "./constants"
import { InlineStoreCard } from "./components/store-general-section/store-general-card"
import { InlineCompanyCard } from "./components/company-section/company-card"
import { InlineBusinessCard } from "./components/business-section/business-card"

// The Store settings page edits its fields INLINE with a single page-level
// sticky save bar (see components/common/inline-edit). This host owns one form
// spanning every editable card; one submit persists everything: it uploads any
// new logo/cover, POSTs the seller fields (/vendor/sellers/me), then — for
// merchants only, and only when actually changed — POSTs the companion
// storefront fields (cover image + refund policy). Tax ID is intentionally not
// captured here; it is collected by Stripe in the Stripe Connect flow.
export const StoreDetail = () => {
  const { t } = useTranslation()
  const initialData = useLoaderData() as Awaited<ReturnType<typeof storeLoader>>

  const { store, isPending, isError, error } = useStore(undefined, {
    initialData,
  })

  const { seller, isPending: sellerPending, isError: sellerError } = useMe()

  // Service businesses (no storefront) get one merged "Business" card instead
  // of the merchant Store/Company split.
  const { data: setup, isPending: setupPending } = useSetup()
  const isService = setup?.is_service === true

  const { getWidgets } = useDashboardExtension()

  // Cover + refund policy live in the Catholic-Owned seller_storefront
  // companion module, not on Mercur's seller row, so they're fetched
  // separately (merchant only). /vendor/store/cover returns both.
  const { data: storefrontData, isLoading: storefrontLoading } = useQuery({
    queryKey: ["vendor-storefront"],
    queryFn: () =>
      fetchQuery("/vendor/store/cover", { method: "GET" }) as Promise<{
        seller_storefront: {
          cover_image_url: string | null
          refund_policy: string | null
        } | null
      }>,
    enabled: setup !== undefined && !isService,
  })
  const existingCoverUrl = storefrontData?.seller_storefront?.cover_image_url ?? null
  const existingRefundPolicy =
    storefrontData?.seller_storefront?.refund_policy ?? ""

  const form = useForm<StoreSettingsSchemaType>({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      description: "",
      media: [],
      cover_media: [],
      refund_policy: "",
      address_line: "",
      postal_code: "",
      city: "",
      country_code: "",
    },
    resolver: zodResolver(StoreSettingsSchema),
  })

  const { mutateAsync, isPending: isSaving } = useUpdateMe()

  // Seed the form once seller (+ storefront, for merchants) is ready. Using
  // reset (not setValue) so the seeded values are pristine — the sticky bar
  // must not appear on load. `seeded` also gates the initial render so fields
  // never flash empty before seeding. Only seeds once; a post-save refetch
  // won't clobber the user because onSuccess already resets to saved values.
  const [seeded, setSeeded] = useState(false)
  useEffect(() => {
    if (seeded || !seller) return
    if (!isService && storefrontLoading) return

    form.reset({
      name: seller.name ?? "",
      email: seller.email ?? "",
      phone: seller.phone ?? "",
      description: seller.description ?? "",
      media: [],
      cover_media: existingCoverUrl
        ? [coverPlaceholder(existingCoverUrl)]
        : [],
      refund_policy: existingRefundPolicy ?? "",
      address_line: seller.address_line ?? "",
      postal_code: seller.postal_code ?? "",
      city: seller.city ?? "",
      country_code: seller.country_code ?? "",
    })
    setSeeded(true)
  }, [
    seeded,
    seller,
    isService,
    storefrontLoading,
    existingCoverUrl,
    existingRefundPolicy,
    form,
  ])

  // Validate + capture a picked image into the form's media array. The actual
  // upload is deferred to submit; only files with size > 0 are treated as new.
  const captureImage = useCallback(
    (fieldName: "media" | "cover_media", files: FileType[]) => {
      form.clearErrors(fieldName)
      const invalid = files.find((f) => !SUPPORTED_FORMATS.includes(f.file.type))
      if (invalid) {
        form.setError(fieldName, {
          type: "invalid_file",
          message: t("products.media.invalidFileType", {
            name: invalid.file.name,
            types: SUPPORTED_FORMATS_FILE_EXTENSIONS.join(", "),
          }),
        })
        return
      }
      form.setValue(fieldName, [{ ...files[0], isThumbnail: false }], {
        shouldDirty: true,
      })
    },
    [form, t]
  )

  const onLogoUploaded = useCallback(
    (files: FileType[]) => captureImage("media", files),
    [captureImage]
  )
  const onCoverUploaded = useCallback(
    (files: FileType[]) => captureImage("cover_media", files),
    [captureImage]
  )
  const onCoverRemove = useCallback(() => {
    form.setValue("cover_media", [], { shouldDirty: true })
  }, [form])

  const handleSubmit = form.handleSubmit(async (values) => {
    let uploadedMedia: any[] = []
    let uploadedCoverMedia: any[] = []
    try {
      const newLogo = values.media?.filter(
        (m) => m && (m as any).file && (m as any).file.size > 0
      )
      if (newLogo?.length) {
        uploadedMedia = (
          await uploadFilesQuery(newLogo as any).then((r: any) =>
            r.files.map((f: any) => ({ ...f, isThumbnail: false }))
          )
        ).flat()
      }
      if (!isService) {
        const newCover = values.cover_media?.filter(
          (m) => m && (m as any).file && (m as any).file.size > 0
        )
        if (newCover?.length) {
          uploadedCoverMedia = (
            await uploadFilesQuery(newCover as any).then((r: any) =>
              r.files.map((f: any) => ({ ...f, isThumbnail: false }))
            )
          ).flat()
        }
      }
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message)
      }
      return
    }

    const basePayload = {
      name: values.name,
      email: values.email,
      phone: values.phone,
      address_line: values.address_line,
      postal_code: values.postal_code,
      city: values.city,
      country_code: values.country_code,
    }
    const payload = isService
      ? basePayload
      : {
          ...basePayload,
          description: values.description,
          photo: uploadedMedia[0]?.url || seller!.photo || "",
        }

    await mutateAsync(payload as any, {
      onSuccess: async () => {
        // Companion storefront fields — merchant only, and only re-POSTed when
        // the field was actually edited, so a name-only save doesn't touch them.
        if (!isService) {
          const finalCoverUrl =
            uploadedCoverMedia[0]?.url ??
            (values.cover_media?.[0] as any)?.url ??
            null
          const finalRefundPolicy = (values.refund_policy ?? "").trim() || null
          const coverDirty = form.getFieldState("cover_media").isDirty
          const refundDirty = form.getFieldState("refund_policy").isDirty

          try {
            if (coverDirty && finalCoverUrl !== existingCoverUrl) {
              await fetchQuery("/vendor/store/cover", {
                method: "POST",
                body: { cover_image_url: finalCoverUrl },
              })
            }
            if (
              refundDirty &&
              finalRefundPolicy !== (existingRefundPolicy || null)
            ) {
              await fetchQuery("/vendor/store/refund-policy", {
                method: "POST",
                body: { refund_policy: finalRefundPolicy },
              })
            }
          } catch (err) {
            if (err instanceof Error) {
              toast.error(`Storefront update failed: ${err.message}`)
              return
            }
          }

          queryClient.invalidateQueries({ queryKey: ["vendor-storefront"] })
        }

        toast.success("Store updated")

        // Make the just-saved values the new pristine baseline so the sticky
        // bar disappears. Logo now lives on seller.photo (media cleared →
        // preview falls back to it); cover is re-seeded as an existing-URL
        // placeholder so its preview persists.
        const savedCoverUrl =
          uploadedCoverMedia[0]?.url ??
          (values.cover_media?.[0] as any)?.url ??
          null
        form.reset({
          ...values,
          media: [],
          cover_media:
            !isService && savedCoverUrl
              ? [coverPlaceholder(savedCoverUrl)]
              : [],
        })
      },
      onError: (err) => {
        toast.error(err.message)
      },
    })
  })

  if (isError || sellerError) {
    throw error
  }

  if (isPending || sellerPending || setupPending || !store || !seller || !seeded) {
    return <SingleColumnPageSkeleton sections={2} />
  }

  return (
    <SingleColumnPage
      widgets={{
        before: getWidgets("store.details.before"),
        after: getWidgets("store.details.after"),
      }}
      data={store}
      hasOutlet
    >
      <Form {...form}>
        <KeyboundForm
          onSubmit={handleSubmit}
          className="flex flex-col gap-y-3"
        >
          {isService ? (
            <InlineBusinessCard control={form.control} />
          ) : (
            <>
              <InlineStoreCard
                control={form.control}
                sellerPhoto={seller.photo}
                onLogoUploaded={onLogoUploaded}
                onCoverUploaded={onCoverUploaded}
                onCoverRemove={onCoverRemove}
              />
              <StoreStatusSection />
              <InlineCompanyCard control={form.control} />
            </>
          )}
          <StickySaveBar form={form} isSubmitting={isSaving} />
        </KeyboundForm>
      </Form>
    </SingleColumnPage>
  )
}

// A zero-byte-File placeholder standing in for an already-saved cover image so
// FileUpload renders its preview. The submit handler ignores files with
// size === 0, so a placeholder is never re-uploaded.
function coverPlaceholder(url: string) {
  return {
    id: "existing-cover",
    url,
    file: new File([], "existing-cover"),
    isThumbnail: false,
  } as any
}
