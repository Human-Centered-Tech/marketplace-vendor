import CurrencyInput from "react-currency-input-field"
import { Control, FieldValues, Path } from "react-hook-form"
import { useEffect, useRef, useState } from "react"

import { Form } from "../../../../../components/common/form"
import { currencies } from "../../../../../lib/data/currencies"

interface ProductCreatePriceFieldProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  code: string
  /** Stack the input UNDER its label (instead of the default 2-column row). */
  stacked?: boolean
}

/**
 * A single currency price input. Label reads "Price"; the currency symbol sits
 * inside the input. The typed value is held locally and only committed to the
 * form ON BLUR — committing on every keystroke made the field re-format
 * mid-typing ("enters too soon"). The raw string is stored (submit does
 * `parseFloat`), so we never coerce to a number here.
 */
export const ProductCreatePriceField = <T extends FieldValues>({
  control,
  name,
  code,
  stacked,
}: ProductCreatePriceFieldProps<T>) => {
  const currency = currencies[code.toUpperCase()]
  const symbol = currency?.symbol_native ?? code.toUpperCase()
  const decimals = currency?.decimal_digits ?? 2

  return (
    <Form.Field
      control={control}
      name={name}
      render={({ field }) => (
        <PriceInput field={field} symbol={symbol} decimals={decimals} stacked={stacked} />
      )}
    />
  )
}

const PriceInput = ({
  field,
  symbol,
  decimals,
  stacked,
}: {
  field: any
  symbol: string
  decimals: number
  stacked?: boolean
}) => {
  const { value, onChange, onBlur, ref } = field

  // Local display value. We commit to the form on every keystroke (so the save
  // bar reacts instantly), but only re-sync the display FROM the form when the
  // input isn't focused — otherwise the form → localValue round-trip reformats
  // the field mid-typing and jumps the cursor.
  const [localValue, setLocalValue] = useState<string | undefined>(value ?? "")
  const focusedRef = useRef(false)

  useEffect(() => {
    if (!focusedRef.current) {
      setLocalValue(value ?? "")
    }
  }, [value])

  return (
    <Form.Item
      className={
        stacked
          ? "flex flex-col gap-y-2 px-6 py-4"
          : "grid grid-cols-2 items-center gap-x-4 px-6 py-4 space-y-0"
      }
    >
      <Form.Label>Price</Form.Label>
      <div className="flex w-full max-w-[10rem] flex-col gap-y-1">
        <Form.Control>
          <div className="bg-ui-bg-field shadow-borders-base focus-within:shadow-borders-interactive-with-active relative flex h-8 items-center rounded-md">
            <span
              className="txt-compact-small text-ui-fg-muted pointer-events-none absolute left-2.5"
              aria-hidden
            >
              {symbol}
            </span>
            <CurrencyInput
              ref={ref}
              className="txt-compact-small text-ui-fg-base w-full flex-1 appearance-none bg-transparent pl-8 pr-2.5 text-right outline-none"
              value={localValue}
              onFocus={() => {
                focusedRef.current = true
              }}
              onValueChange={(val) => {
                setLocalValue(val ?? "")
                // Commit as you type so the form goes dirty immediately.
                onChange(val ?? "")
              }}
              onBlur={() => {
                focusedRef.current = false
                onChange(localValue ?? "")
                onBlur()
              }}
              decimalScale={decimals}
              decimalsLimit={decimals}
              allowNegativeValue={false}
              autoComplete="off"
              placeholder="0"
            />
          </div>
        </Form.Control>
        <Form.ErrorMessage />
      </div>
    </Form.Item>
  )
}
