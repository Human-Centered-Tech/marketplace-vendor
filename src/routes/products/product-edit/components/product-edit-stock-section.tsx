import { Checkbox, Input, Text } from "@medusajs/ui"
import { Controller, UseFormReturn, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { InlineEditCard } from "../../../../components/common/inline-edit"
import { ProductEditSchemaType } from "../constants"

type ProductEditStockSectionProps = {
  form: UseFormReturn<ProductEditSchemaType>
}

/**
 * Inline per-variant stock editing. One card per variant; each stock location
 * is a row with an enable checkbox + quantity. Mirrors the create-flow inline
 * style and persists through the same location-levels batch endpoint the old
 * "Edit stock" modal used.
 */
export const ProductEditStockSection = ({
  form,
}: ProductEditStockSectionProps) => {
  const { t } = useTranslation()

  const stock = useWatch({ control: form.control, name: "stock" }) ?? []

  if (!stock.length) {
    return null
  }

  const isMulti = stock.length > 1

  return (
    <div className="flex flex-col gap-y-3">
      {stock.map((variant, vIdx) => {
        const cardTitle = isMulti
          ? `${variant.title || `${t("fields.variant", "Variant")} ${vIdx + 1}`} — ${t("fields.inventory", "Inventory")}`
          : t("fields.inventory", "Inventory")

        return (
          <InlineEditCard key={variant.id} title={cardTitle}>
            {!variant.inventory_item_id ? (
              <div className="px-6 py-4">
                <Text size="small" className="text-ui-fg-subtle">
                  This variant has no inventory item, so stock can't be edited
                  here.
                </Text>
              </div>
            ) : (
              variant.locations.map((location, lIdx) => (
                <div
                  key={location.id}
                  className="grid grid-cols-2 items-center gap-4 px-6 py-3"
                >
                  <div className="flex items-center gap-x-3">
                    <Controller
                      control={form.control}
                      name={`stock.${vIdx}.locations.${lIdx}.checked`}
                      render={({ field: { value, onChange, ...field } }) => (
                        <Checkbox
                          {...field}
                          checked={!!value}
                          onCheckedChange={(checked) => onChange(!!checked)}
                        />
                      )}
                    />
                    <Text size="small" leading="compact">
                      {location.name || location.id}
                    </Text>
                  </div>
                  <Controller
                    control={form.control}
                    name={`stock.${vIdx}.locations.${lIdx}.quantity`}
                    render={({ field: { value, onChange, ...field } }) => (
                      <Input
                        {...field}
                        type="number"
                        min={0}
                        placeholder="0"
                        value={value ?? ""}
                        onChange={(e) =>
                          onChange(
                            e.target.value === "" ? null : e.target.valueAsNumber
                          )
                        }
                        disabled={!location.checked}
                      />
                    )}
                  />
                </div>
              ))
            )}
          </InlineEditCard>
        )
      })}
    </div>
  )
}
