import { clx } from "@medusajs/ui"
import { useEffect, useRef } from "react"

type RichTextEditorProps = {
  value?: string
  onChange: (html: string) => void
  onBlur?: () => void
  placeholder?: string
}

/**
 * Minimal rich-text editor for product descriptions. Emits HTML (bold, italic,
 * bullet/numbered lists, line breaks) which the storefront already renders
 * (dangerouslySetInnerHTML + .product-details styles). No external dependency.
 *
 * Uncontrolled internally: the HTML is seeded once (and only re-seeded when the
 * field value changes while the editor is NOT focused, e.g. async form load) to
 * avoid the classic contentEditable cursor-jump on every keystroke.
 */
export const RichTextEditor = ({
  value,
  onChange,
  onBlur,
  placeholder,
}: RichTextEditorProps) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (document.activeElement !== el && (value ?? "") !== el.innerHTML) {
      el.innerHTML = value ?? ""
    }
  }, [value])

  const exec = (command: string) => {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    document.execCommand(command, false)
    ref.current?.focus()
    if (ref.current) onChange(ref.current.innerHTML)
  }

  return (
    <div className="border border-ui-border-base rounded-md overflow-hidden bg-ui-bg-field">
      <div className="flex items-center gap-1 border-b border-ui-border-base px-2 py-1">
        <ToolbarButton label="Bold" onClick={() => exec("bold")}>
          <span className="font-bold">B</span>
        </ToolbarButton>
        <ToolbarButton label="Italic" onClick={() => exec("italic")}>
          <span className="italic">I</span>
        </ToolbarButton>
        <ToolbarButton
          label="Bulleted list"
          onClick={() => exec("insertUnorderedList")}
        >
          •
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          onClick={() => exec("insertOrderedList")}
        >
          1.
        </ToolbarButton>
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        onBlur={onBlur}
        data-placeholder={placeholder}
        className={clx(
          "min-h-[120px] px-3 py-2 txt-small outline-none",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-ui-fg-muted"
        )}
      />
    </div>
  )
}

const ToolbarButton = ({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    // Keep the text selection while clicking the toolbar so execCommand applies
    // to the selected text instead of losing focus.
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className="w-7 h-7 flex items-center justify-center rounded text-ui-fg-subtle hover:bg-ui-bg-base-hover txt-small"
  >
    {children}
  </button>
)
