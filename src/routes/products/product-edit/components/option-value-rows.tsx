import { XMarkMini } from "@medusajs/icons"
import { IconButton, Input } from "@medusajs/ui"
import { useEffect, useState } from "react"

type OptionValueRowsProps = {
  values: string[]
  onAdd: (value: string) => void
  onRemove: (value: string) => void
  /** Edit a value's text in place — a true rename (variants keep their data). */
  onRename: (oldValue: string, newValue: string) => void
}

/**
 * Editable list of an option's values. Each value is a text field: edit it and
 * blur/Enter to RENAME in place; the × removes it; the bottom box adds a new
 * one. (Replaces the chip input, which could only add/remove — so a rename read
 * as delete+add and wiped the variants.)
 */
export const OptionValueRows = ({
  values,
  onAdd,
  onRemove,
  onRename,
}: OptionValueRowsProps) => {
  const [draft, setDraft] = useState("")

  const commitAdd = () => {
    const v = draft.trim()
    if (v && !values.includes(v)) {
      onAdd(v)
    }
    setDraft("")
  }

  return (
    <div className="flex flex-col gap-y-2">
      {values.map((value) => (
        <ValueRow
          key={value}
          value={value}
          canRemove={values.length > 1}
          isDuplicate={(next) => values.includes(next)}
          onRemove={() => onRemove(value)}
          onRename={(next) => onRename(value, next)}
        />
      ))}
      <Input
        value={draft}
        placeholder="Add a value…"
        className="max-w-[16rem]"
        autoComplete="off"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitAdd}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault()
            commitAdd()
          }
        }}
      />
    </div>
  )
}

const ValueRow = ({
  value,
  canRemove,
  isDuplicate,
  onRemove,
  onRename,
}: {
  value: string
  canRemove: boolean
  isDuplicate: (next: string) => boolean
  onRemove: () => void
  onRename: (next: string) => void
}) => {
  const [local, setLocal] = useState(value)

  useEffect(() => {
    setLocal(value)
  }, [value])

  const commit = () => {
    const next = local.trim()
    // No change, blank, or collides with another value → revert.
    if (!next || next === value || isDuplicate(next)) {
      setLocal(value)
      return
    }
    onRename(next)
  }

  return (
    <div className="flex items-center gap-x-2">
      <Input
        value={local}
        className="max-w-[16rem]"
        autoComplete="off"
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            ;(e.target as HTMLInputElement).blur()
          }
        }}
      />
      <IconButton
        type="button"
        variant="transparent"
        size="small"
        className="text-ui-fg-muted"
        disabled={!canRemove}
        onClick={onRemove}
      >
        <XMarkMini />
      </IconButton>
    </div>
  )
}
