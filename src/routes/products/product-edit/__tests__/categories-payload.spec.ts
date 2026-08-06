import { describe, expect, it } from "vitest"

// The product edit form seeds `categories` from the fetched product and used to
// send it unconditionally. /vendor/products doesn't return categories unless
// explicitly requested, so the form seeded [] and the first save after any page
// load unassigned every category the merchant had set — reported as "my
// categories keep getting deleted every time I update something else".
//
// Mirrors the payload rule: send categories ONLY when the API returned them.
const categoriesPayload = (
  product: { categories?: { id: string }[] } | null | undefined,
  values: { categories: string[] }
) =>
  Array.isArray(product?.categories)
    ? { categories: values.categories.map((id) => ({ id })) }
    : {}

describe("product edit — categories payload", () => {
  it("omits categories entirely when the API didn't return them", () => {
    expect(categoriesPayload({}, { categories: [] })).toEqual({})
    expect(categoriesPayload(undefined, { categories: [] })).toEqual({})
    expect(categoriesPayload(null, { categories: [] })).toEqual({})
  })

  it("sends what the merchant chose when categories WERE loaded", () => {
    expect(
      categoriesPayload(
        { categories: [{ id: "pcat_1" }] },
        { categories: ["pcat_1", "pcat_2"] }
      )
    ).toEqual({ categories: [{ id: "pcat_1" }, { id: "pcat_2" }] })
  })

  it("still allows a deliberate clear-out", () => {
    expect(
      categoriesPayload({ categories: [{ id: "pcat_1" }] }, { categories: [] })
    ).toEqual({ categories: [] })
  })

  it("treats an empty loaded array as loaded", () => {
    expect(
      categoriesPayload({ categories: [] }, { categories: ["pcat_9"] })
    ).toEqual({ categories: [{ id: "pcat_9" }] })
  })
})
