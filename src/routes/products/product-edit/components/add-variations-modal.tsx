import { Button, Drawer, Input, Switch, Text, clx } from "@medusajs/ui"
import { useEffect, useState } from "react"

export type NewVariationSelection = {
  options: Record<string, string>
  price: string
  stock: string
}

type Row = NewVariationSelection & { enabled: boolean }

type AddVariationsModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  combos: Record<string, string>[]
  addedLabel?: string
  currencyCode: string
  canStock: boolean
  stockLocationName?: string
  onConfirm: (selections: NewVariationSelection[]) => void
}

const label = (options: Record<string, string>) =>
  Object.values(options).join(" / ")

/**
 * Opens the moment a new option value is added. Lists every new combination the
 * value introduces; each is off by default and can be toggled on with its
 * price + starting stock. "Add all variations" flips them all on. Only the
 * enabled rows are created. Rendered as a side drawer (not full screen).
 */
export const AddVariationsModal = ({
  open,
  onOpenChange,
  combos,
  addedLabel,
  currencyCode,
  canStock,
  stockLocationName,
  onConfirm,
}: AddVariationsModalProps) => {
  const [addAll, setAddAll] = useState(false)
  const [rows, setRows] = useState<Row[]>([])

  // Re-seed whenever the drawer opens for a fresh set of combos.
  useEffect(() => {
    if (open) {
      setAddAll(false)
      setRows(
        combos.map((c) => ({ options: c, enabled: false, price: "", stock: "" }))
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const toggleAll = (value: boolean) => {
    setAddAll(value)
    setRows((prev) => prev.map((r) => ({ ...r, enabled: value })))
  }

  const enabledCount = rows.filter((r) => r.enabled).length

  const handleConfirm = () => {
    onConfirm(
      rows
        .filter((r) => r.enabled)
        .map(({ options, price, stock }) => ({ options, price, stock }))
    )
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Add variations</Drawer.Title>
          <Drawer.Description>
            {addedLabel
              ? `Adding ${addedLabel} creates the combinations below. Choose which to add.`
              : "Choose which new combinations to add."}
          </Drawer.Description>
        </Drawer.Header>

        <Drawer.Body className="flex flex-col gap-y-4 overflow-y-auto">
          <div className="bg-ui-bg-component flex items-center justify-between rounded-lg border px-4 py-3">
            <div className="flex flex-col">
              <Text size="small" weight="plus" leading="compact">
                Add all variations
              </Text>
              <Text size="xsmall" className="text-ui-fg-subtle">
                Turn every combination on at once.
              </Text>
            </div>
            <Switch checked={addAll} onCheckedChange={toggleAll} />
          </div>

          <div className="flex flex-col gap-y-3">
            {rows.map((row, i) => (
              <div
                key={label(row.options)}
                className={clx(
                  "rounded-lg border px-4 py-3 transition-colors",
                  row.enabled ? "bg-ui-bg-base" : "bg-ui-bg-subtle"
                )}
              >
                <div className="flex items-center justify-between">
                  <Text size="small" weight="plus" leading="compact">
                    {label(row.options)}
                  </Text>
                  <Switch
                    checked={row.enabled}
                    onCheckedChange={(v) => setRow(i, { enabled: v })}
                  />
                </div>
                {row.enabled && (
                  <div className="mt-3 flex flex-col gap-3">
                    <div className="flex flex-col gap-y-1">
                      <Text
                        size="xsmall"
                        className="text-ui-fg-subtle"
                        leading="compact"
                      >
                        Price ({currencyCode.toUpperCase()})
                      </Text>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={row.price}
                        onChange={(e) =>
                          setRow(i, {
                            price: e.target.value.replace(/[^0-9.]/g, ""),
                          })
                        }
                      />
                    </div>
                    {canStock && (
                      <div className="flex flex-col gap-y-1">
                        <Text
                          size="xsmall"
                          className="text-ui-fg-subtle"
                          leading="compact"
                        >
                          Stock{stockLocationName ? ` — ${stockLocationName}` : ""}
                        </Text>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={row.stock}
                          onChange={(e) =>
                            setRow(i, {
                              stock: e.target.value.replace(/[^0-9]/g, ""),
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Drawer.Body>

        <Drawer.Footer>
          <Drawer.Close asChild>
            <Button variant="secondary" size="small" type="button">
              Cancel
            </Button>
          </Drawer.Close>
          <Button
            size="small"
            type="button"
            onClick={handleConfirm}
            disabled={enabledCount === 0}
          >
            {enabledCount > 0
              ? `Add ${enabledCount} variation${enabledCount > 1 ? "s" : ""}`
              : "Add variations"}
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}
