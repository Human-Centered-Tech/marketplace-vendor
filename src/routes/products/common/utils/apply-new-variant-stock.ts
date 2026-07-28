import { HttpTypes } from "@medusajs/types"

import { fetchQuery } from "../../../../lib/client"

/**
 * Pause between attempts, to let the server finish creating the levels it
 * makes for brand-new variants. Observed settling within ~800ms of the create
 * call returning.
 */
const SETTLE_MS = 600

/** Values appearing more than once, each listed once, in first-seen order. */
const findDuplicates = (values: string[]): string[] => {
  const seen = new Set<string>()
  const repeated = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) {
      repeated.add(value)
    }
    seen.add(value)
  }
  return [...repeated]
}

/** `"A", "B" and "C"` — for naming variants back to the vendor in an error. */
const quoteList = (values: string[]): string => {
  const quoted = values.map((v) => `"${v}"`)
  if (quoted.length <= 1) {
    return quoted.join("")
  }
  return `${quoted.slice(0, -1).join(", ")} and ${quoted[quoted.length - 1]}`
}

export type NewVariantStockEntry = {
  /**
   * The variant's title, used to match it against the freshly-refetched
   * product. Newly-created variants have no id client-side, and the create
   * response doesn't carry usable inventory item ids, so title is the only
   * handle we have. Titles are unique per product (they're the option combo).
   */
  title: string
  quantity: number
}

type ApplyNewVariantStockArgs = {
  productId: string
  /** Where the stock lands. Sellers have exactly one location today. */
  locationId: string
  entries: NewVariantStockEntry[]
  updateStockLevels: (
    payload: HttpTypes.AdminBatchInventoryItemsLocationLevels
  ) => Promise<unknown>
}

/**
 * Set starting stock for variants that were just created.
 *
 * Stock isn't a property of a variant — it lives in an inventory_level row
 * (inventory_item × stock_location × quantity) that can't exist until the
 * variant does. So quantities can't ride along with the create call; they have
 * to be applied in a second pass once the server has handed back real ids.
 *
 * Shared by the create form (brand-new product) and the edit form (variants
 * added to an existing product) — the sequence is identical in both cases.
 */
export const applyNewVariantStock = async ({
  productId,
  locationId,
  entries,
  updateStockLevels,
}: ApplyNewVariantStockArgs): Promise<void> => {
  if (!entries.length || !locationId) {
    return
  }

  // Everything below keys on title, so a repeated title can only be guessed at:
  // one variant would take another's quantity and one would get none, quietly.
  // On create, titles are the option combination and so are distinct unless a
  // value itself contains " / "; in the edit form's add-variations modal they're
  // free text and can genuinely repeat. Refuse instead of guessing.
  const duplicateEntryTitles = findDuplicates(entries.map((e) => e.title))
  if (duplicateEntryTitles.length) {
    throw new Error(
      `two variants share the name ${quoteList(duplicateEntryTitles)} — ` +
        `rename one and set its stock on the product page`
    )
  }

  // Refetch to learn each new variant's inventory item id.
  const { product } = await fetchQuery(`/vendor/products/${productId}`, {
    method: "GET",
    query: { fields: "*variants.inventory_items" },
  })

  const serverVariants = (product?.variants ?? []) as Array<{
    title?: string
    inventory_items?: Array<{ inventory_item_id?: string }>
  }>

  // Same hazard from the other side: two saved variants sharing a title makes
  // the lookup ambiguous, whatever the entries look like.
  const wanted = new Set(entries.map((e) => e.title))
  const duplicateSavedTitles = findDuplicates(
    serverVariants
      .map((v) => v.title)
      .filter((t): t is string => !!t && wanted.has(t))
  )
  if (duplicateSavedTitles.length) {
    throw new Error(
      `the product has more than one variant named ${quoteList(
        duplicateSavedTitles
      )} — set its stock on the product page`
    )
  }

  const inventoryItemByTitle = new Map<string, string>()
  for (const variant of serverVariants) {
    const inventoryItemId = variant?.inventory_items?.[0]?.inventory_item_id
    if (variant?.title && inventoryItemId) {
      inventoryItemByTitle.set(variant.title, inventoryItemId)
    }
  }

  const resolved = entries.map((entry) => ({
    title: entry.title,
    quantity: entry.quantity,
    inventoryItemId: inventoryItemByTitle.get(entry.title),
  }))

  const targets = resolved.filter(
    (
      target
    ): target is { title: string; quantity: number; inventoryItemId: string } =>
      !!target.inventoryItemId
  )
  const unmatched = resolved
    .filter((target) => !target.inventoryItemId)
    .map((target) => target.title)

  // Reported AFTER the write, not instead of it: the variants we did resolve
  // should still get their stock. But they must be reported — a quantity the
  // vendor typed disappearing without a word reads as "saved as 0", and until
  // now only the all-missing case said anything at all.
  const reportUnmatched = () => {
    if (unmatched.length) {
      throw new Error(
        `stock didn't apply to ${quoteList(unmatched)} — ` +
          `set it on the product page`
      )
    }
  }

  if (!targets.length) {
    reportUnmatched()
    return
  }

  // A brand-new variant's zero-quantity level (inventory item × seller
  // location) is created for us server-side, but ASYNCHRONOUSLY — it lands
  // somewhere in the second or so after the create call returns. So we have to
  // look before deciding create-vs-update: the row may or may not be there.
  //
  // Probed in parallel. Doing this serially costs one full round trip per
  // variant, which is several seconds on a product with a big option matrix
  // (prod has 58 products with 26+ variants, topping out at 60).
  const probeAndSend = async (assumeAllExist = false) => {
    const hasLevel = assumeAllExist
      ? targets.map(() => true)
      : await Promise.all(
          targets.map(async (target) => {
            try {
              const res = await fetchQuery(
                `/vendor/inventory-items/${target.inventoryItemId}/location-levels`,
                { method: "GET" }
              )
              return (res?.location_levels ?? []).some(
                (level: { location_id: string }) =>
                  level.location_id === locationId
              )
            } catch {
              // Treat an unreadable item as "no level" — a failed create is
              // recoverable (the vendor can set stock on the edit page), a
              // failed update on a row that doesn't exist is not.
              return false
            }
          })
        )

    const create: HttpTypes.AdminBatchInventoryItemsLocationLevels["create"] = []
    const update: HttpTypes.AdminBatchInventoryItemsLocationLevels["update"] = []

    targets.forEach((target, index) => {
      const level = {
        inventory_item_id: target.inventoryItemId,
        location_id: locationId,
        stocked_quantity: target.quantity,
      }
      if (hasLevel[index]) {
        update.push(level)
      } else {
        create.push(level)
      }
    })

    if (create.length || update.length) {
      await updateStockLevels({ create, update, delete: [], force: true })
    }
  }

  // The probe can be overtaken: a level that was absent when we looked can
  // exist by the time the batch lands, and the endpoint then rejects the whole
  // request ("Inventory level with inventory_item_id … already exists"),
  // losing every quantity in it — not just the one that collided. Observed on
  // staging with a 9-variant product: probes at T+0.6s saw some items with no
  // level, the batch at T+0.7s got a 400, all nine quantities dropped.
  //
  // Escalate rather than retry once, because a re-probe can lose the same race
  // a second time. The state only ever converges (levels get created, never
  // removed), so the last attempt stops asking and treats every level as
  // existing — which is what a collision already told us.
  //
  //   1. probe and split
  //   2. settle, re-probe and split
  //   3. settle, send everything as an update
  const attempts = [
    () => probeAndSend(),
    () => probeAndSend(),
    () => probeAndSend(true),
  ]

  for (let i = 0; i < attempts.length; i++) {
    let saved = false
    try {
      await attempts[i]()
      saved = true
    } catch (err) {
      if (i === attempts.length - 1) {
        throw err
      }
      await new Promise((resolve) => setTimeout(resolve, SETTLE_MS))
    }
    // Outside the try on purpose: reportUnmatched throws, and inside it that
    // would be caught as a failed write and retried.
    if (saved) {
      reportUnmatched()
      return
    }
  }
}
