import { Button, Heading, toast } from "@medusajs/ui"
import { HttpTypes } from "@medusajs/types"
import { useMemo } from "react"
import { useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { Form } from "../../../../../components/common/form"
import { StickySaveBar } from "../../../../../components/common/inline-edit"
import { SingleColumnPage } from "../../../../../components/layout/pages"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import {
  useDashboardExtension,
  useExtendableForm,
} from "../../../../../extensions"
import { useRegions } from "../../../../../hooks/api"
import { usePricePreferences } from "../../../../../hooks/api/price-preferences"
import { useCreateProduct } from "../../../../../hooks/api/products"
import { fetchQuery, uploadFilesQuery } from "../../../../../lib/client"
import {
  PRODUCT_CREATE_FORM_DEFAULTS,
  ProductCreateSchema,
} from "../../constants"
import { ProductCreateDetailsForm } from "../product-create-details-form"
import { ProductCreateInventoryKitForm } from "../product-create-inventory-kit-form"
import { ProductCreateOrganizeForm } from "../product-create-organize-form"
import { ProductCreateVariantsPricingSection } from "../product-create-variants-pricing-section"

const SAVE_DRAFT_BUTTON = "save-draft-button"

type ProductCreateFormProps = {
  defaultChannel?: HttpTypes.AdminSalesChannel
  store?: HttpTypes.AdminStore
  pricePreferences?: HttpTypes.AdminPricePreference[]
}

export const ProductCreateForm = ({
  defaultChannel,
  store,
}: ProductCreateFormProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { getFormConfigs } = useDashboardExtension()
  const configs = getFormConfigs("product", "create")

  useRegions({ limit: 9999 })
  usePricePreferences({
    limit: 9999,
  })

  const form = useExtendableForm({
    defaultValues: {
      ...PRODUCT_CREATE_FORM_DEFAULTS,
      sales_channels: defaultChannel
        ? [
            {
              id: defaultChannel.id,
              name: defaultChannel.name,
            },
          ]
        : [],
    },
    schema: ProductCreateSchema,
    configs,
  })

  const { mutateAsync, isPending } = useCreateProduct()

  /**
   * TODO: Important to revisit this - use variants watch so high in the tree can cause needless rerenders of the entire page
   * which is suboptimal when rerenders are caused by bulk editor changes
   */

  const watchedVariants = useWatch({
    control: form.control,
    name: "variants",
  })

  const showInventoryTab = useMemo(
    () => watchedVariants.some((v) => v.manage_inventory && v.inventory_kit),
    [watchedVariants]
  )

  const handleSubmit = form.handleSubmit(async (values, e) => {
    let isDraftSubmission = false

    if (e?.nativeEvent instanceof SubmitEvent) {
      const submitter = e?.nativeEvent?.submitter as HTMLButtonElement
      isDraftSubmission = submitter.dataset.name === SAVE_DRAFT_BUTTON
    }

    const media = values.media || []
    const payload = { ...values, media: undefined }

    let uploadedMedia: (HttpTypes.AdminFile & {
      isThumbnail: boolean
    })[] = []
    try {
      if (media.length) {
        const thumbnailReq = media.filter((m) => m.isThumbnail)
        const otherMediaReq = media.filter((m) => !m.isThumbnail)

        const fileReqs = []
        if (thumbnailReq?.length) {
          fileReqs.push(
            uploadFilesQuery(thumbnailReq).then((r: any) =>
              r.files.map((f: any) => ({
                ...f,
                isThumbnail: true,
              }))
            )
          )
        }
        if (otherMediaReq?.length) {
          fileReqs.push(
            uploadFilesQuery(otherMediaReq).then((r: any) =>
              r.files.map((f: any) => ({
                ...f,
                isThumbnail: false,
              }))
            )
          )
        }

        uploadedMedia = (await Promise.all(fileReqs)).flat()
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      }
    }

    const vendorTagIds = payload.tags || []

    await mutateAsync(
      {
        ...payload,
        status: isDraftSubmission ? "draft" : "proposed",
        images: uploadedMedia,
        weight: parseInt(payload.weight || "") || undefined,
        length: parseInt(payload.length || "") || undefined,
        height: parseInt(payload.height || "") || undefined,
        width: parseInt(payload.width || "") || undefined,
        type_id: payload.type_id || undefined,
        tags: undefined,
        collection_id: payload.collection_id || undefined,
        shipping_profile_id: undefined,
        enable_variants: undefined,
        additional_data: undefined,
        categories: payload.categories.map((cat) => ({
          id: cat,
        })),
        // Only create the variants the user actually kept ticked. Without this
        // filter every generated combination is created, ignoring unchecked
        // rows (the checkbox does nothing on submit).
        variants: payload.variants
          .filter((variant) => variant.should_create)
          .map((variant) => ({
          ...variant,
          sku: variant.sku === "" ? undefined : variant.sku,
          manage_inventory: true,
          allow_backorder: false,
          should_create: undefined,
          is_default: undefined,
          inventory_kit: undefined,
          inventory: undefined,
          prices: Object.keys(variant.prices || {}).map((key) => ({
            currency_code: key,
            amount: parseFloat(variant.prices?.[key] as string),
          })),
        })),
      },
      {
        onSuccess: async (data) => {
          if (vendorTagIds.length > 0) {
            try {
              await fetchQuery(
                `/vendor/products/${data.product.id}/vendor-tags`,
                {
                  method: "POST",
                  body: { tag_ids: vendorTagIds },
                }
              )
            } catch (err: any) {
              toast.error(err.message || "Failed to assign tags")
            }
          }
          toast.success(
            t("products.create.successToast", {
              title: data.product.title,
            })
          )

          navigate(`/products/${data.product.id}`)
        },
        onError: (error) => {
          toast.error(error.message)
        },
      }
    )
  })

  return (
    <SingleColumnPage
      widgets={{ before: [], after: [] }}
      hasOutlet={false}
    >
      <Form {...form}>
        <KeyboundForm
          onSubmit={handleSubmit}
          className="flex flex-col gap-y-3"
        >
          <div className="flex items-center justify-between">
            <Heading level="h1">{t("products.create.title")}</Heading>
            <Button
              variant="secondary"
              size="small"
              type="button"
              onClick={() => navigate("/products")}
            >
              {t("actions.cancel")}
            </Button>
          </div>
          <ProductCreateDetailsForm form={form} />
          <ProductCreateOrganizeForm form={form} />
          <ProductCreateVariantsPricingSection form={form} store={store} />
          {showInventoryTab && <ProductCreateInventoryKitForm form={form} />}
          <StickySaveBar
            form={form}
            isSubmitting={isPending}
            saveLabel="Create Product"
            secondaryAction={{
              label: "Save as draft",
              dataName: SAVE_DRAFT_BUTTON,
              isLoading: isPending,
            }}
          />
        </KeyboundForm>
      </Form>
    </SingleColumnPage>
  )
}
