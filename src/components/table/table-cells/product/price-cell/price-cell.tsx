import { useTranslation } from "react-i18next"

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

  if (amounts.length === 0) {
    return <PlaceholderCell />
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
