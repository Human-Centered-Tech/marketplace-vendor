import { HttpTypes } from "@medusajs/types"
import { castNumber } from "../../../lib/cast-number"
import { ProductCreateSchemaType } from "./types"

export const normalizeProductFormValues = (
  values: ProductCreateSchemaType & {
    status: HttpTypes.AdminProductStatus
    regionsCurrencyMap: Record<string, string>
  }
): HttpTypes.AdminCreateProduct => {
  const thumbnail = values.media?.find((media) => media.isThumbnail)?.url
  const images = values.media
    ?.filter((media) => !media.isThumbnail)
    .map((media) => ({ url: media.url }))

  return {
    status: values.status,
    is_giftcard: false,
    tags: values?.tags?.length
      ? values.tags?.map((tag) => ({ id: tag }))
      : undefined,
    sales_channels: values?.sales_channels?.length
      ? values.sales_channels?.map((sc) => ({ id: sc.id }))
      : undefined,
    images,
    collection_id: values.collection_id || undefined,
    shipping_profile_id: values.shipping_profile_id || undefined,
    categories: values.categories.map((id) => ({ id })),
    type_id: values.type_id || undefined,
    handle: values.handle || undefined,
    origin_country: values.origin_country || undefined,
    material: values.material || undefined,
    mid_code: values.mid_code || undefined,
    hs_code: values.hs_code || undefined,
    thumbnail,
    title: values.title,
    subtitle: values.subtitle || undefined,
    description: values.description || undefined,
    discountable: values.discountable || undefined,
    width: values.width ? parseFloat(values.width) : undefined,
    length: values.length ? parseFloat(values.length) : undefined,
    height: values.height ? parseFloat(values.height) : undefined,
    weight: values.weight ? parseFloat(values.weight) : undefined,
    options: values.options.filter((o) => o.title), // clean temp. values
    variants: normalizeVariants(
      values.variants.filter((variant) => variant.should_create),
      values.regionsCurrencyMap
    ),
  }
}

export const normalizeVariants = (
  variants: ProductCreateSchemaType["variants"],
  regionsCurrencyMap: Record<string, string>
): HttpTypes.AdminCreateProductVariant[] => {
  return variants.map((variant) => ({
    title: variant.title || Object.values(variant.options || {}).join(" / "),
    options: variant.options,
    sku: variant.sku || undefined,
    manage_inventory: !!variant.manage_inventory,
    allow_backorder: !!variant.allow_backorder,
    variant_rank: variant.variant_rank,
    inventory_items: (variant.inventory || [])
      .map((i) => {
        const quantity = i.required_quantity
          ? castNumber(i.required_quantity)
          : null

        if (!i.inventory_item_id || !quantity) {
          return false
        }

        return {
          ...i,
          required_quantity: quantity,
        }
      })
      .filter(
        (
          item
        ): item is { required_quantity: number; inventory_item_id: string } =>
          item !== false
      ),
    prices: Object.entries(variant.prices || {})
      .map(([key, value]) => {
        // `== null` catches null as well as undefined — the previous
        // `=== undefined` let null through, and castNumber returns null
        // unchanged (it only converts strings).
        if (value === "" || value == null) {
          return undefined
        }

        const amount = castNumber(value)
        // Never put a non-finite amount on the wire. JSON.stringify turns NaN
        // into `null`, so an unparseable price made the API reject the ENTIRE
        // product with "Expected type: 'number' for field
        // 'variants, 0, prices, 0, amount', got: 'null'" (Sentry
        // VENDOR-DASHBOARD-3). Dropping the bad price is strictly better than
        // failing the whole create; validation above should have caught it
        // first and shown the vendor a field-level error.
        if (!Number.isFinite(amount)) {
          return undefined
        }

        if (key.startsWith("reg_")) {
          return {
            currency_code: regionsCurrencyMap[key],
            amount,
            rules: { region_id: key },
          } as HttpTypes.AdminCreateProductVariantPrice
        } else {
          return {
            currency_code: key,
            amount,
          } as HttpTypes.AdminCreateProductVariantPrice
        }
      })
      .filter((v) => v !== undefined),
  }))
}

export const decorateVariantsWithDefaultValues = (
  variants: ProductCreateSchemaType["variants"]
) => {
  return variants.map((variant) => ({
    ...variant,
    title: variant.title || "",
    sku: variant.sku || "",
    manage_inventory: variant.manage_inventory || false,
    allow_backorder: variant.allow_backorder || false,
    inventory_kit: variant.inventory_kit || false,
  }))
}
