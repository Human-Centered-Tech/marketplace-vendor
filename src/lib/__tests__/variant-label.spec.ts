import { describe, expect, it } from "vitest"

import {
  isPlaceholderOption,
  isPlaceholderOptionValue,
  isPlaceholderVariantTitle,
  resolveVariantLabel,
} from "../variant-label"

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

describe("isPlaceholderOptionValue", () => {
  it.each(["Default option value", "default value", "Default Title", "  DEFAULT OPTION VALUE  "])(
    "treats %j as a placeholder value",
    (v) => expect(isPlaceholderOptionValue(v)).toBe(true)
  )

  it.each(['30" x 24"', "Small (1 oz)", "Red", "Default"])(
    "treats %j as a real value",
    (v) => expect(isPlaceholderOptionValue(v)).toBe(false)
  )
})

describe("isPlaceholderOption", () => {
  it("flags the generated axis our create flow writes", () => {
    expect(isPlaceholderOption("Default option", ["Default option value"])).toBe(true)
  })

  it("flags a Shopify-imported Title/Default Title axis", () => {
    expect(isPlaceholderOption("Title", ["Default Title"])).toBe(true)
  })

  // The case that motivated matching on value: renaming the option re-keys the
  // variant map but leaves the generated value behind, and a title-only rule
  // would sail straight past it. This is live in production on one product.
  it("flags a RENAMED axis whose value is still the placeholder", () => {
    expect(
      isPlaceholderOption("The Annunciation Rosary", ["Default option value"])
    ).toBe(true)
  })

  it("does NOT flag a real option that happens to have one value", () => {
    expect(isPlaceholderOption("Size", ['30" x 24"'])).toBe(false)
    expect(isPlaceholderOption("Version", ["Giclee Reproduction"])).toBe(false)
  })

  it("does NOT flag a real multi-value option", () => {
    expect(isPlaceholderOption("Scents", ["3 Coffee", "3 Lavender"])).toBe(false)
  })

  it("does not flag a real axis merely because one value looks generated", () => {
    expect(isPlaceholderOption("Size", ["Default option value", "Large"])).toBe(false)
  })

  it("treats a titled axis with no values as not-a-placeholder", () => {
    expect(isPlaceholderOption("Size", [])).toBe(false)
  })

  // The option title input fires per keystroke, so a merchant typing a real
  // option named "Title" must not have the row dropped before they can add
  // values to it.
  it("does not flag a values-less \"Title\" being typed", () => {
    expect(isPlaceholderOption("Title", [])).toBe(false)
    expect(isPlaceholderOption("Title", ["Hardcover"])).toBe(false)
  })

  it("still flags a Shopify Title once its generated value is present", () => {
    expect(isPlaceholderOption("Title", ["Default Title"])).toBe(true)
  })
})
