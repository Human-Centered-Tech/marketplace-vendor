import { Container, Heading, Text } from "@medusajs/ui"
import { ReactNode } from "react"

interface InlineEditCardProps {
  title: string
  description?: string
  children: ReactNode
}

/**
 * Card chrome for an inline-editable settings section — the same look as the
 * old read-only cards (Container + divide-y + header) but WITHOUT the kebab
 * "Edit" menu. Fields are rendered directly as `children` (the Inline*Field
 * row components), each separated by the `divide-y`.
 */
export const InlineEditCard = ({
  title,
  description,
  children,
}: InlineEditCardProps) => {
  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{title}</Heading>
          {description && (
            <Text size="small" className="text-ui-fg-subtle text-pretty">
              {description}
            </Text>
          )}
        </div>
      </div>
      {children}
    </Container>
  )
}
