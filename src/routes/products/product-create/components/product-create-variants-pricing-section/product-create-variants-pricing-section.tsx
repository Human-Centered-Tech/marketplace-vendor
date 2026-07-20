import { HttpTypes } from "@medusajs/types"
import { Heading } from "@medusajs/ui"
import { useMemo } from "react"
import { UseFormReturn, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { InlineEditCard } from "../../../../../components/common/inline-edit"
import { InlineTextField } from "../../../../../components/common/inline-edit/inline-text-field"
import { ProductCreateVariantSchema } from "../../constants"
import { ProductCreateSchemaType } from "../../types"
import { ProductCreatePriceField } from "./product-create-price-field"

type ProductCreateVariantsPricingSectionProps = {
  form: UseFormReturn<ProductCreateSchemaType>
  store?: HttpTypes.AdminStore
}

type VariantWithIndex = ProductCreateVariantSchema & {
  originalIndex: number
}

export const ProductCreateVariantsPricingSection = ({
  form,
  store,
}: ProductCreateVariantsPricingSectionProps) => {
  const { t } = useTranslation()

  const currencyCodes = useMemo(
    () => store?.supported_currencies?.map((c) => c.currency_code) ?? [],
    [store]
  )

  const variants = useWatch({
    control: form.control,
    name: "variants",
    defaultValue: [],
  })

  const options = useWatch({
    control: form.control,
    name: "options",
    defaultValue: [],
  })

  // Only the variants the user chose to create; carry originalIndex so field
  // paths stay `variants.${originalIndex}.…` and blocks don't remount/lose
  // focus. Memoised for the same reason.
  const variantData = useMemo(() => {
    const ret: VariantWithIndex[] = []
    variants.forEach((v, i) => {
      if (v.should_create) {
        ret.push({ ...v, originalIndex: i })
      }
    })
    return ret
  }, [variants])

  // A header per block only makes sense when there are real options (i.e. more
  // than the single implicit default variant).
  const showHeaders = options.length > 0 && variantData.length > 1

  return (
    <InlineEditCard title={t("products.create.tabs.variants")}>
      <div className="flex flex-col divide-y">
        {variantData.map((v) => {
          const comboLabel = options
            .map((o) => v.options?.[o.title])
            .filter(Boolean)
            .join(" / ")

          return (
            <div
              key={v.originalIndex}
              className="flex flex-col divide-y"
            >
              {showHeaders && comboLabel && (
                <div className="px-6 py-4">
                  <Heading level="h3">{comboLabel}</Heading>
                </div>
              )}
              <InlineTextField
                control={form.control}
                name={`variants.${v.originalIndex}.title`}
                label={t("fields.title")}
              />
              <InlineTextField
                control={form.control}
                name={`variants.${v.originalIndex}.sku`}
                label={t("fields.sku")}
                optional
              />
              {currencyCodes.map((code) => (
                <ProductCreatePriceField
                  key={code}
                  control={form.control}
                  name={`variants.${v.originalIndex}.prices.${code}`}
                  code={code}
                />
              ))}
            </div>
          )
        })}
      </div>
    </InlineEditCard>
  )
}
