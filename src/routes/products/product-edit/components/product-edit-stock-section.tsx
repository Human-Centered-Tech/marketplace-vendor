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
 * is a stacked block — an enable checkbox + location name, with the count field
 * beneath it. Persists through the same location-levels batch endpoint the old
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
          ? `${t("fields.inventory", "Inventory")} — ${
              variant.title || `${t("fields.variant", "Variant")} ${vIdx + 1}`
            }`
          : t("fields.inventory", "Inventory")

        return (
          <InlineEditCard
            key={variant.id}
            title={cardTitle}
            description="Enable a location and set its stock count."
          >
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
                  className="flex flex-col gap-y-3 px-6 py-4"
                >
                  <div className="flex items-center gap-x-2">
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
                    <div className="flex flex-col">
                      <Text
                        size="xsmall"
                        leading="compact"
                        className="text-ui-fg-muted"
                      >
                        Location
                      </Text>
                      <Text size="small" leading="compact" weight="plus">
                        {location.name || location.id}
                      </Text>
                    </div>
                  </div>

                  <div className="flex flex-col gap-y-1">
                    <Text
                      size="xsmall"
                      leading="compact"
                      className="text-ui-fg-muted"
                    >
                      Count
                    </Text>
                    <Controller
                      control={form.control}
                      name={`stock.${vIdx}.locations.${lIdx}.quantity`}
                      render={({ field: { value, onChange, ...field } }) => (
                        <Input
                          {...field}
                          // Plain numeric text input — no stepper arrows;
                          // keyboard only.
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="0"
                          value={value ?? ""}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/[^0-9]/g, "")
                            onChange(digits === "" ? null : Number(digits))
                          }}
                          disabled={!location.checked}
                        />
                      )}
                    />
                  </div>
                </div>
              ))
            )}
          </InlineEditCard>
        )
      })}
    </div>
  )
}
