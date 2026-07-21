import { HttpTypes } from "@medusajs/types"
import { Button, Heading, Input, Text, Textarea, toast } from "@medusajs/ui"
import { useMemo, useState } from "react"
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
  productsQueryKeys,
  useUpdateProduct,
  useUpdateProductVariantsBatch,
} from "../../../../../hooks/api/products"
import { castNumber } from "../../../../../lib/cast-number"
import { queryClient } from "../../../../../lib/query-client"
import { fetchQuery, uploadFilesQuery } from "../../../../../lib/client"
import { InventoryItemWithLevels } from "../../../../../types/inventory"
import { ExtendedAdminProduct } from "../../../../../types/products"
import { ProductCreateOrganizationSection } from "../../../product-create/components/product-create-organize-form/components/product-create-organize-section"
import { ProductCreateSchemaType } from "../../../product-create/types"
import {
  CURRENCY_CODE,
  ProductEditSchema,
  SHIPPING_RETURN_POLICY_KEY,
  buildProductEditDefaults,
} from "../../constants"
import { CollapsibleEditCard } from "../collapsible-edit-card"
import { ProductEditAttributesSection } from "../product-edit-attributes-section"
import { ProductEditMediaSection } from "../product-edit-media-section"
import { ProductEditMetadataSection } from "../product-edit-metadata-section"
import { ProductEditVariantsSection } from "../product-edit-variants-section"

type EditProductFormProps = {
  product: ExtendedAdminProduct
  store?: HttpTypes.AdminStore
  stockLocations: HttpTypes.AdminStockLocation[]
  inventoryItems: InventoryItemWithLevels[]
  // Called after a save's mutations + refetch complete, so the wrapper can
  // re-seed the form from fresh server data (new variants get their real ids).
  onSaved?: () => void
}

const parseIntOrUndefined = (value?: string) =>
  value && value.trim() !== "" ? parseInt(value) || undefined : undefined

export const EditProductForm = ({
  product,
  store,
  stockLocations,
  inventoryItems,
  onSaved,
}: EditProductFormProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { getFormFields, getFormConfigs } = useDashboardExtension()
  const fields = getFormFields("product", "edit")
  const configs = getFormConfigs("product", "edit")

  // Hide the sticky save bar while the Add-variations drawer is open so it
  // doesn't peek through the overlay.
  const [variationsModalOpen, setVariationsModalOpen] = useState(false)

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
  const originalOptions = useMemo(
    () =>
      new Map(
        defaultValues.options
          .filter((o) => o.id)
          .map((o) => [
            o.id as string,
            { title: o.title, values: o.values },
          ])
      ),
    [defaultValues]
  )
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
        // Abort the whole save — don't drop the failed image (or null the
        // thumbnail) and silently commit everything else.
        toast.error(
          `Image upload failed — nothing was saved. ${
            err instanceof Error ? err.message : "Please try again."
          }`
        )
        return
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
          // --- Variant deletions (explicit, already confirmed in the UI) ---
          // Run first: removing an option value's variants must precede the
          // option update that drops that value.
          const toDelete = values.variants_to_delete ?? []
          if (toDelete.length) {
            try {
              await Promise.all(
                toDelete.map((vid) =>
                  fetchQuery(
                    `/vendor/products/${product.id}/variants/${vid}`,
                    { method: "DELETE" }
                  )
                )
              )
            } catch (err) {
              toast.error(
                `Product saved, but removing a variant didn't: ${
                  err instanceof Error ? err.message : "unknown error"
                }`
              )
            }
          }

          // --- Options: create new / update changed / delete removed ---
          const sameValues = (a: string[] = [], b: string[] = []) =>
            a.length === b.length && a.every((v, i) => v === b[i])
          const formOptionIds = new Set(
            values.options.filter((o) => o.id).map((o) => o.id)
          )
          const optionOps: Promise<unknown>[] = []
          // Deletes: originals no longer present in the form.
          for (const [optionId] of originalOptions) {
            if (!formOptionIds.has(optionId)) {
              optionOps.push(
                fetchQuery(
                  `/vendor/products/${product.id}/options/${optionId}`,
                  { method: "DELETE" }
                )
              )
            }
          }
          // Creates + updates.
          for (const option of values.options) {
            if (!option.title.trim()) {
              continue
            }
            const body = { title: option.title, values: option.values }
            if (option.id) {
              const orig = originalOptions.get(option.id)
              if (
                orig &&
                (orig.title !== option.title ||
                  !sameValues(orig.values, option.values))
              ) {
                optionOps.push(
                  fetchQuery(
                    `/vendor/products/${product.id}/options/${option.id}`,
                    { method: "POST", body }
                  )
                )
              }
            } else {
              optionOps.push(
                fetchQuery(`/vendor/products/${product.id}/options`, {
                  method: "POST",
                  body,
                })
              )
            }
          }
          if (optionOps.length) {
            try {
              await Promise.all(optionOps)
            } catch (err) {
              toast.error(
                `Product saved, but some option changes didn't: ${
                  err instanceof Error ? err.message : "unknown error"
                }`
              )
            }
          }

          // --- New variants (opted-in combinations) — after options so their
          // option values exist. ---
          const newVariants = values.variants.filter(
            (v) => !v.id && v.should_create
          )
          if (newVariants.length) {
            try {
              await Promise.all(
                newVariants.map((v) => {
                  const price = v.prices?.[CURRENCY_CODE]
                  const amount =
                    price !== "" && price != null
                      ? parseFloat(String(price))
                      : NaN
                  const prices = !Number.isNaN(amount)
                    ? [{ currency_code: CURRENCY_CODE, amount }]
                    : []
                  return fetchQuery(`/vendor/products/${product.id}/variants`, {
                    method: "POST",
                    body: {
                      title: v.title || Object.values(v.options).join(" / "),
                      sku: v.sku || undefined,
                      options: v.options,
                      manage_inventory: true,
                      prices,
                    },
                  })
                })
              )
            } catch (err) {
              toast.error(
                `Product saved, but adding a variant didn't: ${
                  err instanceof Error ? err.message : "unknown error"
                }`
              )
            }
          }

          // --- Starting stock for new variants (captured in the modal) ---
          // Created variants get their inventory item (and often a zero level)
          // lazily, so refetch to map combo → inventory_item_id, then per item
          // decide create-vs-update against the primary location's level.
          const newWithStock = newVariants.filter(
            (v) => v.new_stock != null && String(v.new_stock).trim() !== ""
          )
          if (newWithStock.length && stockLocations.length) {
            try {
              const { product: fresh } = await fetchQuery(
                `/vendor/products/${product.id}`,
                { method: "GET", query: { fields: "*variants.inventory_items" } }
              )
              const primaryLocation = stockLocations[0].id
              const create: HttpTypes.AdminBatchInventoryItemsLocationLevels["create"] =
                []
              const update: HttpTypes.AdminBatchInventoryItemsLocationLevels["update"] =
                []
              for (const nv of newWithStock) {
                const title = nv.title || Object.values(nv.options).join(" / ")
                const freshVariant = (fresh?.variants ?? []).find(
                  (fv: any) => fv.title === title
                )
                const invId =
                  freshVariant?.inventory_items?.[0]?.inventory_item_id
                if (!invId) {
                  continue
                }
                const entry = {
                  inventory_item_id: invId,
                  location_id: primaryLocation,
                  stocked_quantity: castNumber(nv.new_stock as any),
                }
                // A manage_inventory variant may already have a zero level at
                // the location — update it instead of creating a duplicate.
                let hasLevel = false
                try {
                  const res = await fetchQuery(
                    `/vendor/inventory-items/${invId}/location-levels`,
                    { method: "GET" }
                  )
                  hasLevel = (res?.location_levels ?? []).some(
                    (l: any) => l.location_id === primaryLocation
                  )
                } catch {
                  // treat as no level
                }
                if (hasLevel) {
                  update.push(entry)
                } else {
                  create.push(entry)
                }
              }
              if (create.length || update.length) {
                await updateStockLevels({
                  create,
                  update,
                  delete: [],
                  force: true,
                })
              }
            } catch (err) {
              toast.error(
                `Variants added, but their starting stock didn't set: ${
                  err instanceof Error ? err.message : "unknown error"
                }`
              )
            }
          }

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
          // Re-baseline immediately so the sticky bar hides.
          form.reset(values)
          // The variant/option creates + deletes above ran AFTER useUpdateProduct
          // already invalidated the product query, so the cache is stale (it
          // never saw the new/removed variants/options). Re-fetch now — awaited
          // so the cache holds fresh server state.
          await queryClient.invalidateQueries({
            queryKey: productsQueryKeys.detail(product.id),
          })
          // If anything structural was created or deleted, the form still holds
          // id-less new entries (and stale variants_to_delete). Re-seed the form
          // from the fresh product so those carry their real ids — otherwise a
          // second save would recreate them. Pure field/price edits skip this
          // (no remount, no flicker).
          const createdOptions = values.options.some(
            (o) => !o.id && o.title.trim()
          )
          const deletedOptions = Array.from(originalOptions.keys()).some(
            (oid) => !formOptionIds.has(oid)
          )
          if (
            newVariants.length > 0 ||
            toDelete.length > 0 ||
            createdOptions ||
            deletedOptions
          ) {
            onSaved?.()
          }
        },
        onError: (e) => {
          toast.error(e.message)
        },
      }
    )
  }, () => {
    // Validation failed — surface WHY instead of a silent no-op Save.
    const errs = form.formState.errors
    let message = "Please fix the highlighted fields before saving."
    if (errs.title) {
      message = "A product title is required."
    } else if (errs.options) {
      message =
        "Every option must keep at least one value, and a product needs at " +
        "least one option. Leave one option with a value (a product can't " +
        "have zero options/variants)."
    } else if (errs.variants) {
      message = "A product needs at least one variant."
    }
    toast.error(message)
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
          <ProductEditMediaSection form={form} />

          {/* Organize — type / categories / tags / discountable */}
          <ProductCreateOrganizationSection form={createForm} />

          {/* Attributes — collapsed by default (optional shipping/customs) */}
          <CollapsibleEditCard
            title={t("products.attributes", "Attributes")}
            description="Optional shipping dimensions & customs codes."
          >
            <ProductEditAttributesSection form={form} />
          </CollapsibleEditCard>

          {/* Options + Variants — live combination grid */}
          <ProductEditVariantsSection
            form={form}
            store={store}
            stockLocations={stockLocations}
            onModalOpenChange={setVariationsModalOpen}
          />

          {/* Metadata */}
          <ProductEditMetadataSection form={form} />

          {!variationsModalOpen && (
            <StickySaveBar
              form={form}
              isSubmitting={isPending}
              saveLabel={t("actions.save")}
            />
          )}
        </KeyboundForm>
      </Form>
    </SingleColumnPage>
  )
}
