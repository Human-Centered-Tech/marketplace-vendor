/**
 * Ordered list of Mercur CSV column headers. Order must match the Mercur
 * import parser's expectation — mirrors the template at
 * ./import-template.ts:3 plus extra Image 3..10 columns which the backend
 * parser accepts unbounded (verified in
 * @medusajs/core-flows/dist/product/helpers/normalize-v1-import.js).
 */
export const MERCUR_HEADERS = [
  "Product Id",
  "Product Handle",
  "Product Title",
  "Product Subtitle",
  "Product Description",
  "Product Status",
  "Product Thumbnail",
  "Product Weight",
  "Product Length",
  "Product Width",
  "Product Height",
  "Product HS Code",
  "Product Origin Country",
  "Product MID Code",
  "Product Material",
  "Product Collection Title",
  "Product Collection Handle",
  "Product Type",
  "Product Tags",
  "Product Discountable",
  "Product External Id",
  "Product Profile Name",
  "Product Profile Type",
  "Variant Id",
  "Variant Title",
  "Variant SKU",
  "Variant Barcode",
  "Variant Inventory Quantity",
  "Variant Allow Backorder",
  "Variant Manage Inventory",
  "Variant Weight",
  "Variant Length",
  "Variant Width",
  "Variant Height",
  "Variant HS Code",
  "Variant Origin Country",
  "Variant MID Code",
  "Variant Material",
  "Price EUR",
  "Price USD",
  "Option 1 Name",
  "Option 1 Value",
  "Option 2 Name",
  "Option 2 Value",
  "Image 1 Url",
  "Image 2 Url",
  "Image 3 Url",
  "Image 4 Url",
  "Image 5 Url",
  "Image 6 Url",
  "Image 7 Url",
  "Image 8 Url",
  "Image 9 Url",
  "Image 10 Url",
] as const

export type MercurHeader = (typeof MERCUR_HEADERS)[number]

export const MAX_IMAGES = 10
export const MAX_OPTION_AXES = 2

export const DEFAULT_PRODUCT_STATUS = "draft"

/**
 * Etsy CSV column names verified against a real "Currently for sale
 * listings" export from Shop Manager.
 *
 *   TITLE,DESCRIPTION,PRICE,CURRENCY_CODE,QUANTITY,TAGS,MATERIALS,
 *   IMAGE1..IMAGE10,
 *   VARIATION 1 TYPE,VARIATION 1 NAME,VARIATION 1 VALUES,
 *   VARIATION 2 TYPE,VARIATION 2 NAME,VARIATION 2 VALUES,
 *   SKU
 *
 * Notably absent: LISTING_ID, IS_DIGITAL, WEIGHT. Those are handled
 * elsewhere or dropped from v1 scope.
 */
export const ETSY_HEADERS = {
  TITLE: "TITLE",
  DESCRIPTION: "DESCRIPTION",
  PRICE: "PRICE",
  CURRENCY_CODE: "CURRENCY_CODE",
  QUANTITY: "QUANTITY",
  TAGS: "TAGS",
  MATERIALS: "MATERIALS",
  SKU: "SKU",
  VARIATION_1_NAME: "VARIATION 1 NAME",
  VARIATION_1_VALUES: "VARIATION 1 VALUES",
  VARIATION_2_NAME: "VARIATION 2 NAME",
  VARIATION_2_VALUES: "VARIATION 2 VALUES",
} as const

/**
 * Etsy listings export includes IMAGE1..IMAGE10 columns.
 */
export const ETSY_IMAGE_COLUMNS = Array.from(
  { length: MAX_IMAGES },
  (_, i) => `IMAGE${i + 1}`,
)

export const SUPPORTED_CURRENCIES = ["USD"] as const
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]
