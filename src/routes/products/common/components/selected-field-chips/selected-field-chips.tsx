import { XMarkMini } from "@medusajs/icons"
import { Badge, clx } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { UseFormReturn, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { fetchQuery } from "../../../../../lib/client"
import { ProductCreateSchemaType } from "../../../types"

type FieldKind = "categories" | "tags"

const CONFIG: Record<
  FieldKind,
  {
    path: "product-categories" | "product-tags"
    key: "product_category" | "product_tag"
    pick: (entity: any) => string
  }
> = {
  categories: {
    path: "product-categories",
    key: "product_category",
    pick: (c) => c.name,
  },
  tags: {
    path: "product-tags",
    key: "product_tag",
    pick: (tg) => tg.label || tg.value,
  },
}

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
    <span className="max-w-[180px] truncate">{label}</span>
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
// sidestep fetchQuery's array-query serialization (which would comma-join the
// ids and defeat the filter). Volumes are tiny (<=3 categories, a few tags).
const useLabelsById = (
  ids: string[],
  path: "product-categories" | "product-tags",
  key: "product_category" | "product_tag",
  pick: (entity: any) => string
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
 * A small box of removable chips for one organize field (categories OR tags),
 * rendered directly beneath that field's picker so the current selection is
 * always visible. Renders nothing when the field is empty. Shared by create and
 * the reused edit organize section (both pass a create-shaped form).
 */
export const SelectedFieldChips = ({
  form,
  field,
}: {
  form: UseFormReturn<ProductCreateSchemaType>
  field: FieldKind
}) => {
  const { t } = useTranslation()
  const cfg = CONFIG[field]

  const ids =
    (useWatch({ control: form.control, name: field }) as string[]) ?? []

  const labels = useLabelsById(ids, cfg.path, cfg.key, cfg.pick)

  const remove = (id: string) =>
    form.setValue(
      field,
      ids.filter((x) => x !== id),
      { shouldDirty: true }
    )

  if (!ids.length) {
    return null
  }

  return (
    <div className="bg-ui-bg-subtle shadow-borders-base mt-2 flex flex-wrap gap-1 rounded-lg p-2">
      {ids.map((id) => (
        <RemovableChip
          key={id}
          label={labels.get(id) ?? "…"}
          onRemove={() => remove(id)}
          removeLabel={t("actions.remove", "Remove")}
        />
      ))}
    </div>
  )
}
