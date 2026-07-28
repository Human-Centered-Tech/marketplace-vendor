import { HttpTypes } from "@medusajs/types"

import { fetchQuery } from "../../../../lib/client"

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

  // Refetch to learn each new variant's inventory item id.
  const { product } = await fetchQuery(`/vendor/products/${productId}`, {
    method: "GET",
    query: { fields: "*variants.inventory_items" },
  })

  const inventoryItemByTitle = new Map<string, string>()
  for (const variant of product?.variants ?? []) {
    const inventoryItemId = variant?.inventory_items?.[0]?.inventory_item_id
    if (variant?.title && inventoryItemId) {
      inventoryItemByTitle.set(variant.title, inventoryItemId)
    }
  }

  const targets = entries
    .map((entry) => ({
      quantity: entry.quantity,
      inventoryItemId: inventoryItemByTitle.get(entry.title),
    }))
    .filter(
      (target): target is { quantity: number; inventoryItemId: string } =>
        !!target.inventoryItemId
    )

  // Nothing matched: the titles we're keyed on don't line up with what the
  // server stored, or the variants have no inventory items. Throw rather than
  // return quietly — silently dropping a quantity the vendor typed reads as
  // "saved as 0", which is worse than an error they can act on. A partial
  // match still proceeds with whatever resolved.
  if (!targets.length) {
    throw new Error(
      "Couldn't match the new variants to their inventory records"
    )
  }

  // A manage_inventory variant may ALREADY have a zero-quantity level here:
  // the product-variant-created-inventory-levels subscriber creates one per
  // (inventory item × seller location) on variant creation. It's a subscriber,
  // so it races us — the row may or may not be there yet. Probe before
  // deciding create-vs-update, or we'd either duplicate a row or no-op.
  //
  // Probed in parallel. Doing this serially costs one full round trip per
  // variant, which is several seconds on a product with a big option matrix
  // (prod has 58 products with 26+ variants, topping out at 60).
  const hasLevel = await Promise.all(
    targets.map(async (target) => {
      try {
        const res = await fetchQuery(
          `/vendor/inventory-items/${target.inventoryItemId}/location-levels`,
          { method: "GET" }
        )
        return (res?.location_levels ?? []).some(
          (level: { location_id: string }) => level.location_id === locationId
        )
      } catch {
        // Treat an unreadable item as "no level" — a failed create is
        // recoverable (the vendor can set stock on the edit page), a failed
        // update on a row that doesn't exist is not.
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
