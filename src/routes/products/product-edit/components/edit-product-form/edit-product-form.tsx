import { Button, Heading, Input, Text, Textarea, toast } from "@medusajs/ui"
import { useMemo } from "react"
import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import * as zod from "zod"

import { RichTextEditor } from "../../../../../components/common/rich-text-editor/rich-text-editor"
import { Form } from "../../../../../components/common/form"
import {
  InlineEditCard,
  InlineTextField,
  StickySaveBar,
} from "../../../../../components/common/inline-edit"
import { SingleColumnPage } from "../../../../../components/layout/pages"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import {
  FormExtensionZone,
  useDashboardExtension,
  useExtendableForm,
} from "../../../../../extensions"
import {
  useUpdateProduct,
  useUpdateProductVariantsBatch,
} from "../../../../../hooks/api/products"
import { fetchQuery } from "../../../../../lib/client"
import {
  ExtendedAdminProduct,
  ExtendedAdminProductVariant,
} from "../../../../../types/products"
import { ProductCreateOrganizationSection } from "../../../product-create/components/product-create-organize-form/components/product-create-organize-section"
import { ProductCreateSchemaType } from "../../../product-create/types"
import { ProductCreatePriceField } from "../../../product-create/components/product-create-variants-pricing-section/product-create-price-field"

// Vendor catalog is USD-only today.
const CURRENCY_CODE = "usd"

const readUsdAmount = (variant: ExtendedAdminProductVariant): string => {
  const price = variant.prices?.find((p) => p.currency_code === CURRENCY_CODE)
  if (!price || price.amount == null) return ""
  return String(price.amount)
}

const EditProductSchema = zod.object({
  title: zod.string().min(1),
  subtitle: zod.string().optional(),
  handle: zod.string().min(1),
  description: zod.string().optional(),
  discountable: zod.boolean(),
  shipping_return_policy: zod.string().optional(),
  type_id: zod.string().optional(),
  categories: zod.array(zod.string()),
  tags: zod.array(zod.string()).optional(),
  variants: zod.array(
    zod.object({
      id: zod.string(),
      title: zod.string().optional(),
      sku: zod.string().optional(),
      price: zod.string().optional(),
    })
  ),
})

export const EditProductForm = ({
  product,
}: {
  product: ExtendedAdminProduct
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { getFormFields, getFormConfigs } = useDashboardExtension()
  const fields = getFormFields("product", "edit")
  const configs = getFormConfigs("product", "edit")

  const existingPolicy =
    ((product as any).metadata?.shipping_return_policy as string) || ""

  // Snapshots of the loaded values so submit can send only what changed.
  const originalVariants = useMemo(
    () =>
      new Map(
        (product.variants ?? []).map((v) => [
          v.id,
          { title: v.title || "", sku: v.sku || "", price: readUsdAmount(v) },
        ])
      ),
    [product.variants]
  )
  const originalTagIds = useMemo(
    () => (product.tags ?? []).map((tag) => tag.id),
    [product.tags]
  )

  const form = useExtendableForm({
    // Product is already loaded before this renders, so defaults are the
    // pristine baseline — the sticky bar stays hidden until an actual edit.
    defaultValues: {
      title: product.title,
      subtitle: (product as any).subtitle || "",
      handle: product.handle || "",
      description: product.description || "",
      discountable: product.discountable,
      shipping_return_policy: existingPolicy,
      type_id: (product as any).type_id || "",
      categories: (product.categories ?? []).map((c) => c.id),
      tags: originalTagIds,
      variants: (product.variants ?? []).map((v) => ({
        id: v.id,
        title: v.title || "",
        sku: v.sku || "",
        price: readUsdAmount(v),
      })),
    },
    schema: EditProductSchema,
    configs,
    data: product,
  })

  const { mutateAsync: updateProduct, isPending } = useUpdateProduct(product.id)
  const { mutateAsync: updateVariants } = useUpdateProductVariantsBatch(
    product.id
  )

  const handleSubmit = form.handleSubmit(async (values) => {
    await updateProduct(
      {
        title: values.title,
        subtitle: values.subtitle || undefined,
        handle: values.handle,
        description: values.description,
        discountable: values.discountable,
        type_id: values.type_id || undefined,
        categories: values.categories.map((id) => ({ id })),
      } as any,
      {
        onSuccess: async () => {
          // --- Variant prices/title/sku (only the ones that changed) ---
          const changedVariants = values.variants
            .filter((v) => {
              const orig = originalVariants.get(v.id)
              if (!orig) return false
              return (
                (v.title || "") !== orig.title ||
                (v.sku || "") !== orig.sku ||
                (v.price || "") !== orig.price
              )
            })
            .map((v) => {
              const body: Record<string, unknown> = {
                id: v.id,
                title: v.title,
                sku: v.sku || undefined,
              }
              // Blank price = "leave unchanged"; only send a real amount.
              if (v.price !== "" && v.price != null) {
                const amount = parseFloat(v.price)
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
          const finalPolicy = (values.shipping_return_policy ?? "").trim()
          if (finalPolicy !== existingPolicy.trim()) {
            try {
              await fetchQuery(
                `/vendor/products/${product.id}/shipping-return-policy`,
                {
                  method: "POST",
                  body: { shipping_return_policy: finalPolicy || null },
                }
              )
            } catch (err) {
              toast.error(
                `Product saved, but the per-product policy didn't: ${
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

  const orgForm = form as unknown as UseFormReturn<ProductCreateSchemaType>

  return (
    <SingleColumnPage widgets={{ before: [], after: [] }} hasOutlet={false}>
      <Form {...form}>
        <KeyboundForm
          onSubmit={handleSubmit}
          className="flex flex-col gap-y-3"
        >
          <div className="flex items-center justify-between">
            <Heading level="h1">{t("products.edit.header")}</Heading>
            <Button
              variant="secondary"
              size="small"
              type="button"
              onClick={() => navigate(`/products/${product.id}`)}
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

          {/* Media — view current images; manage in the dedicated editor */}
          <InlineEditCard
            title="Media"
            description="Manage this product's images."
          >
            <div className="flex flex-col gap-y-3 px-6 py-4">
              {product.images?.length ? (
                <div className="flex flex-wrap gap-2">
                  {product.images.map((img) => (
                    <img
                      key={img.id ?? img.url}
                      src={img.url}
                      className="size-16 rounded-md object-cover"
                    />
                  ))}
                </div>
              ) : (
                <Text size="small" className="text-ui-fg-subtle">
                  No images yet.
                </Text>
              )}
              <Button
                type="button"
                variant="secondary"
                size="small"
                className="self-start"
                onClick={() => navigate(`/products/${product.id}/media`)}
              >
                Manage media
              </Button>
            </div>
          </InlineEditCard>

          {/* Organize — reuse the create section (same field names) */}
          <InlineEditCard title={t("products.create.tabs.organize", "Organize")}>
            <div className="px-6 py-4">
              <ProductCreateOrganizationSection form={orgForm} />
            </div>
          </InlineEditCard>

          {/* Variants & pricing — one card per existing variant */}
          {(product.variants ?? []).map((variant, index) => (
            <InlineEditCard
              key={variant.id}
              title={
                (product.variants?.length ?? 0) > 1
                  ? variant.title || variant.sku || `Variant ${index + 1}`
                  : "Pricing"
              }
            >
              <InlineTextField
                control={form.control}
                name={`variants.${index}.title`}
                label={t("fields.title")}
                stacked
              />
              <InlineTextField
                control={form.control}
                name={`variants.${index}.sku`}
                label={t("fields.sku")}
                optional
                stacked
              />
              <ProductCreatePriceField
                control={form.control}
                name={`variants.${index}.price`}
                code={CURRENCY_CODE}
                stacked
              />
            </InlineEditCard>
          ))}

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
