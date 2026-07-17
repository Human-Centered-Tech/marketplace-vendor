import { Textarea } from "@medusajs/ui"
import { Control, FieldValues, Path } from "react-hook-form"

import { Form } from "../form"

interface InlineTextareaFieldProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  label: string
  optional?: boolean
  hint?: string
  rows?: number
}

/**
 * Inline-editable label/textarea row. Same 2-column rhythm as
 * {@link InlineTextField} but top-aligned (multi-line) and with an optional
 * hint rendered under the label.
 */
export const InlineTextareaField = <T extends FieldValues>({
  control,
  name,
  label,
  optional,
  hint,
  rows = 4,
}: InlineTextareaFieldProps<T>) => {
  return (
    <Form.Field
      control={control}
      name={name}
      render={({ field }) => (
        <Form.Item className="grid grid-cols-2 items-start gap-x-4 px-6 py-4 space-y-0">
          <div className="flex flex-col gap-y-1">
            <Form.Label optional={optional}>{label}</Form.Label>
            {hint && (
              <span className="text-ui-fg-subtle text-xs">{hint}</span>
            )}
          </div>
          <div className="flex flex-col gap-y-1">
            <Form.Control>
              <Textarea rows={rows} {...field} />
            </Form.Control>
            <Form.ErrorMessage />
          </div>
        </Form.Item>
      )}
    />
  )
}
