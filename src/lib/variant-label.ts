// Hide meaningless "variant" language on single-variant products.
//
// A product created without real options still needs exactly one variant —
// Medusa hangs stock, price and SKU off the variant, so there is no such thing
// as a product without one. Our create flow fills that slot with a literal
// placeholder title, "Default variant" (see
// routes/products/product-create/constants.ts and the variants section of the
// create details form), plus a "Default option" / "Default option value" pair.
//
// A merchant selling one simple mug has no idea what "Default variant" means,
// so every screen that renders a variant title should show the product's name
// instead. That is a DISPLAY concern only — the stored title is deliberately
// left alone, because:
//
//   - the storefront hides these rows by matching the exact literal
//     (marketplace-storefront/src/lib/helpers/variant-options.ts). Rename the
//     data and the placeholder starts appearing in cart + order history.
//   - the Shopify sync matches variants on metadata.shopify_variant_id, and
//     order line items snapshot variant_title at purchase time.
//
// Keep the placeholder list below byte-identical to the storefront helper.
// `is_default` is NOT a real column on product_variant (only title, sku and
// variant_rank exist), so matching the title is the only available signal.

const normalize = (value?: string | null) => (value || "").trim().toLowerCase()

/**
 * A variant title that carries no real buyer choice and shouldn't be shown.
 * Mirrors isPlaceholderVariantTitle in the storefront.
 */
export const isPlaceholderVariantTitle = (title?: string | null) => {
  const t = normalize(title)

  return (
    t === "" ||
    t === "default variant" ||
    t === "default title" ||
    t === "default option" ||
    t === "default value"
  )
}

type VariantLike = { title?: string | null; sku?: string | null }
type ProductLike = { title?: string | null } | null | undefined

/**
 * What to render where a variant title would go.
 *
 * Real title wins. Otherwise fall back through the product name, then the SKU
 * (which at least identifies the row), then an em dash — never the placeholder
 * itself, and never an empty cell.
 */
export const resolveVariantLabel = (
  variant: VariantLike | null | undefined,
  product?: ProductLike
): string => {
  const title = variant?.title

  if (!isPlaceholderVariantTitle(title)) {
    return title as string
  }

  const productTitle = (product?.title || "").trim()
  if (productTitle) {
    return productTitle
  }

  const sku = (variant?.sku || "").trim()
  if (sku) {
    return sku
  }

  return "—"
}
