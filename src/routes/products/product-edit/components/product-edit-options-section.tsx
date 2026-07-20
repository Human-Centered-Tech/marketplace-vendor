import { Plus, XMarkMini } from "@medusajs/icons"
import { Button, IconButton, Input, Label } from "@medusajs/ui"
import { Controller, UseFormReturn, useFieldArray } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { InlineEditCard } from "../../../../components/common/inline-edit"
import { ChipInput } from "../../../../components/inputs/chip-input"
import { ProductEditSchemaType } from "../constants"

type ProductEditOptionsSectionProps = {
  form: UseFormReturn<ProductEditSchemaType>
}

/**
 * Inline option editing for an existing product. Edit an option's title and
 * values (add a new value like "purple" right here), add a new option, or
 * remove one. Changes are diffed on save into create/update/delete calls
 * against the option endpoints — no automatic variant permutation, so nothing
 * is silently created or deleted.
 */
export const ProductEditOptionsSection = ({
  form,
}: ProductEditOptionsSectionProps) => {
  const { t } = useTranslation()

  // keyName "field_id" so RHF's generated key never collides with the real
  // option `id` we carry for the save-diff.
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
    keyName: "field_id",
  })

  return (
    <InlineEditCard
      title={t("products.fields.options.label", "Options")}
      description="Edit an option's values (e.g. add a new color), or add/remove options. New values become selectable when you add a variant."
    >
      <div className="flex flex-col gap-y-4 px-6 py-4">
        <ul className="flex flex-col gap-y-3">
          {fields.map((field, index) => (
            <li
              key={field.field_id}
              className="bg-ui-bg-component shadow-elevation-card-rest grid grid-cols-[1fr_28px] items-center gap-2 rounded-xl p-2"
            >
              <div className="grid grid-cols-[min-content_1fr] items-center gap-2">
                <Label
                  size="xsmall"
                  weight="plus"
                  className="text-ui-fg-subtle px-2"
                  htmlFor={`options.${index}.title`}
                >
                  {t("fields.title")}
                </Label>
                <Input
                  id={`options.${index}.title`}
                  className="bg-ui-bg-field-component"
                  placeholder="Color"
                  {...form.register(`options.${index}.title` as const)}
                />
                <Label
                  size="xsmall"
                  weight="plus"
                  className="text-ui-fg-subtle px-2"
                  htmlFor={`options.${index}.values`}
                >
                  {t("fields.values", "Values")}
                </Label>
                <Controller
                  control={form.control}
                  name={`options.${index}.values` as const}
                  render={({ field: { ref: _ref, ...field } }) => (
                    <ChipInput
                      {...field}
                      variant="contrast"
                      placeholder="Red, Blue, Purple…"
                    />
                  )}
                />
              </div>
              <IconButton
                type="button"
                size="small"
                variant="transparent"
                className="text-ui-fg-muted"
                // Keep at least one option; a product always has one.
                disabled={fields.length <= 1}
                onClick={() => remove(index)}
              >
                <XMarkMini />
              </IconButton>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="secondary"
          size="small"
          className="self-start"
          onClick={() => append({ title: "", values: [] })}
        >
          <Plus />
          Add option
        </Button>
      </div>
    </InlineEditCard>
  )
}
