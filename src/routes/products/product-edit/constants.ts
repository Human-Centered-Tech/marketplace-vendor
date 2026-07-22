import { HttpTypes } from "@medusajs/types"
import { z } from "zod"

import { optionalFloat } from "../../../lib/validation"
import {
  ExtendedAdminProduct,
  ExtendedAdminProductVariant,
} from "../../../types/products"
import { InventoryItemWithLevels } from "../../../types/inventory"
import { MediaSchema } from "../product-create/constants"

// Vendor catalog is USD-only today.
export const CURRENCY_CODE = "usd"

// Per-product shipping/return policy lives in product.metadata under this key
// and is edited through a dedicated route — keep it out of the raw metadata
// editor so it isn't shown/round-tripped twice.
export const SHIPPING_RETURN_POLICY_KEY = "shipping_return_policy"

// Per-color-value hex swatches live in product.metadata under this key (a
// { valueString: "#rrggbb" } map). Kept out of the raw metadata editor.
export const COLOR_HEX_KEY = "color_hex"

const EditVariantSchema = z.object({
  // Absent for brand-new combinations the user opts to create.
  id: z.string().optional(),
  title: z.string().optional(),
  sku: z.string().optional(),
  // Kept for parity with the reused create pricing section, which only renders
  // variants flagged should_create. Existing variants are always "true".
  should_create: z.boolean(),
  variant_rank: z.number(),
  options: z.record(z.string(), z.string()),
  prices: z.record(z.string(), optionalFloat).optional(),
  manage_inventory: z.boolean().optional(),
  inventory_kit: z.boolean().optional(),
  // Stock count captured for a brand-new combination in the "Add variations"
  // modal; applied to the primary location after the variant is created.
  new_stock: z.union([z.number(), z.string(), z.null()]).optional(),
})

const EditOptionSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  values: z.array(z.string()).min(1),
})

const StockLocationSchema = z.object({
  id: z.string(), // stock location id
  name: z.string().optional(),
  level_id: z.string().optional(),
  quantity: z.union([z.number(), z.string(), z.null()]).optional(),
  checked: z.boolean(),
})

const StockVariantSchema = z.object({
  id: z.string(), // variant id
  title: z.string().optional(),
  inventory_item_id: z.string().optional(),
  manage_inventory: z.boolean().optional(),
  locations: z.array(StockLocationSchema),
})

const MetadataRowSchema = z.object({
  key: z.string(),
  value: z.string(),
})

export const ProductEditSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  handle: z.string().optional(),
  description: z.string().optional(),
  discountable: z.boolean(),
  shipping_return_policy: z.string().optional(),
  type_id: z.string().optional(),
  collection_id: z.string().optional(),
  categories: z.array(z.string()),
  tags: z.array(z.string()).optional(),
  origin_country: z.string().optional(),
  material: z.string().optional(),
  width: z.string().optional(),
  length: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  mid_code: z.string().optional(),
  hs_code: z.string().optional(),
  options: z.array(EditOptionSchema).min(1),
  // Present for parity with the create sections; Stage 1 does not restructure
  // variants, so this stays whatever the product already is.
  enable_variants: z.boolean(),
  variants: z.array(EditVariantSchema).min(1),
  media: z.array(MediaSchema).optional(),
  stock: z.array(StockVariantSchema),
  metadata: z.array(MetadataRowSchema),
  // Ids of existing variants the user explicitly (and confirmed) removed —
  // the ONLY source of truth for variant deletion on save.
  variants_to_delete: z.array(z.string()),
  // { colorValue: "#rrggbb" } — the swatch color shown per color-option value
  // on the storefront. Persisted into product.metadata.color_hex.
  color_hex: z.record(z.string(), z.string()),
})

export type ProductEditSchemaType = z.infer<typeof ProductEditSchema>

const readUsdAmount = (variant: ExtendedAdminProductVariant): string => {
  const price = variant.prices?.find((p) => p.currency_code === CURRENCY_CODE)
  if (!price || price.amount == null) {
    return ""
  }
  return String(price.amount)
}

// Medusa variant.options is [{ value, option_id }]; product.options is
// [{ id, title }]. Build a { optionTitle: value } record so the reused create
// pricing/variants sections can label combos.
const buildVariantOptionRecord = (
  variant: ExtendedAdminProductVariant,
  optionIdToTitle: Map<string, string>
): Record<string, string> => {
  const record: Record<string, string> = {}
  const opts = (variant as any).options as
    | Array<{ value?: string; option_id?: string; option?: { title?: string } }>
    | undefined
  opts?.forEach((o) => {
    const title = o.option?.title || (o.option_id && optionIdToTitle.get(o.option_id))
    if (title && o.value != null) {
      record[title] = o.value
    }
  })
  return record
}

// Reuses the same defaulting the media modal uses: existing images become
// file-less MediaSchema entries; a bare thumbnail (not in images) is prepended.
export const buildMediaDefaults = (
  images: HttpTypes.AdminProductImage[] | null | undefined,
  thumbnail: string | null | undefined
) => {
  const media =
    images?.map((image) => ({
      id: image.id!,
      url: image.url!,
      isThumbnail: image.url === thumbnail,
      file: null as File | null,
    })) || []

  if (thumbnail && !media.some((m) => m.url === thumbnail)) {
    media.unshift({
      id: `thumb-${media.length}`,
      url: thumbnail,
      isThumbnail: true,
      file: null,
    })
  }
  return media
}

const buildStockDefaults = (
  product: ExtendedAdminProduct,
  stockLocations: HttpTypes.AdminStockLocation[],
  inventoryItems: InventoryItemWithLevels[]
): ProductEditSchemaType["stock"] => {
  return (product.variants ?? []).map((variant) => {
    const inventoryItemId = variant.inventory_items?.[0]?.inventory_item_id
    const item = inventoryItems.find(
      (i) => i.inventory_item_id === inventoryItemId
    )

    const locations = (stockLocations ?? []).map((location) => {
      const level = item?.location_levels?.find(
        (l) => l.location_id === location.id
      )
      return {
        id: location.id,
        name: location.name,
        level_id: level?.id,
        quantity:
          typeof level?.stocked_quantity === "number"
            ? level.stocked_quantity
            : null,
        checked: !!level,
      }
    })

    return {
      id: variant.id,
      title: variant.title || undefined,
      inventory_item_id: inventoryItemId,
      manage_inventory: variant.manage_inventory ?? undefined,
      locations,
    }
  })
}

const buildMetadataDefaults = (
  product: ExtendedAdminProduct
): ProductEditSchemaType["metadata"] => {
  const metadata = (product.metadata || {}) as Record<string, unknown>
  return Object.entries(metadata)
    .filter(([key]) => key !== SHIPPING_RETURN_POLICY_KEY && key !== COLOR_HEX_KEY)
    .map(([key, value]) => ({
      key,
      value: value == null ? "" : String(value),
    }))
}

const buildColorHexDefaults = (
  product: ExtendedAdminProduct
): Record<string, string> => {
  const raw = (product.metadata as any)?.[COLOR_HEX_KEY]
  if (raw && typeof raw === "object") {
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === "string") {
        out[k] = v
      }
    }
    return out
  }
  return {}
}

export const buildProductEditDefaults = (
  product: ExtendedAdminProduct,
  stockLocations: HttpTypes.AdminStockLocation[],
  inventoryItems: InventoryItemWithLevels[]
): ProductEditSchemaType => {
  const optionIdToTitle = new Map<string, string>(
    (product.options ?? []).map((o) => [o.id, o.title])
  )

  const existingPolicy =
    ((product.metadata as any)?.[SHIPPING_RETURN_POLICY_KEY] as string) || ""

  return {
    title: product.title,
    subtitle: (product as any).subtitle || "",
    handle: product.handle || "",
    description: product.description || "",
    discountable: !!product.discountable,
    shipping_return_policy: existingPolicy,
    type_id: (product as any).type_id || "",
    collection_id: (product as any).collection_id || "",
    categories: (product.categories ?? []).map((c) => c.id),
    tags: (product.tags ?? []).map((tag) => tag.id),
    origin_country: (product as any).origin_country || "",
    material: (product as any).material || "",
    width: product.width != null ? String(product.width) : "",
    length: product.length != null ? String(product.length) : "",
    height: product.height != null ? String(product.height) : "",
    weight: product.weight != null ? String(product.weight) : "",
    mid_code: (product as any).mid_code || "",
    hs_code: (product as any).hs_code || "",
    options: (product.options ?? []).map((o) => ({
      id: o.id,
      title: o.title,
      values: (o.values ?? []).map((v: any) => v.value),
    })),
    enable_variants: (product.variants?.length ?? 0) > 1,
    variants: (product.variants ?? []).map((v, i) => ({
      id: v.id,
      title: v.title || "",
      sku: v.sku || "",
      should_create: true,
      variant_rank: typeof v.variant_rank === "number" ? v.variant_rank : i,
      options: buildVariantOptionRecord(v, optionIdToTitle),
      prices: { [CURRENCY_CODE]: readUsdAmount(v) },
      manage_inventory: v.manage_inventory ?? undefined,
      inventory_kit: (v.inventory_items?.length ?? 0) > 1,
    })),
    media: buildMediaDefaults(product.images, product.thumbnail),
    stock: buildStockDefaults(product, stockLocations, inventoryItems),
    metadata: buildMetadataDefaults(product),
    variants_to_delete: [],
    color_hex: buildColorHexDefaults(product),
  }
}
