import CurrencyInput, {
  CurrencyInputProps,
  formatValue,
} from "react-currency-input-field"
import { Control, FieldValues, Path } from "react-hook-form"
import { useCallback, useEffect, useState } from "react"

import { Form } from "../../../../../components/common/form"
import { currencies } from "../../../../../lib/data/currencies"

interface ProductCreatePriceFieldProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  code: string
}

/**
 * A single currency price input laid out on the same 2-col label/input rhythm
 * as InlineTextField. The label is the currency's native symbol (falling back
 * to the code). The raw string value is stored in the form (the submit handler
 * does `parseFloat`), so we never coerce to a number here.
 */
export const ProductCreatePriceField = <T extends FieldValues>({
  control,
  name,
  code,
}: ProductCreatePriceFieldProps<T>) => {
  const currency = currencies[code.toUpperCase()]

  const formatter = useCallback(
    (value?: string | number) => {
      const ensuredValue =
        typeof value === "number" ? value.toString() : value || ""

      return formatValue({
        value: ensuredValue,
        decimalScale: currency?.decimal_digits ?? 2,
        disableGroupSeparators: true,
        decimalSeparator: ".",
      })
    },
    [currency]
  )

  return (
    <Form.Field
      control={control}
      name={name}
      render={({ field }) => (
        <PriceInput field={field} currencyCode={code} formatter={formatter}>
          {currency?.symbol_native ?? code.toUpperCase()}
        </PriceInput>
      )}
    />
  )
}

const PriceInput = ({
  field,
  currencyCode,
  formatter,
  children,
}: {
  field: any
  currencyCode: string
  formatter: (value?: string | number) => string
  children: React.ReactNode
}) => {
  const currency = currencies[currencyCode.toUpperCase()]
  const { value, onChange, onBlur, ref } = field

  const [localValue, setLocalValue] = useState<string | number>(value || "")

  const handleValueChange: CurrencyInputProps["onValueChange"] = (val) => {
    setLocalValue(val ?? "")
    // Store the raw string; submit does parseFloat.
    onChange(val ?? "")
  }

  useEffect(() => {
    let update = value
    if (value && !isNaN(Number(value))) {
      update = formatter(update)
    }
    setLocalValue(update ?? "")
    // Only re-sync when the external value changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <Form.Item className="grid grid-cols-2 items-center gap-x-4 px-6 py-4 space-y-0">
      <Form.Label>{children}</Form.Label>
      <div className="flex flex-col gap-y-1">
        <Form.Control>
          <div className="bg-ui-bg-field shadow-borders-base focus-within:shadow-borders-interactive-with-active relative flex h-8 items-center rounded-md">
            <span
              className="txt-compact-small text-ui-fg-muted pointer-events-none absolute left-2.5"
              aria-hidden
            >
              {children}
            </span>
            <CurrencyInput
              ref={ref}
              className="txt-compact-small text-ui-fg-base w-full flex-1 appearance-none bg-transparent pl-8 pr-2.5 text-right outline-none"
              value={localValue || undefined}
              onValueChange={handleValueChange}
              onBlur={onBlur}
              formatValueOnBlur
              placeholder={formatter("0")}
              decimalScale={currency?.decimal_digits ?? 2}
              decimalsLimit={currency?.decimal_digits ?? 2}
              autoComplete="off"
            />
          </div>
        </Form.Control>
        <Form.ErrorMessage />
      </div>
    </Form.Item>
  )
}
