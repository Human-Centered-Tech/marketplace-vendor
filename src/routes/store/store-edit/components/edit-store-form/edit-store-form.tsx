import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Input, Textarea, toast } from "@medusajs/ui"
import { useFieldArray, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { Form } from "../../../../../components/common/form"

import { RouteDrawer, useRouteModal } from "../../../../../components/modals"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import { StoreVendor } from "../../../../../types/user"
import { useUpdateMe } from "../../../../../hooks/api"
import { MediaSchema } from "../../../../products/product-create/constants"
import {
  FileType,
  FileUpload,
} from "../../../../../components/common/file-upload"
import { useCallback, useEffect } from "react"
import { fetchQuery, uploadFilesQuery } from "../../../../../lib/client"
import { HttpTypes } from "@medusajs/types"
import { useQuery } from "@tanstack/react-query"

export const EditStoreSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  media: z.array(MediaSchema).optional(),
  cover_media: z.array(MediaSchema).optional(),
  refund_policy: z.string().optional(),
})

const SUPPORTED_FORMATS = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/svg+xml",
]

const SUPPORTED_FORMATS_FILE_EXTENSIONS = [
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".heic",
  ".svg",
]

export const EditStoreForm = ({ seller }: { seller: StoreVendor }) => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()

  const form = useForm<z.infer<typeof EditStoreSchema>>({
    defaultValues: {
      name: seller.name,
      description: seller.description ?? "",
      phone: seller.phone ?? "",
      email: seller.email ?? "",
      media: [],
      cover_media: [],
      refund_policy: "",
    },
    resolver: zodResolver(EditStoreSchema),
  })

  const { fields } = useFieldArray({
    name: "media",
    control: form.control,
    keyName: "field_id",
  })

  const { fields: coverFields } = useFieldArray({
    name: "cover_media",
    control: form.control,
    keyName: "field_id",
  })

  // Pre-fill the cover + refund policy from the existing storefront row.
  // Both live in the Catholic-Owned seller_storefront companion module,
  // not on Mercur's seller row, so fetched separately. /vendor/store/cover
  // and /vendor/store/refund-policy return the same row shape; we read
  // from the cover endpoint to keep the request count minimal.
  const { data: storefrontData } = useQuery({
    queryKey: ["vendor-storefront"],
    queryFn: () =>
      fetchQuery("/vendor/store/cover", { method: "GET" }) as Promise<{
        seller_storefront: {
          cover_image_url: string | null
          refund_policy: string | null
        } | null
      }>,
  })
  const existingCoverUrl = storefrontData?.seller_storefront?.cover_image_url
  const existingRefundPolicy =
    storefrontData?.seller_storefront?.refund_policy ?? ""
  useEffect(() => {
    if (existingCoverUrl && form.getValues("cover_media")?.length === 0) {
      form.setValue("cover_media", [
        {
          id: "existing-cover",
          url: existingCoverUrl,
          file: new File([], "existing-cover"),
          isThumbnail: false,
        } as any,
      ])
    }
  }, [existingCoverUrl, form])
  useEffect(() => {
    if (existingRefundPolicy && !form.getValues("refund_policy")) {
      form.setValue("refund_policy", existingRefundPolicy)
    }
  }, [existingRefundPolicy, form])

  const { mutateAsync, isPending } = useUpdateMe()

  const hasInvalidFiles = useCallback(
    (fileList: FileType[]) => {
      const invalidFile = fileList.find(
        (f) => !SUPPORTED_FORMATS.includes(f.file.type)
      )

      if (invalidFile) {
        form.setError("media", {
          type: "invalid_file",
          message: t("products.media.invalidFileType", {
            name: invalidFile.file.name,
            types: SUPPORTED_FORMATS_FILE_EXTENSIONS.join(", "),
          }),
        })

        return true
      }

      return false
    },
    [form, t]
  )

  const onUploaded = useCallback(
    (files: FileType[]) => {
      form.clearErrors("media")
      if (hasInvalidFiles(files)) {
        return
      }

      form.setValue("media", [{ ...files[0], isThumbnail: false }])
    },
    [form, hasInvalidFiles]
  )

  const onCoverUploaded = useCallback(
    (files: FileType[]) => {
      form.clearErrors("cover_media")
      if (hasInvalidFiles(files)) {
        return
      }

      form.setValue("cover_media", [{ ...files[0], isThumbnail: false }])
    },
    [form, hasInvalidFiles]
  )

  const handleSubmit = form.handleSubmit(async (values) => {
    let uploadedMedia: (HttpTypes.AdminFile & {
      isThumbnail: boolean
    })[] = []
    let uploadedCoverMedia: (HttpTypes.AdminFile & {
      isThumbnail: boolean
    })[] = []
    try {
      // Logo upload — only if the user actually picked a new file (not
      // the existing-cover placeholder we seed below).
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

      // Cover upload — same posture. The form's cover_media is pre-seeded
      // with an `existing-cover` placeholder when the seller already has
      // one (so the FileUpload renders a preview); skip those.
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
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      }
    }

    await mutateAsync(
      {
        name: values.name,
        email: values.email,
        phone: values.phone,
        description: values.description,
        photo: uploadedMedia[0]?.url || seller.photo || "",
      },
      {
        onSuccess: async () => {
          // Persist cover + refund_policy after the Mercur seller save
          // succeeded. Two requests intentionally — Mercur's
          // /vendor/sellers/me doesn't know about our companion module.
          // Each call is skipped if the field didn't actually change so
          // we don't write empty rows for vendors who only edited their
          // name or phone.
          const finalCoverUrl =
            uploadedCoverMedia[0]?.url ??
            (values.cover_media?.[0] as any)?.url ??
            null
          const finalRefundPolicy = (values.refund_policy ?? "").trim() || null

          const coverChanged = finalCoverUrl !== existingCoverUrl
          const refundChanged =
            finalRefundPolicy !== (existingRefundPolicy || null)

          try {
            if (coverChanged) {
              await fetchQuery("/vendor/store/cover", {
                method: "POST",
                body: { cover_image_url: finalCoverUrl },
              })
            }
            if (refundChanged) {
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

          toast.success("Store updated")
          handleSuccess()
        },
        onError: (error) => {
          toast.error(error.message)
        },
      }
    )
  })

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm onSubmit={handleSubmit} className="flex h-full flex-col">
        <RouteDrawer.Body className="flex flex-1 flex-col gap-y-8 overflow-y-auto">
          <div className="flex flex-col gap-y-8">
            <Form.Field
              name="media"
              control={form.control}
              render={() => {
                return (
                  <Form.Item>
                    <div className="flex flex-col gap-y-2">
                      <div className="flex flex-col gap-y-1">
                        <Form.Label optional>Logo</Form.Label>
                      </div>
                      <Form.Control>
                        <FileUpload
                          uploadedImage={fields[0]?.url || seller.photo || ""}
                          multiple={false}
                          label={t("products.media.uploadImagesLabel")}
                          hint={t("products.media.uploadImagesHint")}
                          hasError={!!form.formState.errors.media}
                          formats={SUPPORTED_FORMATS}
                          onUploaded={onUploaded}
                        />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </div>
                  </Form.Item>
                )
              }}
            />
            <Form.Field
              name="cover_media"
              control={form.control}
              render={() => {
                return (
                  <Form.Item>
                    <div className="flex flex-col gap-y-2">
                      <div className="flex flex-col gap-y-1">
                        <Form.Label optional>Cover photo</Form.Label>
                        <span className="text-ui-fg-subtle text-xs">
                          Hero banner shown at the top of your storefront page.
                          Wide aspect ratio works best (≥ 1200×400).
                        </span>
                      </div>
                      <Form.Control>
                        <FileUpload
                          uploadedImage={coverFields[0]?.url || ""}
                          multiple={false}
                          label={t("products.media.uploadImagesLabel")}
                          hint={t("products.media.uploadImagesHint")}
                          hasError={!!form.formState.errors.cover_media}
                          formats={SUPPORTED_FORMATS}
                          onUploaded={onCoverUploaded}
                        />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </div>
                  </Form.Item>
                )
              }}
            />
            <Form.Field
              name="name"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Name</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              name="email"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Email</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              name="phone"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Phone Number</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              name="description"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>Description</Form.Label>
                  <Form.Control>
                    <Textarea {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              name="refund_policy"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label optional>Refund policy</Form.Label>
                  <span className="text-ui-fg-subtle text-xs">
                    Plain text. Shown on your storefront page so buyers know
                    your terms before they purchase. Line breaks preserved.
                  </span>
                  <Form.Control>
                    <Textarea {...field} rows={6} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
          </div>
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary">
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>
            <Button size="small" isLoading={isPending} type="submit">
              {t("actions.save")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}
