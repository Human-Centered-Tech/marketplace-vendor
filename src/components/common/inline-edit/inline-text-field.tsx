import { Input } from "@medusajs/ui"
import { Control, FieldValues, Path } from "react-hook-form"
import { ComponentProps } from "react"

import { Form } from "../form"

interface InlineTextFieldProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  label: string
  optional?: boolean
  type?: string
  placeholder?: string
  inputProps?: ComponentProps<typeof Input>
}

/**
 * A single inline-editable label/input row, laid out on the same
 * `grid grid-cols-2 px-6 py-4` rhythm as the old read-only rows so the card
 * looks identical — only now the right column is an editable Input. Uses the
 * shared `Form` primitives so label/control/error a11y wiring is preserved.
 */
export const InlineTextField = <T extends FieldValues>({
  control,
  name,
  label,
  optional,
  type = "text",
  placeholder,
  inputProps,
}: InlineTextFieldProps<T>) => {
  return (
    <Form.Field
      control={control}
      name={name}
      render={({ field }) => (
        <Form.Item className="grid grid-cols-2 items-center gap-x-4 px-6 py-4 space-y-0">
          <Form.Label optional={optional}>{label}</Form.Label>
          <div className="flex flex-col gap-y-1">
            <Form.Control>
              <Input
                type={type}
                placeholder={placeholder}
                {...field}
                {...inputProps}
              />
            </Form.Control>
            <Form.ErrorMessage />
          </div>
        </Form.Item>
      )}
    />
  )
}
