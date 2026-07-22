import { Plus, Trash } from "@medusajs/icons"
import { Button, IconButton, Input, Text } from "@medusajs/ui"
import { UseFormReturn, useFieldArray } from "react-hook-form"

import { InlineEditCard } from "../../../../components/common/inline-edit"
import { Form } from "../../../../components/common/form"
import { ProductEditSchemaType } from "../constants"

type ProductEditMetadataSectionProps = {
  form: UseFormReturn<ProductEditSchemaType>
}

/**
 * Inline key/value metadata editor. Rows map to product.metadata on save.
 */
export const ProductEditMetadataSection = ({
  form,
}: ProductEditMetadataSectionProps) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "metadata",
    keyName: "field_id",
  })

  return (
    <InlineEditCard
      title="Metadata"
      description="Custom key/value data attached to this product."
    >
      <div className="flex flex-col gap-y-3 px-6 py-4">
        {fields.length === 0 && (
          <Text size="small" className="text-ui-fg-subtle">
            No metadata yet.
          </Text>
        )}
        {fields.map((field, index) => (
          <div key={field.field_id} className="flex items-end gap-x-2">
            <Form.Field
              control={form.control}
              name={`metadata.${index}.key`}
              render={({ field }) => (
                <Form.Item className="flex-1">
                  <Form.Label>Key</Form.Label>
                  <Form.Control>
                    <Input {...field} placeholder="key" />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              control={form.control}
              name={`metadata.${index}.value`}
              render={({ field }) => (
                <Form.Item className="flex-1">
                  <Form.Label>Value</Form.Label>
                  <Form.Control>
                    <Input {...field} placeholder="value" />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <IconButton
              type="button"
              variant="transparent"
              onClick={() => remove(index)}
              className="mb-1"
            >
              <Trash />
            </IconButton>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="small"
          className="self-start"
          onClick={() => append({ key: "", value: "" })}
        >
          <Plus />
          Add metadata
        </Button>
      </div>
    </InlineEditCard>
  )
}
