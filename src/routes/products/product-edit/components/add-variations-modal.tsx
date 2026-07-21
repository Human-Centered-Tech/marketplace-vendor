import {
  Button,
  FocusModal,
  Heading,
  Input,
  Switch,
  Text,
  clx,
} from "@medusajs/ui"
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
 * Pops the moment a new option value is added. Lists every new combination the
 * value introduces; each is off by default and can be toggled on with its
 * price + starting stock. "Add all variations" flips them all on. Only the
 * enabled rows are created.
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

  // Re-seed whenever the modal opens for a fresh set of combos.
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
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <FocusModal.Header>
          <FocusModal.Title className="sr-only">
            Add variations
          </FocusModal.Title>
          <FocusModal.Description className="sr-only">
            Choose which new combinations to add.
          </FocusModal.Description>
          <div className="flex items-center justify-end gap-x-2">
            <Button
              variant="secondary"
              size="small"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
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
          </div>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col items-center overflow-y-auto">
          <div className="flex w-full max-w-2xl flex-col gap-y-6 px-6 py-8">
            <div className="flex flex-col gap-y-1">
              <Heading level="h1">Add variations</Heading>
              <Text size="small" className="text-ui-fg-subtle">
                {addedLabel ? (
                  <>
                    Adding <span className="text-ui-fg-base">{addedLabel}</span>{" "}
                    creates the combinations below. Choose which to add — none
                    are added until you turn them on.
                  </>
                ) : (
                  "Choose which new combinations to add — none are added until you turn them on."
                )}
              </Text>
            </div>

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
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}
