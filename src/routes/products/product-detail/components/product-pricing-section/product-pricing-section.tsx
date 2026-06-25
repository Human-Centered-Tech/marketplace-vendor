import { PencilSquare } from "@medusajs/icons"
import { Button, Container, Heading, Text } from "@medusajs/ui"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { SectionRow } from "../../../../../components/common/section"
import {
  ExtendedAdminProduct,
  ExtendedAdminProductVariant,
} from "../../../../../types/products"

// Vendor catalog is USD-only today (see price-cell). If this ever goes
// multi-currency, plumb the seller's preferred currency through here.
const CURRENCY_CODE = "usd"

const formatUsd = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount)

const getVariantPrice = (
  variant: ExtendedAdminProductVariant
): number | null => {
  const price = variant.prices?.find((p) => p.currency_code === CURRENCY_CODE)

  if (!price || price.amount == null) {
    return null
  }

  const amount =
    typeof price.amount === "string" ? parseFloat(price.amount) : price.amount

  return Number.isNaN(amount) ? null : amount
}

type ProductPricingSectionProps = {
  product: ExtendedAdminProduct
}

export const ProductPricingSection = ({
  product,
}: ProductPricingSectionProps) => {
  const { t } = useTranslation()
  const variants = (product.variants ?? []) as ExtendedAdminProductVariant[]

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Pricing</Heading>
        <Button size="small" variant="secondary" asChild>
          <Link to="pricing" className="inline-flex items-center gap-x-1.5">
            <PencilSquare />
            <span>{t("actions.edit")}</span>
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
        variants.map((variant) => {
          const price = getVariantPrice(variant)

          return (
            <SectionRow
              key={variant.id}
              title={variant.title || variant.sku || "Variant"}
              value={
                price == null ? (
                  <span className="text-ui-fg-muted">No price set</span>
                ) : (
                  formatUsd(price)
                )
              }
            />
          )
        })
      )}
    </Container>
  )
}
