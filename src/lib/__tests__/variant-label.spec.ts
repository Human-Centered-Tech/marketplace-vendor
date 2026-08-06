import { describe, expect, it } from "vitest"

import { describeOpenOrderBlock } from "../../routes/products/product-edit/hooks/use-variants-with-open-orders"
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

// dropPlaceholderOptions lives in the edit section (it needs EditOption), so the
// rule is mirrored here — the keystroke sequence is what broke on staging.
const dropPlaceholderOptions = (opts: { title: string; values?: string[] }[]) => {
  const real = opts.filter((o) => !isPlaceholderOption(o.title, o.values ?? []))
  const usable = real.filter(
    (o) => o.title.trim() && (o.values?.length ?? 0) > 0
  )
  return usable.length > 0 ? real : opts
}

describe("dropPlaceholderOptions", () => {
  const ph = { title: "Default option", values: ["Default option value"] }
  const titles = (o: { title: string }[]) => o.map((x) => x.title)

  it.each(["", "S", "Si", "Size"])(
    "keeps the placeholder while a replacement is only part-typed (%j)",
    (typed) => {
      const out = dropPlaceholderOptions([ph, { title: typed, values: [] }])
      expect(titles(out)).toContain("Default option")
    }
  )

  it("retires the placeholder once the new option has a value", () => {
    const out = dropPlaceholderOptions([ph, { title: "Size", values: ["Large"] }])
    expect(titles(out)).toEqual(["Size"])
  })

  it("keeps the work-in-progress option, not just the usable ones", () => {
    const out = dropPlaceholderOptions([
      ph,
      { title: "Size", values: ["Large"] },
      { title: "Colo", values: [] },
    ])
    expect(titles(out)).toEqual(["Size", "Colo"])
  })

  it("never strips the last option", () => {
    expect(titles(dropPlaceholderOptions([ph]))).toEqual(["Default option"])
    expect(
      titles(dropPlaceholderOptions([{ title: "Title", values: ["Default Title"] }]))
    ).toEqual(["Title"])
  })

  it("leaves genuine multi-option products alone", () => {
    const opts = [
      { title: "Size", values: ["S", "M"] },
      { title: "Color", values: ["Red"] },
    ]
    expect(titles(dropPlaceholderOptions(opts))).toEqual(["Size", "Color"])
  })
})

// Mirrors getPermutations from the edit section. The bug this guards: the
// placeholder was correctly dropped from the product, then handed straight back
// through the "Add variations" modal, so every new combination rendered as
// "Default option value / Red".
const getPermutations = (data: { title: string; values: string[] }[]) => {
  const clean = data.filter((o) => o.title.trim() && o.values.length > 0)
  if (!clean.length) return []
  return clean.reduce<Record<string, string>[]>(
    (acc, opt) => acc.flatMap((c) => opt.values.map((v) => ({ ...c, [opt.title]: v }))),
    [{}]
  )
}
const comboLabel = (o: Record<string, string>) => Object.values(o).join(" / ")

describe("combinations offered after retiring the placeholder", () => {
  const opts = [
    { title: "Default option", values: ["Default option value"] },
    { title: "Color", values: ["Red", "Blue"] },
  ]

  it("does NOT carry the placeholder into the new combinations", () => {
    const labels = getPermutations(dropPlaceholderOptions(opts) as any).map(comboLabel)

    expect(labels).toEqual(["Red", "Blue"])
    labels.forEach((l) => expect(l).not.toContain("Default option value"))
  })

  it("would have carried it through without the cleanup (the regression)", () => {
    const labels = getPermutations(opts).map(comboLabel)

    expect(labels).toEqual([
      "Default option value / Red",
      "Default option value / Blue",
    ])
  })

  it("still produces the full matrix for genuine multi-option products", () => {
    const real = [
      { title: "Size", values: ["S", "M"] },
      { title: "Color", values: ["Red"] },
    ]
    expect(getPermutations(dropPlaceholderOptions(real) as any).map(comboLabel)).toEqual([
      "S / Red",
      "M / Red",
    ])
  })
})

// The edit screen renders only non-placeholder option rows, pairing the index
// BEFORE filtering — every handler addresses an option by its position in the
// real array, so filtering first would rename or delete the wrong one.
const visibleOptionRows = (opts: { title: string; values?: string[] }[]) =>
  opts
    .map((option, index) => ({ option, index }))
    .filter(
      ({ option }) => !isPlaceholderOption(option.title, option.values ?? [])
    )

describe("which option rows the merchant sees", () => {
  it("shows nothing for a simple product", () => {
    expect(
      visibleOptionRows([
        { title: "Default option", values: ["Default option value"] },
      ])
    ).toEqual([])
  })

  it("hides the placeholder but keeps real options", () => {
    const rows = visibleOptionRows([
      { title: "Default option", values: ["Default option value"] },
      { title: "Size", values: ['15" x 15"'] },
      { title: "Version", values: ["Original"] },
    ])
    expect(rows.map((r) => r.option.title)).toEqual(["Size", "Version"])
  })

  it("keeps the ORIGINAL index so handlers address the right option", () => {
    const rows = visibleOptionRows([
      { title: "Default option", values: ["Default option value"] },
      { title: "Size", values: ["L"] },
    ])
    // Size is at position 1 in the real array, not 0.
    expect(rows[0].index).toBe(1)
  })

  it("hides a renamed placeholder too", () => {
    expect(
      visibleOptionRows([
        { title: "The Annunciation Rosary", values: ["Default option value"] },
      ])
    ).toEqual([])
  })

  it("shows every row on a genuine multi-option product", () => {
    const rows = visibleOptionRows([
      { title: "Size", values: ["S", "M"] },
      { title: "Color", values: ["Red"] },
    ])
    expect(rows.map((r) => r.index)).toEqual([0, 1])
  })

  it("shows a half-typed option so it can be finished", () => {
    const rows = visibleOptionRows([
      { title: "Default option", values: ["Default option value"] },
      { title: "Colo", values: [] },
    ])
    expect(rows.map((r) => r.option.title)).toEqual(["Colo"])
  })
})

// The guard that stops an option change from deleting a variant an open order
// still needs. Fulfilment reaches through to the LIVE variant, so removing one
// mid-order can leave the seller unable to ship.
describe("describeOpenOrderBlock", () => {
  it("returns null when nothing is blocked", () => {
    expect(describeOpenOrderBlock([])).toBeNull()
  })

  it("names the variant and its order", () => {
    expect(
      describeOpenOrderBlock([{ label: "M", orders: ["#24"] }])
    ).toBe('"M" is on #24')
  })

  it("lists every order a variant appears on", () => {
    expect(
      describeOpenOrderBlock([{ label: "M", orders: ["#10", "#24"] }])
    ).toBe('"M" is on #10, #24')
  })

  it("joins multiple blocked variants", () => {
    expect(
      describeOpenOrderBlock([
        { label: "M", orders: ["#24"] },
        { label: "L", orders: ["#19"] },
      ])
    ).toBe('"M" is on #24; "L" is on #19')
  })
})
