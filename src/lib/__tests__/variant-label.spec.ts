import { describe, expect, it } from "vitest"

import { isPlaceholderVariantTitle, resolveVariantLabel } from "../variant-label"

// The placeholder list must stay byte-identical to the storefront's
// isPlaceholderVariantTitle (marketplace-storefront/src/lib/helpers/
// variant-options.ts) — the two sides hide the same rows, and the create flow
// keeps WRITING "Default variant" so the storefront filter keeps matching.

describe("isPlaceholderVariantTitle", () => {
  it.each([
    "Default variant",
    "default variant",
    "  Default Variant  ",
    "Default title",
    "Default option",
    "Default value",
    "",
    "   ",
  ])("treats %j as a placeholder", (title) => {
    expect(isPlaceholderVariantTitle(title)).toBe(true)
  })

  it.each(["Large", "Red / XL", "Default variant pack", "Variant"])(
    "treats %j as a real title",
    (title) => {
      expect(isPlaceholderVariantTitle(title)).toBe(false)
    }
  )

  it("handles null and undefined", () => {
    expect(isPlaceholderVariantTitle(null)).toBe(true)
    expect(isPlaceholderVariantTitle(undefined)).toBe(true)
  })
})

describe("resolveVariantLabel", () => {
  it("keeps a real variant title even when a product is passed", () => {
    expect(
      resolveVariantLabel({ title: "Large" }, { title: "Coffee Mug" })
    ).toBe("Large")
  })

  it("swaps a placeholder for the product title", () => {
    expect(
      resolveVariantLabel({ title: "Default variant" }, { title: "Coffee Mug" })
    ).toBe("Coffee Mug")
  })

  it("falls back to the SKU when there is no product title", () => {
    expect(
      resolveVariantLabel({ title: "Default variant", sku: "MUG-1" }, undefined)
    ).toBe("MUG-1")
  })

  it("prefers the product title over the SKU", () => {
    expect(
      resolveVariantLabel(
        { title: "Default variant", sku: "MUG-1" },
        { title: "Coffee Mug" }
      )
    ).toBe("Coffee Mug")
  })

  it("falls back to an em dash when nothing identifies the row", () => {
    expect(resolveVariantLabel({ title: "Default variant" }, null)).toBe("—")
  })

  it("ignores a whitespace-only product title", () => {
    expect(
      resolveVariantLabel({ title: "Default variant", sku: "MUG-1" }, {
        title: "   ",
      })
    ).toBe("MUG-1")
  })

  it("never returns the placeholder itself", () => {
    const label = resolveVariantLabel({ title: "Default variant" }, {})
    expect(isPlaceholderVariantTitle(label)).toBe(false)
  })

  it("handles a missing variant", () => {
    expect(resolveVariantLabel(null, { title: "Coffee Mug" })).toBe("Coffee Mug")
  })
})
