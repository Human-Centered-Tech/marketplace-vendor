import { Input, Text } from "@medusajs/ui"

import { InlineEditCard } from "../../../../components/common/inline-edit"

// Option titles treated as a color option (matches the storefront PDP).
export const COLOR_OPTION_TITLES = new Set([
  "color",
  "colour",
  "colors",
  "colours",
])

const HEX6_RE = /^#([0-9a-fA-F]{6})$/

/** The values of the product's color option (empty if there isn't one). */
export const getColorOptionValues = (
  options: { title: string; values: string[] }[]
): string[] => {
  const opt = options.find((o) =>
    COLOR_OPTION_TITLES.has((o.title || "").trim().toLowerCase())
  )
  return opt?.values ?? []
}

type ProductColorSwatchesProps = {
  values: string[]
  colorHex: Record<string, string>
  onChange: (next: Record<string, string>) => void
}

/**
 * Per-color-value swatch picker. Appears only when the product has a color
 * option; lets the merchant choose the exact color shown for each value on the
 * product page (stored in product.metadata.color_hex). A native color input +
 * a hex field, kept in sync.
 */
export const ProductColorSwatches = ({
  values,
  colorHex,
  onChange,
}: ProductColorSwatchesProps) => {
  if (!values.length) {
    return null
  }

  const set = (value: string, hex: string) =>
    onChange({ ...colorHex, [value]: hex })

  return (
    <InlineEditCard
      title="Color swatches"
      description="Pick the color shown for each value on the product page."
    >
      <div className="flex flex-col gap-y-3 px-6 py-4">
        {values.map((value) => {
          const current = colorHex[value]
          const picker = current && HEX6_RE.test(current) ? current : "#cccccc"
          return (
            <div key={value} className="flex items-center gap-x-3">
              <input
                type="color"
                value={picker}
                onChange={(e) => set(value, e.target.value)}
                aria-label={`Color for ${value}`}
                className="border-ui-border-base h-8 w-10 shrink-0 cursor-pointer rounded-md border bg-transparent p-0"
              />
              <Text
                size="small"
                weight="plus"
                leading="compact"
                className="flex-1 truncate"
              >
                {value}
              </Text>
              <Input
                value={current ?? ""}
                placeholder="#RRGGBB"
                autoComplete="off"
                className="max-w-[8rem]"
                onChange={(e) => set(value, e.target.value)}
              />
            </div>
          )
        })}
      </div>
    </InlineEditCard>
  )
}
