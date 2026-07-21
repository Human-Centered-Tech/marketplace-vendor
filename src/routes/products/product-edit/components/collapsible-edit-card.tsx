import { TriangleRightMini } from "@medusajs/icons"
import { Container, Heading, Text, clx } from "@medusajs/ui"
import { ReactNode, useState } from "react"

type CollapsibleEditCardProps = {
  title: string
  description?: string
  defaultOpen?: boolean
  children: ReactNode
}

/**
 * InlineEditCard chrome with a collapsible body. The whole header is a toggle;
 * a chevron rotates to point down when expanded. Collapsed by default so
 * rarely-used sections (e.g. shipping/customs attributes) stay out of the way.
 */
export const CollapsibleEditCard = ({
  title,
  description,
  defaultOpen = false,
  children,
}: CollapsibleEditCardProps) => {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Container className="divide-y p-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-ui-bg-base-hover transition-fg flex w-full items-center justify-between gap-x-4 rounded-t-lg px-6 py-4 text-left outline-none"
      >
        <div className="flex flex-col">
          <Heading>{title}</Heading>
          {description && (
            <Text size="small" className="text-ui-fg-subtle text-pretty">
              {description}
            </Text>
          )}
        </div>
        <TriangleRightMini
          className={clx(
            "text-ui-fg-muted transition-transform duration-200",
            open && "rotate-90"
          )}
        />
      </button>
      {open && children}
    </Container>
  )
}
