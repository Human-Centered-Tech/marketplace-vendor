import { Divider, Heading, Text } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import type { EtsyWarning, MappingStats } from "../helpers/etsy-mapper"

type Props = {
  stats: MappingStats
  warnings: EtsyWarning[]
}

const WARNINGS_PREVIEW_COUNT = 10

export const MappingPreview = ({ stats, warnings }: Props) => {
  const { t } = useTranslation()
  const [showAll, setShowAll] = useState(false)

  const visibleWarnings = showAll
    ? warnings
    : warnings.slice(0, WARNINGS_PREVIEW_COUNT)
  const hiddenCount = warnings.length - visibleWarnings.length

  return (
    <div className="shadow-elevation-card-rest bg-ui-bg-component flex flex-col gap-y-3 rounded-md p-3">
      <div className="flex flex-row items-center gap-x-4">
        <Stat
          title={stats.importedListings.toLocaleString()}
          description={t("products.import.etsy.preview.importedListings")}
        />
        <Divider orientation="vertical" className="h-10" />
        <Stat
          title={stats.totalVariants.toLocaleString()}
          description={t("products.import.etsy.preview.totalVariants")}
        />
        <Divider orientation="vertical" className="h-10" />
        <Stat
          title={stats.skippedListings.toLocaleString()}
          description={t("products.import.etsy.preview.skippedListings")}
        />
      </div>

      {warnings.length > 0 && (
        <div>
          <Heading level="h3" className="text-ui-fg-base text-xs font-medium">
            {t("products.import.etsy.warnings.title", { count: warnings.length })}
          </Heading>
          <ul className="mt-2 flex max-h-48 flex-col gap-y-1 overflow-y-auto pr-1">
            {visibleWarnings.map((w, i) => (
              <li
                key={i}
                className="text-ui-fg-subtle border-ui-border-base border-l-2 pl-2 text-xs"
              >
                <span className="text-ui-fg-base font-medium">{w.listing}</span>
                <span className="mx-1">—</span>
                {w.message}
              </li>
            ))}
          </ul>
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="text-ui-fg-interactive mt-2 text-xs underline"
            >
              {t("products.import.etsy.warnings.showAll", { count: hiddenCount })}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const Stat = ({ title, description }: { title: string; description: string }) => (
  <div className="flex flex-1 flex-col justify-center">
    <Text size="xlarge" className="font-sans font-medium">
      {title}
    </Text>
    <Text
      leading="compact"
      size="xsmall"
      weight="plus"
      className="text-ui-fg-subtle"
    >
      {description}
    </Text>
  </div>
)
