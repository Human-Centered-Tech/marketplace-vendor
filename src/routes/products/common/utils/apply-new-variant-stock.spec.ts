import { beforeEach, describe, expect, it, vi } from "vitest"

import { applyNewVariantStock } from "./apply-new-variant-stock"

vi.mock("../../../../lib/client", () => ({
  fetchQuery: vi.fn(),
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { fetchQuery } = await import("../../../../lib/client")
const mockFetch = fetchQuery as unknown as ReturnType<typeof vi.fn>

const LOCATION = "sloc_1"

/**
 * Route the two GETs the helper makes:
 *  - product refetch      → variants[] with inventory item ids
 *  - per-item level probe → whether a level already exists at LOCATION
 */
const stubServer = ({
  variants,
  itemsWithExistingLevel = [],
  failProbeFor = [],
}: {
  variants: Array<{ title: string; inventoryItemId?: string }>
  itemsWithExistingLevel?: string[]
  failProbeFor?: string[]
}) => {
  mockFetch.mockImplementation(async (path: string) => {
    if (path.startsWith("/vendor/products/")) {
      return {
        product: {
          variants: variants.map((v) => ({
            title: v.title,
            inventory_items: v.inventoryItemId
              ? [{ inventory_item_id: v.inventoryItemId }]
              : [],
          })),
        },
      }
    }

    const itemId = path.split("/")[3]
    if (failProbeFor.includes(itemId)) {
      throw new Error("boom")
    }
    return {
      location_levels: itemsWithExistingLevel.includes(itemId)
        ? [{ location_id: LOCATION }]
        : [],
    }
  })
}

describe("applyNewVariantStock", () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it("does nothing when there are no entries", async () => {
    const updateStockLevels = vi.fn()

    await applyNewVariantStock({
      productId: "prod_1",
      locationId: LOCATION,
      entries: [],
      updateStockLevels,
    })

    expect(mockFetch).not.toHaveBeenCalled()
    expect(updateStockLevels).not.toHaveBeenCalled()
  })

  it("does nothing when the seller has no stock location", async () => {
    const updateStockLevels = vi.fn()

    await applyNewVariantStock({
      productId: "prod_1",
      locationId: "",
      entries: [{ title: "S / Red", quantity: 5 }],
      updateStockLevels,
    })

    expect(mockFetch).not.toHaveBeenCalled()
    expect(updateStockLevels).not.toHaveBeenCalled()
  })

  it("creates a level when the variant has none yet", async () => {
    stubServer({ variants: [{ title: "S / Red", inventoryItemId: "iitem_1" }] })
    const updateStockLevels = vi.fn()

    await applyNewVariantStock({
      productId: "prod_1",
      locationId: LOCATION,
      entries: [{ title: "S / Red", quantity: 12 }],
      updateStockLevels,
    })

    expect(updateStockLevels).toHaveBeenCalledWith({
      create: [
        {
          inventory_item_id: "iitem_1",
          location_id: LOCATION,
          stocked_quantity: 12,
        },
      ],
      update: [],
      delete: [],
      force: true,
    })
  })

  it("updates instead of creating when a zero level already exists", async () => {
    stubServer({
      variants: [{ title: "S / Red", inventoryItemId: "iitem_1" }],
      itemsWithExistingLevel: ["iitem_1"],
    })
    const updateStockLevels = vi.fn()

    await applyNewVariantStock({
      productId: "prod_1",
      locationId: LOCATION,
      entries: [{ title: "S / Red", quantity: 12 }],
      updateStockLevels,
    })

    expect(updateStockLevels).toHaveBeenCalledWith({
      create: [],
      update: [
        {
          inventory_item_id: "iitem_1",
          location_id: LOCATION,
          stocked_quantity: 12,
        },
      ],
      delete: [],
      force: true,
    })
  })

  it("splits a mixed batch and sends it as one call", async () => {
    stubServer({
      variants: [
        { title: "S / Red", inventoryItemId: "iitem_1" },
        { title: "M / Red", inventoryItemId: "iitem_2" },
        { title: "L / Red", inventoryItemId: "iitem_3" },
      ],
      itemsWithExistingLevel: ["iitem_2"],
    })
    const updateStockLevels = vi.fn()

    await applyNewVariantStock({
      productId: "prod_1",
      locationId: LOCATION,
      entries: [
        { title: "S / Red", quantity: 1 },
        { title: "M / Red", quantity: 2 },
        { title: "L / Red", quantity: 3 },
      ],
      updateStockLevels,
    })

    expect(updateStockLevels).toHaveBeenCalledTimes(1)
    const payload = updateStockLevels.mock.calls[0][0]
    expect(payload.create.map((c: any) => c.inventory_item_id)).toEqual([
      "iitem_1",
      "iitem_3",
    ])
    expect(payload.update.map((u: any) => u.inventory_item_id)).toEqual([
      "iitem_2",
    ])
  })

  it("probes every variant in parallel, not one after another", async () => {
    let inFlight = 0
    let peak = 0
    mockFetch.mockImplementation(async (path: string) => {
      if (path.startsWith("/vendor/products/")) {
        return {
          product: {
            variants: Array.from({ length: 8 }, (_, i) => ({
              title: `v${i}`,
              inventory_items: [{ inventory_item_id: `iitem_${i}` }],
            })),
          },
        }
      }
      inFlight++
      peak = Math.max(peak, inFlight)
      await new Promise((r) => setTimeout(r, 5))
      inFlight--
      return { location_levels: [] }
    })

    await applyNewVariantStock({
      productId: "prod_1",
      locationId: LOCATION,
      entries: Array.from({ length: 8 }, (_, i) => ({
        title: `v${i}`,
        quantity: i,
      })),
      updateStockLevels: vi.fn(),
    })

    // Serial would peak at 1.
    expect(peak).toBe(8)
  })

  it("treats an unreadable probe as 'no level' so the quantity still lands", async () => {
    stubServer({
      variants: [{ title: "S / Red", inventoryItemId: "iitem_1" }],
      failProbeFor: ["iitem_1"],
    })
    const updateStockLevels = vi.fn()

    await applyNewVariantStock({
      productId: "prod_1",
      locationId: LOCATION,
      entries: [{ title: "S / Red", quantity: 12 }],
      updateStockLevels,
    })

    expect(updateStockLevels.mock.calls[0][0].create).toHaveLength(1)
  })

  it("applies what it can match, then reports what it couldn't by name", async () => {
    stubServer({
      variants: [
        { title: "S / Red", inventoryItemId: "iitem_1" },
        { title: "M / Red" }, // no inventory item
      ],
    })
    const updateStockLevels = vi.fn()

    // The matched variant still gets its stock...
    await expect(
      applyNewVariantStock({
        productId: "prod_1",
        locationId: LOCATION,
        entries: [
          { title: "S / Red", quantity: 1 },
          { title: "M / Red", quantity: 2 },
        ],
        updateStockLevels,
      })
      // ...and the unmatched one is named, rather than vanishing silently.
    ).rejects.toThrow(/didn't apply to "M \/ Red"/)

    expect(updateStockLevels).toHaveBeenCalledTimes(1)
    expect(updateStockLevels.mock.calls[0][0].create).toEqual([
      {
        inventory_item_id: "iitem_1",
        location_id: LOCATION,
        stocked_quantity: 1,
      },
    ])
  })

  it("refuses when two entries share a title", async () => {
    const updateStockLevels = vi.fn()

    await expect(
      applyNewVariantStock({
        productId: "prod_1",
        locationId: LOCATION,
        entries: [
          { title: "S / Red", quantity: 1 },
          { title: "S / Red", quantity: 2 },
        ],
        updateStockLevels,
      })
    ).rejects.toThrow(/share the name "S \/ Red"/)

    // Refused before touching the server — no guessing which one won.
    expect(mockFetch).not.toHaveBeenCalled()
    expect(updateStockLevels).not.toHaveBeenCalled()
  })

  it("refuses when the saved product has two variants with the same title", async () => {
    stubServer({
      variants: [
        { title: "S / Red", inventoryItemId: "iitem_1" },
        { title: "S / Red", inventoryItemId: "iitem_2" },
      ],
    })
    const updateStockLevels = vi.fn()

    await expect(
      applyNewVariantStock({
        productId: "prod_1",
        locationId: LOCATION,
        entries: [{ title: "S / Red", quantity: 1 }],
        updateStockLevels,
      })
    ).rejects.toThrow(/more than one variant named "S \/ Red"/)

    expect(updateStockLevels).not.toHaveBeenCalled()
  })

  it("retries when a level appears between the probe and the batch", async () => {
    // Reproduces the staging failure: the probe saw no level, so the entry was
    // sent as a create; the level existed by the time the batch landed, and the
    // endpoint rejected the WHOLE request, losing every quantity in it.
    let levelExists = false
    let batchCalls = 0

    mockFetch.mockImplementation(async (path: string) => {
      if (path.startsWith("/vendor/products/")) {
        return {
          product: {
            variants: [
              {
                title: "S / Red",
                inventory_items: [{ inventory_item_id: "iitem_1" }],
              },
            ],
          },
        }
      }
      const levels = levelExists ? [{ location_id: LOCATION }] : []
      // The server creates the level asynchronously — it lands right after our
      // first probe reads "absent".
      levelExists = true
      return { location_levels: levels }
    })

    const updateStockLevels = vi.fn(async (payload: any) => {
      batchCalls++
      if (payload.create.length) {
        throw new Error(
          "Inventory level with inventory_item_id: iitem_1 already exists."
        )
      }
      return {}
    })

    await applyNewVariantStock({
      productId: "prod_1",
      locationId: LOCATION,
      entries: [{ title: "S / Red", quantity: 12 }],
      updateStockLevels,
    })

    expect(batchCalls).toBe(2)
    // Second attempt re-probed, saw the settled state, and sent an update.
    expect(updateStockLevels.mock.calls[1][0]).toMatchObject({
      create: [],
      update: [
        {
          inventory_item_id: "iitem_1",
          location_id: LOCATION,
          stocked_quantity: 12,
        },
      ],
    })
  })

  it("gives up asking and sends everything as an update on the last attempt", async () => {
    // The probe keeps insisting there's no level, but the endpoint keeps
    // saying there is — the case a plain re-probe can't escape.
    stubServer({ variants: [{ title: "S / Red", inventoryItemId: "iitem_1" }] })
    const updateStockLevels = vi.fn(async (payload: any) => {
      if (payload.create.length) {
        throw new Error("already exists")
      }
      return {}
    })

    await applyNewVariantStock({
      productId: "prod_1",
      locationId: LOCATION,
      entries: [{ title: "S / Red", quantity: 12 }],
      updateStockLevels,
    })

    expect(updateStockLevels).toHaveBeenCalledTimes(3)
    expect(updateStockLevels.mock.calls[2][0]).toMatchObject({
      create: [],
      update: [
        {
          inventory_item_id: "iitem_1",
          location_id: LOCATION,
          stocked_quantity: 12,
        },
      ],
    })
  })

  it("surfaces the error when every attempt fails", async () => {
    stubServer({ variants: [{ title: "S / Red", inventoryItemId: "iitem_1" }] })
    const updateStockLevels = vi.fn().mockRejectedValue(new Error("nope"))

    await expect(
      applyNewVariantStock({
        productId: "prod_1",
        locationId: LOCATION,
        entries: [{ title: "S / Red", quantity: 12 }],
        updateStockLevels,
      })
    ).rejects.toThrow("nope")

    expect(updateStockLevels).toHaveBeenCalledTimes(3)
  })

  it("throws when no variant matches, rather than silently saving nothing", async () => {
    stubServer({
      variants: [{ title: "something else", inventoryItemId: "iitem_9" }],
    })
    const updateStockLevels = vi.fn()

    await expect(
      applyNewVariantStock({
        productId: "prod_1",
        locationId: LOCATION,
        entries: [{ title: "S / Red", quantity: 12 }],
        updateStockLevels,
      })
      // Names the variant rather than reporting a generic failure.
    ).rejects.toThrow(/didn't apply to "S \/ Red"/)

    expect(updateStockLevels).not.toHaveBeenCalled()
  })
})
