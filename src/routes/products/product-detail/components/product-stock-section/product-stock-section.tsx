import { PencilSquare } from "@medusajs/icons"
import { Button, Container, Heading, Text } from "@medusajs/ui"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { SectionRow } from "../../../../../components/common/section"
import { useInventoryItemLevels } from "../../../../../hooks/api"
import { ExtendedAdminProduct } from "../../../../../types/products"
import { ExtendedAdminProductVariant } from "../../../../../types/products"

type ProductStockSectionProps = {
  product: ExtendedAdminProduct
}

export const ProductStockSection = ({ product }: ProductStockSectionProps) => {
  const { t } = useTranslation()
  const variants = (product.variants ?? []) as ExtendedAdminProductVariant[]

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("fields.inventory")}</Heading>
        <Button size="small" variant="secondary" asChild>
          <Link to="edit-stocks-and-prices" className="inline-flex items-center gap-x-1.5">
            <PencilSquare />
            <span>Edit stock</span>
          </Link>
        </Button>
      </div>

      {variants.length === 0 ? (
        <div className="px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">
            {t("products.variants.empty.description")}
          </Text>
        </div>
      ) : (
        variants.map((variant) => (
          <StockRow key={variant.id} variant={variant} />
        ))
      )}
    </Container>
  )
}

const StockRow = ({ variant }: { variant: ExtendedAdminProductVariant }) => {
  // Some products have a single inventory_item per variant; kits have several.
  // For the at-a-glance display, sum across all inventory items + locations.
  // The "Edit stock" modal owns the per-location/per-item editing.
  const firstItemId = variant.inventory_items?.[0]?.inventory_item_id
  const { location_levels } = useInventoryItemLevels(firstItemId!, undefined, {
    enabled: Boolean(firstItemId),
  } as any)

  const quantity = (location_levels ?? []).reduce(
    (acc, lvl: any) => acc + (lvl.available_quantity ?? 0),
    0
  )
  const locationCount = (location_levels ?? []).reduce(
    (acc, lvl: any) => acc + (lvl.stock_locations?.length ?? 0),
    0
  )

  const value =
    locationCount === 0
      ? <span className="text-ui-fg-muted">No stock yet</span>
      : (
        <span className={quantity === 0 ? "text-ui-fg-error" : undefined}>
          {`${quantity} available · ${locationCount} ${
            locationCount === 1 ? "location" : "locations"
          }`}
        </span>
      )

  return (
    <SectionRow
      title={variant.title || variant.sku || "Variant"}
      value={value}
    />
  )
}
