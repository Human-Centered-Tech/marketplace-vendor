import { useTranslation } from "react-i18next"
import { StatusBadge, Tooltip } from "@medusajs/ui"

import { PlaceholderCell } from "../../common/placeholder-cell"

type Price = {
  amount: number | string | null
  currency_code: string | null
}

type Variant = {
  prices?: Price[] | null
}

type PriceCellProps = {
  variants?: Variant[] | null
  // Currency to show. Vendor catalog is USD-only today; if you go
  // multi-currency, plumb the seller's preferred currency through here.
  currency?: string
}

const formatUsd = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount)

export const PriceCell = ({ variants, currency = "usd" }: PriceCellProps) => {
  if (!variants || variants.length === 0) {
    return <PlaceholderCell />
  }

  // Collect all amounts in the requested currency across this product's variants.
  const amounts: number[] = []
  for (const v of variants) {
    for (const p of v.prices ?? []) {
      if (p.currency_code === currency && p.amount != null) {
        const n = typeof p.amount === "string" ? parseFloat(p.amount) : p.amount
        if (!Number.isNaN(n)) amounts.push(n)
      }
    }
  }

  // Variants exist but none has a USD price. This is the trap behind
  // "published product shows 'N listings' but an empty storefront": a product
  // with no price can't be rendered/bought, so it silently disappears from the
  // shop. Make it loud here (and block publishing it — see the product list's
  // bulk-publish guard) so the seller knows to set a price.
  if (amounts.length === 0) {
    return (
      <div className="flex h-full w-full items-center overflow-hidden">
        <Tooltip content="This product has no price. Set a price so it can appear in your store.">
          <StatusBadge color="orange">No price</StatusBadge>
        </Tooltip>
      </div>
    )
  }

  const min = Math.min(...amounts)
  const max = Math.max(...amounts)

  return (
    <div className="flex h-full w-full items-center overflow-hidden">
      <span className="truncate">
        {min === max ? formatUsd(min) : `${formatUsd(min)} – ${formatUsd(max)}`}
      </span>
    </div>
  )
}

export const PriceHeader = () => {
  const { t } = useTranslation()
  return (
    <div className="flex h-full w-full items-center">
      <span>{t("fields.price", "Price")}</span>
    </div>
  )
}
