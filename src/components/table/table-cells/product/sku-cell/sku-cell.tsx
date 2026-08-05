import { useTranslation } from "react-i18next"

import { PlaceholderCell } from "../../common/placeholder-cell"
import { ExtendedAdminProductVariant } from "../../../../../types/products"

type SkuCellProps = {
  variants?: ExtendedAdminProductVariant[] | null
}

/**
 * SKU lives on the variant, not the product, so a row can carry several. Show
 * the first one and count the rest rather than truncating a joined list — the
 * common case here is a single-variant product, where this reads as just the
 * SKU. Variants without a SKU are skipped so a product whose second variant is
 * unlabelled doesn't render a blank cell.
 *
 * No extra fetch: /vendor/products already expands `*variants` (a wildcard, so
 * every scalar variant field including sku), which is the same data the price
 * and variant-count cells read.
 */
export const SkuCell = ({ variants }: SkuCellProps) => {
  const skus = (variants ?? [])
    .map((v) => (typeof v?.sku === "string" ? v.sku.trim() : ""))
    .filter(Boolean)

  if (!skus.length) {
    return <PlaceholderCell />
  }

  return (
    <div className="flex h-full w-full items-center overflow-hidden">
      <span className="truncate">{skus[0]}</span>
      {skus.length > 1 && (
        <span className="text-ui-fg-subtle ml-1 whitespace-nowrap">
          +{skus.length - 1}
        </span>
      )}
    </div>
  )
}

export const SkuHeader = () => {
  const { t } = useTranslation()

  return (
    <div className="flex h-full w-full items-center">
      <span>{t("fields.sku")}</span>
    </div>
  )
}
