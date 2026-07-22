import { XMarkMini } from "@medusajs/icons"
import { Badge, Text, clx } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { UseFormReturn, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { fetchQuery } from "../../../../../lib/client"
import { ProductCreateSchemaType } from "../../../types"

type SelectedOrganizeSummaryProps = {
  // Both create and the reused edit organize section pass a create-shaped form.
  form: UseFormReturn<ProductCreateSchemaType>
}

type Chip = { id: string; label: string }

const RemovableChip = ({
  label,
  onRemove,
  removeLabel,
}: {
  label: string
  onRemove: () => void
  removeLabel: string
}) => (
  <Badge size="2xsmall" className="flex items-center gap-x-0.5 pr-0.5">
    <span className="max-w-[160px] truncate">{label}</span>
    <button
      type="button"
      onClick={onRemove}
      aria-label={removeLabel}
      className={clx(
        "text-ui-fg-muted hover:text-ui-fg-base transition-fg",
        "flex size-4 items-center justify-center rounded-sm outline-none"
      )}
    >
      <XMarkMini />
    </button>
  </Badge>
)

// Resolve a set of ids to labels via the singular by-id endpoints. Path params
// sidestep fetchQuery's array-query serialization (which would join ids with a
// comma and defeat the filter). Volumes are tiny (<=3 categories, a few tags).
const useLabelsById = (
  ids: string[],
  path: "product-categories" | "product-tags",
  pick: (entity: any) => string,
  key: "product_category" | "product_tag"
) => {
  const { data } = useQuery({
    queryKey: [path, "selected-labels", ids],
    queryFn: async () => {
      const rows = await Promise.all(
        ids.map((id) =>
          fetchQuery(`/vendor/${path}/${id}`, { method: "GET" })
            .then((r: any) => r?.[key])
            .catch(() => null)
        )
      )
      const map = new Map<string, string>()
      rows.forEach((row: any) => {
        if (row?.id) {
          map.set(row.id, pick(row))
        }
      })
      return map
    },
    enabled: ids.length > 0,
  })

  return data ?? new Map<string, string>()
}

/**
 * Read-only companion to the category + tag pickers: shows what's currently
 * selected as removable chips, so both selections are visible (and prunable)
 * without reopening either combobox. Selection order is preserved; names are
 * resolved by id (the pickers only store ids).
 */
export const SelectedOrganizeSummary = ({
  form,
}: SelectedOrganizeSummaryProps) => {
  const { t } = useTranslation()

  const categoryIds =
    (useWatch({ control: form.control, name: "categories" }) as string[]) ?? []
  const tagIds =
    (useWatch({ control: form.control, name: "tags" }) as string[]) ?? []

  const categoryLabels = useLabelsById(
    categoryIds,
    "product-categories",
    (c) => c.name,
    "product_category"
  )
  const tagLabels = useLabelsById(
    tagIds,
    "product-tags",
    (tg) => tg.label || tg.value,
    "product_tag"
  )

  const categoryChips: Chip[] = categoryIds.map((id) => ({
    id,
    label: categoryLabels.get(id) ?? "…",
  }))
  const tagChips: Chip[] = tagIds.map((id) => ({
    id,
    label: tagLabels.get(id) ?? "…",
  }))

  const removeCategory = (id: string) =>
    form.setValue(
      "categories",
      categoryIds.filter((c) => c !== id),
      { shouldDirty: true }
    )
  const removeTag = (id: string) =>
    form.setValue(
      "tags",
      tagIds.filter((tg) => tg !== id),
      { shouldDirty: true }
    )

  const nothingSelected = categoryChips.length === 0 && tagChips.length === 0

  return (
    <div className="bg-ui-bg-subtle shadow-borders-base flex flex-col gap-y-4 rounded-lg p-3">
      <Text size="small" weight="plus" leading="compact">
        {t("products.fields.organize.selectedTitle", "Selected")}
      </Text>

      {nothingSelected && (
        <Text size="small" className="text-ui-fg-muted">
          {t(
            "products.fields.organize.selectedEmpty",
            "Pick categories and tags to see them here."
          )}
        </Text>
      )}

      {categoryChips.length > 0 && (
        <div className="flex flex-col gap-y-1.5">
          <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
            {t("products.fields.categories.label", "Categories")}
          </Text>
          <div className="flex flex-wrap gap-1">
            {categoryChips.map((chip) => (
              <RemovableChip
                key={chip.id}
                label={chip.label}
                onRemove={() => removeCategory(chip.id)}
                removeLabel={t("actions.remove", "Remove")}
              />
            ))}
          </div>
        </div>
      )}

      {tagChips.length > 0 && (
        <div className="flex flex-col gap-y-1.5">
          <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
            {t("products.fields.tags.label", "Tags")}
          </Text>
          <div className="flex flex-wrap gap-1">
            {tagChips.map((chip) => (
              <RemovableChip
                key={chip.id}
                label={chip.label}
                onRemove={() => removeTag(chip.id)}
                removeLabel={t("actions.remove", "Remove")}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
