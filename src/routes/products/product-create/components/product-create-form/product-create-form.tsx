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
import { useBatchInventoryItemsLocationLevels } from "../../../../../hooks/api/inventory"
import { usePricePreferences } from "../../../../../hooks/api/price-preferences"
import { useCreateProduct } from "../../../../../hooks/api/products"
import { castNumber } from "../../../../../lib/cast-number"
import { fetchQuery, uploadFilesQuery } from "../../../../../lib/client"
import { applyNewVariantStock } from "../../../common/utils/apply-new-variant-stock"
import {
  PRODUCT_CREATE_FORM_DEFAULTS,
  ProductCreateSchema,
} from "../../constants"
import { ProductCreateDetailsForm } from "../product-create-details-form"
import { ProductCreateInventoryKitForm } from "../product-create-inventory-kit-form"
import { ProductCreateOrganizeForm } from "../product-create-organize-form"
import {
  ProductColorSwatches,
  getColorOptionValues,
} from "../../../common/components/product-color-swatches"
import { ProductCreateVariantsPricingSection } from "../product-create-variants-pricing-section"

const SAVE_DRAFT_BUTTON = "save-draft-button"

type ProductCreateFormProps = {
  defaultChannel?: HttpTypes.AdminSalesChannel
  store?: HttpTypes.AdminStore
  pricePreferences?: HttpTypes.AdminPricePreference[]
  stockLocations?: HttpTypes.AdminStockLocation[]
}

export const ProductCreateForm = ({
  defaultChannel,
  store,
  stockLocations,
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
  const { mutateAsync: updateStockLevels } =
    useBatchInventoryItemsLocationLevels()

  // Sellers have exactly one stock location today; starting stock goes there.
  const primaryLocation = stockLocations?.[0]

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

  // Color swatches — shown only when there's a color option.
  const watchedOptions = useWatch({ control: form.control, name: "options" })
  const watchedColorHex =
    useWatch({ control: form.control, name: "color_hex" }) ?? {}
  const colorValues = getColorOptionValues(watchedOptions ?? [])

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
      // Abort — don't create the product without the images the user picked.
      toast.error(
        `Image upload failed — the product wasn't created. ${
          error instanceof Error ? error.message : "Please try again."
        }`
      )
      return
    }

    const vendorTagIds = payload.tags || []

    // Starting stock for the variants being created. Matched back to the
    // server's variants by title in applyNewVariantStock, so read it from the
    // same list (and with the same filter) the payload is built from.
    const stockEntries = payload.variants
      .filter(
        (variant) =>
          variant.should_create &&
          variant.new_stock != null &&
          String(variant.new_stock).trim() !== ""
      )
      .map((variant) => ({
        title: variant.title,
        quantity: castNumber(variant.new_stock as string | number),
      }))

    // Color swatches → product.metadata.color_hex (only current color values +
    // valid #rrggbb hexes).
    const colorValueSet = new Set(getColorOptionValues(values.options))
    const colorHexMeta: Record<string, string> = {}
    for (const [value, hex] of Object.entries(values.color_hex ?? {})) {
      if (colorValueSet.has(value) && /^#[0-9a-fA-F]{6}$/.test(hex)) {
        colorHexMeta[value] = hex
      }
    }

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
        color_hex: undefined,
        metadata: Object.keys(colorHexMeta).length
          ? { color_hex: colorHexMeta }
          : undefined,
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
          // Applied after creation, not part of the create payload.
          new_stock: undefined,
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

          // Starting stock — best effort. The product already exists by now, so
          // a failure here isn't rolled back: we say so plainly and still land
          // the vendor on the edit page, where the stock section is ready.
          if (stockEntries.length && primaryLocation) {
            try {
              await applyNewVariantStock({
                productId: data.product.id,
                locationId: primaryLocation.id,
                entries: stockEntries,
                updateStockLevels,
              })
            } catch (err) {
              toast.error(
                `Product created, but its starting stock didn't save — set it on the product page. ${
                  err instanceof Error ? err.message : ""
                }`.trim()
              )
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
          <ProductCreateVariantsPricingSection
            form={form}
            store={store}
            stockLocationName={primaryLocation?.name}
          />
          <ProductColorSwatches
            values={colorValues}
            colorHex={watchedColorHex as Record<string, string>}
            onChange={(next) =>
              form.setValue("color_hex", next, { shouldDirty: true })
            }
          />
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
