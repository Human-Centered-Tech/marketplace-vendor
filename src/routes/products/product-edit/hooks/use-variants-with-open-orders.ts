import { useMemo } from "react"

import { useOrders } from "../../../../hooks/api/orders"

/**
 * Variant ids that still owe units on an open order.
 *
 * Changing a product's options deletes any variant that can't fit the new
 * matrix. That's usually harmless — order line items snapshot the title, SKU
 * and thumbnail, and variants are soft-deleted, so history survives. But
 * FULFILLING an order reaches through to the live variant: the create-fulfilment
 * form needs `item.variant.product.shipping_profile.id`, and allocation needs
 * `item.variant.inventory`. Delete a variant that an unfulfilled order depends
 * on and the seller may not be able to ship it.
 *
 * So this is about operations, not record-keeping. Only orders that still owe
 * units matter; a completed order can lose its variant safely, which is why the
 * one production example (order #1, completed) has never broken.
 */

// Statuses where nothing more is owed. Anything else — including a status
// Medusa adds later that we don't know about — is treated as still open, so an
// unfamiliar value blocks a destructive change rather than waving it through.
const SETTLED_FULFILLMENT_STATUSES = new Set([
  "fulfilled",
  "shipped",
  "delivered",
  "canceled",
])

export const useVariantsWithOpenOrders = () => {
  // Fetched once for the page rather than per interaction: the option handlers
  // run on every keystroke, and they must not wait on a request.
  const { orders, isLoading } = useOrders({
    limit: 100,
    fields: "id,display_id,status,fulfillment_status,*items",
  } as any)

  const variantIdsWithOpenOrders = useMemo(() => {
    const map = new Map<string, string[]>()

    for (const order of (orders ?? []) as any[]) {
      if (order?.status === "canceled") {
        continue
      }
      if (SETTLED_FULFILLMENT_STATUSES.has(order?.fulfillment_status)) {
        continue
      }
      for (const item of order?.items ?? []) {
        const variantId = item?.variant_id
        if (!variantId) {
          continue
        }
        const label = order?.display_id ? `#${order.display_id}` : "an open order"
        const existing = map.get(variantId) ?? []
        if (!existing.includes(label)) {
          existing.push(label)
        }
        map.set(variantId, existing)
      }
    }

    return map
  }, [orders])

  return { variantIdsWithOpenOrders, isLoading }
}

/**
 * Human-readable "X is on order #12" for the variants that are blocked.
 * Returns null when nothing is blocked.
 */
export const describeOpenOrderBlock = (
  blocked: { label: string; orders: string[] }[]
): string | null => {
  if (!blocked.length) {
    return null
  }

  const parts = blocked.map(
    (b) => `"${b.label}" is on ${b.orders.join(", ")}`
  )

  return parts.join("; ")
}
