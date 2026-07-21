import { HttpTypes } from "@medusajs/types"
import { Plus, XMarkMini } from "@medusajs/icons"
import {
  Badge,
  Button,
  Checkbox,
  Heading,
  IconButton,
  Input,
  Label,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useMemo, useState } from "react"
import { Controller, UseFormReturn, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Form } from "../../../../components/common/form"
import { InlineEditCard } from "../../../../components/common/inline-edit"
import { InlineTextField } from "../../../../components/common/inline-edit/inline-text-field"
import { ChipInput } from "../../../../components/inputs/chip-input"
import { ProductCreatePriceField } from "../../product-create/components/product-create-variants-pricing-section/product-create-price-field"
import { CURRENCY_CODE, ProductEditSchemaType } from "../constants"
import {
  AddVariationsModal,
  NewVariationSelection,
} from "./add-variations-modal"

type EditVariant = ProductEditSchemaType["variants"][number]
type EditOption = ProductEditSchemaType["options"][number]

type ProductEditVariantsSectionProps = {
  form: UseFormReturn<ProductEditSchemaType>
  store?: { supported_currencies?: { currency_code: string }[] }
  stockLocations?: HttpTypes.AdminStockLocation[]
  onModalOpenChange?: (open: boolean) => void
}

// Order-independent key for an option-value combination, so existing combos
// (whose keys may be in a different insertion order than freshly-built
// permutations) are matched correctly.
const comboKey = (options: Record<string, string>) =>
  Object.keys(options)
    .sort()
    .map((k) => `${k}=${options[k]}`)
    .join("|")

// Cartesian product of option values → one record per combination.
const getPermutations = (
  data: { title: string; values: string[] }[]
): Record<string, string>[] => {
  const clean = data.filter((o) => o.title.trim() && o.values.length > 0)
  if (clean.length === 0) {
    return []
  }
  return clean.reduce<Record<string, string>[]>(
    (acc, opt) =>
      acc.flatMap((combo) =>
        opt.values.map((value) => ({ ...combo, [opt.title]: value }))
      ),
    [{}]
  )
}

const comboLabel = (options: Record<string, string>) =>
  Object.values(options).join(" / ")

/**
 * Live combination grid for an existing product.
 *
 * Adding an option value regenerates the combinations below immediately — new
 * combos appear as opt-in "Create" rows (purely additive, safe). Removing a
 * value/option that maps to variants which already exist on the server is
 * gated behind an explicit confirmation and only ever deletes on save via
 * `variants_to_delete`. Nothing is deleted silently.
 */
export const ProductEditVariantsSection = ({
  form,
  store,
  stockLocations,
  onModalOpenChange,
}: ProductEditVariantsSectionProps) => {
  const { t } = useTranslation()
  const prompt = usePrompt()

  // "Add variations" modal state — opened the instant a new option value adds
  // combinations the product doesn't have yet.
  const [modalOpen, setModalOpenState] = useState(false)
  const [modalCombos, setModalCombos] = useState<Record<string, string>[]>([])
  const [modalAddedLabel, setModalAddedLabel] = useState<string>("")

  const setModalOpen = (open: boolean) => {
    setModalOpenState(open)
    onModalOpenChange?.(open)
  }

  const currencyCodes = useMemo(
    () =>
      store?.supported_currencies?.map((c) => c.currency_code) ?? [
        CURRENCY_CODE,
      ],
    [store]
  )

  const options = (useWatch({ control: form.control, name: "options" }) ??
    []) as EditOption[]
  const variants = (useWatch({ control: form.control, name: "variants" }) ??
    []) as EditVariant[]

  // Stock lives in its own form array (seeded from the loaded product's
  // variants); index it by variant id so each variant card can render its own
  // per-location Count rows.
  const stock = (useWatch({ control: form.control, name: "stock" }) ??
    []) as ProductEditSchemaType["stock"]
  const stockIndexById = useMemo(() => {
    const map = new Map<string, number>()
    stock.forEach((s, i) => map.set(s.id, i))
    return map
  }, [stock])
  const primaryLocationName = stockLocations?.[0]?.name

  // Titles of the product's real options (titled + at least one value) — used
  // to flag "incomplete" variants (leftovers missing a value for an option
  // added later). Requiring a value avoids flagging mid-edit, while an option
  // title is typed but before its values exist.
  const currentOptionTitles = useMemo(
    () =>
      options
        .filter((o) => o.title.trim() && (o.values?.length ?? 0) > 0)
        .map((o) => o.title),
    [options]
  )

  // A variant matches a permutation only if it has exactly the same set of
  // option/value pairs — subset matching mis-collapses variants when an option
  // axis is removed.
  const exactMatch = (
    vopts: Record<string, string> | undefined,
    perms: Record<string, string>[]
  ) => {
    const vkeys = Object.keys(vopts ?? {})
    return perms.find((p) => {
      const pkeys = Object.keys(p)
      return (
        pkeys.length === vkeys.length &&
        pkeys.every((k) => vopts?.[k] === p[k])
      )
    })
  }

  // Rebuild the variants array after an option change: keep existing variants
  // that still map to a permutation, keep (never silently drop) any existing
  // variant that no longer maps but wasn't confirmed for deletion, and drop
  // deletions-in-progress + stale new combos. New combinations are NOT appended
  // here — they're offered through the "Add variations" modal instead.
  const reconcile = (nextOptions: EditOption[]) => {
    const perms = getPermutations(nextOptions)
    const toDelete = new Set(form.getValues("variants_to_delete") ?? [])

    const kept: EditVariant[] = []
    variants.forEach((v) => {
      if (v.id && toDelete.has(v.id)) {
        return // queued for deletion — drop from the working set
      }
      const m = exactMatch(v.options, perms)
      if (m) {
        kept.push({ ...v, options: m, title: v.title || comboLabel(m) })
      } else if (v.id) {
        kept.push(v) // existing + unconfirmed — keep it, never lose data
      } else if (!v.should_create) {
        // stale, unconfirmed new combo → drop
      } else {
        kept.push(v) // an opted-in new combo the user already chose — keep it
      }
    })

    kept.forEach((v, i) => (v.variant_rank = i))
    form.setValue("variants", kept, { shouldDirty: true })
  }

  const queueDeletion = (ids: string[]) => {
    if (!ids.length) {
      return
    }
    const current = form.getValues("variants_to_delete") ?? []
    form.setValue("variants_to_delete", [...current, ...ids], {
      shouldDirty: true,
    })
  }

  // --- Option handlers -----------------------------------------------------

  const handleValuesChange = async (index: number, nextValues: string[]) => {
    const option = options[index]
    const prevValues = option.values ?? []
    const removed = prevValues.filter((v) => !nextValues.includes(v))
    const added = nextValues.filter((v) => !prevValues.includes(v))

    if (removed.length) {
      const affected = variants.filter(
        (v) => v.id && removed.includes(v.options?.[option.title])
      )
      if (affected.length) {
        const confirmed = await prompt({
          title: "Remove option value?",
          description: `Removing ${removed
            .map((r) => `"${r}"`)
            .join(", ")} will permanently delete ${affected.length} existing variant(s): ${affected
            .map((a) => a.title || comboLabel(a.options))
            .join(", ")} — including their SKU, price, and stock. This can't be undone.`,
          confirmText: t("actions.delete", "Remove"),
          cancelText: t("actions.cancel", "Cancel"),
        })
        if (!confirmed) {
          // Restore the chips — the ChipInput optimistically dropped the value.
          form.setValue(`options.${index}.values`, [...(option.values ?? [])], {
            shouldDirty: false,
          })
          return
        }
        queueDeletion(affected.map((a) => a.id as string))
      }
    }

    const nextOptions = options.map((o, i) =>
      i === index ? { ...o, values: nextValues } : o
    )
    form.setValue(`options.${index}.values`, nextValues, { shouldDirty: true })

    // Adding a value to a NEW option axis orphans existing variants — they have
    // no value for it, so they no longer fit the option set. Confirm removing
    // them so we don't leave stale "Red" cards next to the new "Red / Small"
    // combinations. (Adding to an existing option orphans nothing.)
    if (added.length) {
      const perms = getPermutations(nextOptions)
      const alreadyQueued = new Set(form.getValues("variants_to_delete") ?? [])
      const orphaned = (form.getValues("variants") ?? []).filter(
        (v) =>
          v.id && !alreadyQueued.has(v.id) && !exactMatch(v.options, perms)
      )
      if (orphaned.length) {
        const confirmed = await prompt({
          title: "Add this option?",
          description: `Your existing variant(s) — ${orphaned
            .map((o) => o.title || comboLabel(o.options))
            .join(
              ", "
            )} — don't have a value for this option, so they can't stay as-is. They'll be removed; recreate them below with the new option. This can't be undone.`,
          confirmText: t("actions.continue", "Continue"),
          cancelText: t("actions.cancel", "Cancel"),
        })
        if (!confirmed) {
          form.setValue(
            `options.${index}.values`,
            [...(option.values ?? [])],
            { shouldDirty: false }
          )
          return
        }
        queueDeletion(orphaned.map((o) => o.id as string))
      }
    }

    // Keep existing / drop removed + just-queued orphans. New combos are NOT
    // auto-added here.
    reconcile(nextOptions)

    // Additions → pop the modal with only the combinations that involve the
    // value(s) just added (not every pre-existing gap in the matrix), and that
    // aren't already a variant.
    if (added.length) {
      const perms = getPermutations(nextOptions)
      const existing = new Set(
        (form.getValues("variants") ?? []).map((v) => comboKey(v.options))
      )
      const optionTitle = option.title
      const newCombos = perms.filter(
        (p) => added.includes(p[optionTitle]) && !existing.has(comboKey(p))
      )
      if (newCombos.length) {
        setModalCombos(newCombos)
        setModalAddedLabel(added.map((a) => `"${a}"`).join(", "))
        setModalOpen(true)
      }
    }
  }

  // Append the combinations chosen in the modal as opted-in new variants.
  const handleAddVariations = (selections: NewVariationSelection[]) => {
    if (!selections.length) {
      return
    }
    const current = form.getValues("variants") ?? []
    const additions: EditVariant[] = selections.map((s, i) => ({
      id: undefined,
      title: comboLabel(s.options),
      sku: "",
      should_create: true,
      variant_rank: current.length + i,
      options: s.options,
      prices: { [CURRENCY_CODE]: s.price ?? "" },
      new_stock: s.stock === "" ? null : Number(s.stock),
    }))
    form.setValue("variants", [...current, ...additions], { shouldDirty: true })
  }

  // Drop an un-saved new combination (nothing to delete on the server).
  const handleDropNew = (index: number) => {
    const current = form.getValues("variants") ?? []
    form.setValue(
      "variants",
      current.filter((_, i) => i !== index),
      { shouldDirty: true }
    )
  }

  const handleTitleChange = (index: number, nextTitle: string) => {
    const prevTitle = options[index].title
    form.setValue(`options.${index}.title`, nextTitle, { shouldDirty: true })
    if (prevTitle === nextTitle) {
      return
    }
    // Re-key variant.options from the old title to the new one.
    const rekeyed = variants.map((v) => {
      if (!(prevTitle in (v.options ?? {}))) {
        return v
      }
      const next = { ...v.options }
      next[nextTitle] = next[prevTitle]
      delete next[prevTitle]
      return { ...v, options: next }
    })
    form.setValue("variants", rekeyed, { shouldDirty: true })
    const nextOptions = options.map((o, i) =>
      i === index ? { ...o, title: nextTitle } : o
    )
    reconcile(nextOptions)
  }

  const handleAddOption = () => {
    form.setValue("options", [...options, { title: "", values: [] }], {
      shouldDirty: true,
    })
  }

  const handleRemoveOption = async (index: number) => {
    const nextOptions = options.filter((_, i) => i !== index)
    // Any existing variant that won't map to a permutation of the remaining
    // options gets deleted — confirm first.
    const perms = getPermutations(nextOptions)
    const willDelete = variants.filter(
      (v) => v.id && !exactMatch(v.options, perms)
    )
    if (willDelete.length) {
      const confirmed = await prompt({
        title: "Remove option?",
        description: `Removing this option will permanently delete ${willDelete.length} existing variant(s): ${willDelete
          .map((a) => a.title || comboLabel(a.options))
          .join(", ")} — including their SKU, price, and stock. This can't be undone.`,
        confirmText: t("actions.delete", "Remove"),
        cancelText: t("actions.cancel", "Cancel"),
      })
      if (!confirmed) {
        return
      }
      queueDeletion(willDelete.map((a) => a.id as string))
    }
    form.setValue("options", nextOptions, { shouldDirty: true })
    reconcile(nextOptions)
  }

  // --- Variant row handlers ------------------------------------------------

  const handleRemoveExisting = async (variantId: string, label: string) => {
    if (existingCount <= 1) {
      return
    }
    const confirmed = await prompt({
      title: "Remove variant?",
      description: `"${label}" and its SKU, price, and stock will be permanently removed. This can't be undone.`,
      confirmText: t("actions.delete", "Remove"),
      cancelText: t("actions.cancel", "Cancel"),
    })
    if (!confirmed) {
      return
    }
    queueDeletion([variantId])
    form.setValue(
      "variants",
      variants.filter((v) => v.id !== variantId),
      { shouldDirty: true }
    )
    toast.success(`"${label}" will be removed when you save.`)
  }

  const existingCount = variants.filter((v) => v.id).length

  return (
    <div className="flex flex-col gap-y-3">
      {/* Options editor */}
      <InlineEditCard
        title={t("products.fields.options.label", "Options")}
        description="Edit option values (e.g. add a new color). New combinations appear below to fill in. Removing a value that an existing variant uses will ask before deleting it."
      >
        <div className="flex flex-col gap-y-4 px-6 py-4">
          <ul className="flex flex-col gap-y-3">
            {options.map((option, index) => (
              <li
                key={index}
                className="bg-ui-bg-component shadow-elevation-card-rest grid grid-cols-[1fr_28px] items-center gap-2 rounded-xl p-2"
              >
                <div className="grid grid-cols-[min-content_1fr] items-center gap-2">
                  <Label
                    size="xsmall"
                    weight="plus"
                    className="text-ui-fg-subtle px-2"
                  >
                    {t("fields.title")}
                  </Label>
                  <Input
                    className="bg-ui-bg-field-component"
                    placeholder="Color"
                    value={option.title}
                    onChange={(e) => handleTitleChange(index, e.target.value)}
                  />
                  <Label
                    size="xsmall"
                    weight="plus"
                    className="text-ui-fg-subtle px-2"
                  >
                    {t("fields.values", "Values")}
                  </Label>
                  <ChipInput
                    value={option.values}
                    variant="contrast"
                    placeholder="Red, Blue, Purple…"
                    onChange={(next: string[]) =>
                      handleValuesChange(index, next)
                    }
                  />
                </div>
                <IconButton
                  type="button"
                  size="small"
                  variant="transparent"
                  className="text-ui-fg-muted"
                  disabled={options.length <= 1}
                  onClick={() => handleRemoveOption(index)}
                >
                  <XMarkMini />
                </IconButton>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="secondary"
            size="small"
            className="self-start"
            onClick={handleAddOption}
          >
            <Plus />
            Add option
          </Button>
        </div>
      </InlineEditCard>

      {/* Variants — one card per combination */}
      <div className="flex items-center justify-between pt-2">
        <Heading level="h2">{t("products.variants.header", "Variants")}</Heading>
      </div>

      {variants.map((v, i) => {
        const label = v.title || comboLabel(v.options) || `Variant ${i + 1}`
        const isExisting = !!v.id
        const missingOptions = isExisting
          ? currentOptionTitles.filter((tt) => !(v.options && tt in v.options))
          : []

        return (
          <InlineEditCard
            key={isExisting ? v.id : `new-${JSON.stringify(v.options)}`}
            title={label}
          >
            {isExisting && missingOptions.length > 0 && (
              <div className="flex items-center gap-x-3 px-6 py-3">
                <div className="flex flex-col">
                  <Text size="small" leading="compact" weight="plus">
                    Incomplete variant
                  </Text>
                  <Text
                    size="xsmall"
                    leading="compact"
                    className="text-ui-fg-subtle"
                  >
                    Missing a value for {missingOptions.join(", ")} — a leftover
                    from before that option was added. Remove it and recreate it
                    with all options.
                  </Text>
                </div>
                <Badge size="2xsmall" color="orange" className="ml-auto">
                  Incomplete
                </Badge>
              </div>
            )}

            {!isExisting && (
              <div className="flex items-center gap-x-3 px-6 py-3">
                <div className="flex flex-col">
                  <Text size="small" leading="compact" weight="plus">
                    New variation
                  </Text>
                  <Text
                    size="xsmall"
                    leading="compact"
                    className="text-ui-fg-subtle"
                  >
                    Added when you save.
                  </Text>
                </div>
                <Badge size="2xsmall" color="blue" className="ml-auto">
                  New
                </Badge>
              </div>
            )}

            <InlineTextField
              control={form.control}
              name={`variants.${i}.title`}
              label={t("fields.title")}
              stacked
            />
            <InlineTextField
              control={form.control}
              name={`variants.${i}.sku`}
              label={t("fields.sku")}
              optional
              stacked
            />
            {currencyCodes.map((code) => (
              <ProductCreatePriceField
                key={code}
                control={form.control as any}
                name={`variants.${i}.prices.${code}`}
                code={code}
                stacked
              />
            ))}

            {/* Stock — folded into the same card as sku/price */}
            {!isExisting ? (
              <div className="flex flex-col gap-y-1 px-6 py-4">
                <Text
                  size="xsmall"
                  leading="compact"
                  className="text-ui-fg-muted"
                >
                  Starting stock
                  {primaryLocationName ? ` — ${primaryLocationName}` : ""}
                </Text>
                <Controller
                  control={form.control}
                  name={`variants.${i}.new_stock`}
                  render={({ field: { value, onChange, ...field } }) => (
                    <Input
                      {...field}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="0"
                      value={value ?? ""}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/[^0-9]/g, "")
                        onChange(digits === "" ? null : Number(digits))
                      }}
                    />
                  )}
                />
              </div>
            ) : (
              (() => {
                const sIdx = stockIndexById.get(v.id as string)
                const sEntry = sIdx != null ? stock[sIdx] : undefined
                if (sIdx == null || !sEntry) {
                  return null
                }
                if (!sEntry.inventory_item_id) {
                  return (
                    <div className="px-6 py-4">
                      <Text size="small" className="text-ui-fg-subtle">
                        This variant has no inventory item, so stock can't be
                        edited here.
                      </Text>
                    </div>
                  )
                }
                return (
                  <>
                    <div className="px-6 pt-4">
                      <Text
                        size="xsmall"
                        weight="plus"
                        leading="compact"
                        className="text-ui-fg-muted"
                      >
                        Stock
                      </Text>
                    </div>
                    {sEntry.locations.map((location, lIdx) => (
                      <div
                        key={location.id}
                        className="flex flex-col gap-y-3 px-6 py-4"
                      >
                        <div className="flex items-center gap-x-2">
                          <Controller
                            control={form.control}
                            name={`stock.${sIdx}.locations.${lIdx}.checked`}
                            render={({
                              field: { value, onChange, ...field },
                            }) => (
                              <Checkbox
                                {...field}
                                checked={!!value}
                                onCheckedChange={(c) => onChange(!!c)}
                              />
                            )}
                          />
                          <div className="flex flex-col">
                            <Text
                              size="xsmall"
                              leading="compact"
                              className="text-ui-fg-muted"
                            >
                              Location
                            </Text>
                            <Text size="small" leading="compact" weight="plus">
                              {location.name || location.id}
                            </Text>
                          </div>
                        </div>
                        <div className="flex flex-col gap-y-1">
                          <Text
                            size="xsmall"
                            leading="compact"
                            className="text-ui-fg-muted"
                          >
                            Count
                          </Text>
                          <Controller
                            control={form.control}
                            name={`stock.${sIdx}.locations.${lIdx}.quantity`}
                            render={({
                              field: { value, onChange, ...field },
                            }) => (
                              <Input
                                {...field}
                                type="text"
                                inputMode="numeric"
                                autoComplete="off"
                                placeholder="0"
                                value={value ?? ""}
                                onChange={(e) => {
                                  const digits = e.target.value.replace(
                                    /[^0-9]/g,
                                    ""
                                  )
                                  onChange(digits === "" ? null : Number(digits))
                                }}
                                disabled={!location.checked}
                              />
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </>
                )
              })()
            )}

            <div className="flex justify-end px-6 py-3">
              {isExisting ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  disabled={existingCount <= 1}
                  onClick={() => handleRemoveExisting(v.id as string, label)}
                >
                  {t("products.variants.actions.remove", "Remove variant")}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  onClick={() => handleDropNew(i)}
                >
                  Remove
                </Button>
              )}
            </div>
          </InlineEditCard>
        )
      })}

      <Form.Field
        control={form.control}
        name="variants"
        render={() => (
          <Form.Item>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />

      <AddVariationsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        combos={modalCombos}
        addedLabel={modalAddedLabel}
        currencyCode={currencyCodes[0] ?? CURRENCY_CODE}
        canStock={(stockLocations?.length ?? 0) > 0}
        stockLocationName={stockLocations?.[0]?.name}
        onConfirm={handleAddVariations}
      />
    </div>
  )
}
