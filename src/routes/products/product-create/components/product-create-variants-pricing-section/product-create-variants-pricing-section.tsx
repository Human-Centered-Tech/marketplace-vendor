import { HttpTypes } from "@medusajs/types"
import { Input, Text } from "@medusajs/ui"
import { useMemo } from "react"
import { Controller, UseFormReturn, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { InlineEditCard } from "../../../../../components/common/inline-edit"
import { InlineTextField } from "../../../../../components/common/inline-edit/inline-text-field"
import { ProductCreateVariantSchema } from "../../constants"
import { ProductCreateSchemaType } from "../../types"
import { ProductCreatePriceField } from "./product-create-price-field"

type ProductCreateVariantsPricingSectionProps = {
  form: UseFormReturn<ProductCreateSchemaType>
  store?: HttpTypes.AdminStore
  /**
   * Name of the location the starting stock lands in, shown next to the
   * Quantity field. Omitted → the field is hidden (no location to write to).
   */
  stockLocationName?: string
}

type VariantWithIndex = ProductCreateVariantSchema & {
  originalIndex: number
}

export const ProductCreateVariantsPricingSection = ({
  form,
  store,
  stockLocationName,
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

  // Multiple variants → one card per variant, titled by its option combo.
  // A single (default) variant → one "Pricing" card.
  const isMulti = variantData.length > 1

  return (
    <div className="flex flex-col gap-y-3">
      {variantData.map((v, idx) => {
        const comboLabel = options
          .map((o) => v.options?.[o.title])
          .filter(Boolean)
          .join(" / ")
        const cardTitle = isMulti
          ? comboLabel || `${t("fields.variant", "Variant")} ${idx + 1}`
          : "Pricing"

        return (
          <InlineEditCard key={v.originalIndex} title={cardTitle}>
            <InlineTextField
              control={form.control}
              name={`variants.${v.originalIndex}.title`}
              label={t("fields.title")}
              stacked
            />
            <InlineTextField
              control={form.control}
              name={`variants.${v.originalIndex}.sku`}
              label={t("fields.sku")}
              optional
              stacked
            />
            {currencyCodes.map((code) => (
              <ProductCreatePriceField
                key={code}
                control={form.control}
                name={`variants.${v.originalIndex}.prices.${code}`}
                code={code}
                stacked
              />
            ))}
            {/*
              Starting stock. Mirrors the same field on the edit form's
              newly-added variants — it isn't sent with the create call (stock
              levels can't exist before the variant does), it's applied in a
              second pass once the server returns real ids.
            */}
            {stockLocationName ? (
              <div className="flex flex-col gap-y-1 px-6 py-4">
                <Text
                  size="xsmall"
                  leading="compact"
                  className="text-ui-fg-muted"
                >
                  {`Quantity — ${stockLocationName}`}
                </Text>
                <Controller
                  control={form.control}
                  name={`variants.${v.originalIndex}.new_stock`}
                  render={({ field: { value, onChange, ...field } }) => (
                    <Input
                      {...field}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="0"
                      className="max-w-[10rem]"
                      value={value ?? ""}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/[^0-9]/g, "")
                        onChange(digits === "" ? null : Number(digits))
                      }}
                    />
                  )}
                />
              </div>
            ) : null}
          </InlineEditCard>
        )
      })}
    </div>
  )
}
