import { HttpTypes } from "@medusajs/types"
import { Button, Heading, Input, Text, Textarea, toast } from "@medusajs/ui"
import { useMemo } from "react"
import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { Form } from "../../../../../components/common/form"
import {
  InlineEditCard,
  StickySaveBar,
} from "../../../../../components/common/inline-edit"
import { RichTextEditor } from "../../../../../components/common/rich-text-editor/rich-text-editor"
import { SingleColumnPage } from "../../../../../components/layout/pages"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import {
  FormExtensionZone,
  useDashboardExtension,
  useExtendableForm,
} from "../../../../../extensions"
import { useBatchInventoryItemsLocationLevels } from "../../../../../hooks/api/inventory"
import {
  useUpdateProduct,
  useUpdateProductVariantsBatch,
} from "../../../../../hooks/api/products"
import { castNumber } from "../../../../../lib/cast-number"
import { fetchQuery, uploadFilesQuery } from "../../../../../lib/client"
import { InventoryItemWithLevels } from "../../../../../types/inventory"
import { ExtendedAdminProduct } from "../../../../../types/products"
import { ProductCreateMediaSection } from "../../../product-create/components/product-create-details-form/components/product-create-details-media-section"
import { ProductCreateAttributeSection } from "../../../product-create/components/product-create-organize-form/components/product-create-organize-attribute-section"
import { ProductCreateOrganizationSection } from "../../../product-create/components/product-create-organize-form/components/product-create-organize-section"
import { ProductCreateVariantsPricingSection } from "../../../product-create/components/product-create-variants-pricing-section"
import { ProductCreateSchemaType } from "../../../product-create/types"
import {
  CURRENCY_CODE,
  ProductEditSchema,
  SHIPPING_RETURN_POLICY_KEY,
  buildProductEditDefaults,
} from "../../constants"
import { ProductEditMetadataSection } from "../product-edit-metadata-section"
import { ProductEditStockSection } from "../product-edit-stock-section"

type EditProductFormProps = {
  product: ExtendedAdminProduct
  store?: HttpTypes.AdminStore
  stockLocations: HttpTypes.AdminStockLocation[]
  inventoryItems: InventoryItemWithLevels[]
}

const parseIntOrUndefined = (value?: string) =>
  value && value.trim() !== "" ? parseInt(value) || undefined : undefined

export const EditProductForm = ({
  product,
  store,
  stockLocations,
  inventoryItems,
}: EditProductFormProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { getFormFields, getFormConfigs } = useDashboardExtension()
  const fields = getFormFields("product", "edit")
  const configs = getFormConfigs("product", "edit")

  const defaultValues = useMemo(
    () => buildProductEditDefaults(product, stockLocations, inventoryItems),
    [product, stockLocations, inventoryItems]
  )

  const form = useExtendableForm({
    defaultValues,
    schema: ProductEditSchema,
    configs,
    data: product,
  })

  // Baselines for dirty-aware, minimal-payload saves.
  const originalVariants = useMemo(
    () =>
      new Map(
        defaultValues.variants.map((v) => [
          v.id,
          {
            title: v.title || "",
            sku: v.sku || "",
            price: v.prices?.[CURRENCY_CODE] || "",
          },
        ])
      ),
    [defaultValues]
  )
  const originalTagIds = useMemo(() => defaultValues.tags ?? [], [defaultValues])
  const existingPolicy = defaultValues.shipping_return_policy ?? ""

  const { mutateAsync: updateProduct, isPending } = useUpdateProduct(product.id)
  const { mutateAsync: updateVariants } = useUpdateProductVariantsBatch(
    product.id
  )
  const { mutateAsync: updateStockLevels } =
    useBatchInventoryItemsLocationLevels()

  const handleSubmit = form.handleSubmit(async (values) => {
    // --- Media: upload new files, keep existing urls, resolve thumbnail ---
    const media = values.media || []
    const filesToUpload = media
      .map((m, i) => ({ file: m.file, index: i }))
      .filter((m) => !!m.file)

    let uploaded: HttpTypes.AdminFile[] = []
    if (filesToUpload.length) {
      try {
        const { files } = await uploadFilesQuery(filesToUpload)
        uploaded = files
      } catch (err) {
        toast.error(
          `Image upload failed: ${
            err instanceof Error ? err.message : "unknown error"
          }`
        )
      }
    }
    const withUrls = media.map((entry, i) => {
      const uIdx = filesToUpload.findIndex((m) => m.index === i)
      return uIdx > -1 ? { ...entry, url: uploaded[uIdx]?.url } : entry
    })
    const images = withUrls
      .filter((m) => !!m.url)
      .map((m) => ({ url: m.url as string }))
    const thumbnail = withUrls.find((m) => m.isThumbnail)?.url || null

    // --- Metadata (+ preserve the dedicated shipping/return policy key) ---
    const metadataObject: Record<string, unknown> = {}
    values.metadata.forEach(({ key, value }) => {
      if (key.trim() !== "") {
        metadataObject[key] = value
      }
    })
    const finalPolicy = (values.shipping_return_policy ?? "").trim()
    if (finalPolicy) {
      metadataObject[SHIPPING_RETURN_POLICY_KEY] = finalPolicy
    }

    await updateProduct(
      {
        title: values.title,
        subtitle: values.subtitle || undefined,
        handle: values.handle,
        description: values.description,
        discountable: values.discountable,
        type_id: values.type_id || undefined,
        collection_id: values.collection_id || undefined,
        categories: values.categories.map((id) => ({ id })),
        origin_country: values.origin_country || undefined,
        material: values.material || undefined,
        weight: parseIntOrUndefined(values.weight),
        length: parseIntOrUndefined(values.length),
        height: parseIntOrUndefined(values.height),
        width: parseIntOrUndefined(values.width),
        mid_code: values.mid_code || undefined,
        hs_code: values.hs_code || undefined,
        images,
        thumbnail,
        metadata: metadataObject,
      } as any,
      {
        onSuccess: async () => {
          // --- Variant title/sku/USD price (only the ones that changed) ---
          const changedVariants = values.variants
            .filter((v) => {
              const orig = originalVariants.get(v.id)
              if (!orig) {
                return false
              }
              const price = v.prices?.[CURRENCY_CODE] ?? ""
              return (
                (v.title || "") !== orig.title ||
                (v.sku || "") !== orig.sku ||
                (price || "") !== orig.price
              )
            })
            .map((v) => {
              const body: Record<string, unknown> = {
                id: v.id,
                title: v.title,
                sku: v.sku || undefined,
              }
              const price = v.prices?.[CURRENCY_CODE]
              if (price !== "" && price != null) {
                const amount = parseFloat(String(price))
                if (!Number.isNaN(amount)) {
                  body.prices = [{ currency_code: CURRENCY_CODE, amount }]
                }
              }
              return body as { id: string; [key: string]: unknown }
            })

          if (changedVariants.length) {
            try {
              await updateVariants(changedVariants)
            } catch (err) {
              toast.error(
                `Product saved, but variant changes didn't: ${
                  err instanceof Error ? err.message : "unknown error"
                }`
              )
            }
          }

          // --- Stock (only if the stock section was touched) ---
          if (form.getFieldState("stock").isDirty) {
            const payload: HttpTypes.AdminBatchInventoryItemsLocationLevels = {
              create: [],
              update: [],
              delete: [],
              force: true,
            }
            values.stock.forEach((variant) => {
              if (!variant.inventory_item_id) {
                return
              }
              variant.locations.forEach(
                ({ checked, level_id, quantity, id }) => {
                  const qty = quantity != null ? castNumber(quantity) : 0
                  if (!level_id && checked) {
                    payload.create.push({
                      inventory_item_id: variant.inventory_item_id as string,
                      location_id: id,
                      stocked_quantity: qty,
                    })
                  } else if (level_id && !checked) {
                    payload.delete.push(level_id)
                  } else if (level_id && checked) {
                    payload.update.push({
                      inventory_item_id: variant.inventory_item_id as string,
                      location_id: id,
                      stocked_quantity: qty,
                    })
                  }
                }
              )
            })
            if (
              payload.create.length ||
              payload.update.length ||
              payload.delete.length
            ) {
              try {
                await updateStockLevels(payload)
              } catch (err) {
                toast.error(
                  `Product saved, but stock didn't: ${
                    err instanceof Error ? err.message : "unknown error"
                  }`
                )
              }
            }
          }

          // --- Vendor tags (separate route, only if changed) ---
          const tagIds = values.tags ?? []
          const tagsChanged =
            tagIds.length !== originalTagIds.length ||
            tagIds.some((id) => !originalTagIds.includes(id))
          if (tagsChanged) {
            try {
              await fetchQuery(`/vendor/products/${product.id}/vendor-tags`, {
                method: "POST",
                body: { tag_ids: tagIds },
              })
            } catch (err) {
              toast.error(
                `Product saved, but tags didn't: ${
                  err instanceof Error ? err.message : "unknown error"
                }`
              )
            }
          }

          // --- Per-product shipping/return policy (dedicated route) ---
          if (finalPolicy !== existingPolicy.trim()) {
            try {
              await fetchQuery(
                `/vendor/products/${product.id}/shipping-return-policy`,
                {
                  method: "POST",
                  body: { shipping_return_policy: finalPolicy },
                }
              )
            } catch (err) {
              toast.error(
                `Product saved, but the shipping/return policy didn't: ${
                  err instanceof Error ? err.message : "unknown error"
                }`
              )
            }
          }

          toast.success(
            t("products.edit.successToast", { title: values.title })
          )
          // Re-baseline so the sticky bar hides again.
          form.reset(values)
        },
        onError: (e) => {
          toast.error(e.message)
        },
      }
    )
  })

  // The reused create sections are typed against the create schema; our edit
  // schema is a compatible superset for the fields they touch.
  const createForm = form as unknown as UseFormReturn<ProductCreateSchemaType>

  return (
    <SingleColumnPage widgets={{ before: [], after: [] }} hasOutlet={false}>
      <Form {...form}>
        <KeyboundForm onSubmit={handleSubmit} className="flex flex-col gap-y-3">
          <div className="flex items-center justify-between">
            <Heading level="h1">{product.title}</Heading>
            <Button
              variant="secondary"
              size="small"
              type="button"
              onClick={() => navigate("/products")}
            >
              {t("actions.cancel")}
            </Button>
          </div>

          {/* General */}
          <InlineEditCard title={t("products.create.tabs.details", "Details")}>
            <div className="flex flex-col gap-y-4 px-6 py-4">
              <Form.Field
                control={form.control}
                name="title"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>{t("fields.title")}</Form.Label>
                    <Form.Control>
                      <Input {...field} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="subtitle"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label optional>{t("fields.subtitle")}</Form.Label>
                    <Form.Control>
                      <Input {...field} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="handle"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>{t("fields.handle")}</Form.Label>
                    <Form.Control>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 z-10 flex w-8 items-center justify-center border-r">
                          <Text
                            className="text-ui-fg-muted"
                            size="small"
                            leading="compact"
                            weight="plus"
                          >
                            /
                          </Text>
                        </div>
                        <Input {...field} className="pl-10" />
                      </div>
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="description"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label optional>{t("fields.description")}</Form.Label>
                    <Form.Control>
                      <RichTextEditor
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                      />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="shipping_return_policy"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label optional>
                      Shipping & return policy for this product
                    </Form.Label>
                    <Form.Control>
                      <Textarea {...field} rows={4} />
                    </Form.Control>
                    <Text size="small" className="text-ui-fg-subtle mt-1">
                      Overrides your store-wide policy for this item only. Leave
                      blank to use your store default.
                    </Text>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
              <FormExtensionZone fields={fields} form={form} />
            </div>
          </InlineEditCard>

          {/* Media */}
          <ProductCreateMediaSection form={createForm} />

          {/* Organize — type / categories / tags / discountable */}
          <ProductCreateOrganizationSection form={createForm} />

          {/* Attributes — dimensions, codes, country, material */}
          <ProductCreateAttributeSection form={createForm} />

          {/* Variants & pricing — per-variant title / sku / USD price */}
          <ProductCreateVariantsPricingSection form={createForm} store={store} />

          {/* Stock — per-variant, per-location quantities */}
          <ProductEditStockSection form={form} />

          {/* Metadata */}
          <ProductEditMetadataSection form={form} />

          <StickySaveBar
            form={form}
            isSubmitting={isPending}
            saveLabel={t("actions.save")}
          />
        </KeyboundForm>
      </Form>
    </SingleColumnPage>
  )
}
