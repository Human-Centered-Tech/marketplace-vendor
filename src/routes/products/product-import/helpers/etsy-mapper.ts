import Papa from "papaparse"

import {
  DEFAULT_PRODUCT_STATUS,
  ETSY_HEADERS,
  ETSY_IMAGE_COLUMNS,
  MAX_IMAGES,
  MercurHeader,
} from "./etsy-column-map"
import { MercurRow, serializeMercurCsv, toMercurFile } from "./mercur-serializer"
import { parseVariationAxes, transposeVariations } from "./variation-transpose"

export type EtsyWarning = {
  listing: string
  message: string
}

export type MappingStats = {
  totalListings: number
  importedListings: number
  skippedListings: number
  totalVariants: number
}

export type MappingResult = {
  file: File
  stats: MappingStats
  warnings: EtsyWarning[]
  /** True when every listing was filtered out and the file is effectively empty */
  empty: boolean
}

type EtsyRow = Record<string, string>

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80)
}

function normalizeHeader(h: string): string {
  return h.toUpperCase().replace(/\s+/g, " ").trim()
}

function readCell(row: EtsyRow, header: string): string {
  const target = normalizeHeader(header)
  for (const key of Object.keys(row)) {
    if (normalizeHeader(key) === target) {
      return row[key] ?? ""
    }
  }
  return ""
}

function collectImages(row: EtsyRow): string[] {
  const images: string[] = []
  for (const col of ETSY_IMAGE_COLUMNS) {
    const url = readCell(row, col).trim()
    if (url) images.push(url)
  }
  return images.slice(0, MAX_IMAGES)
}

/**
 * Etsy can emit the SKU cell in two shapes:
 *   - single SKU for the whole listing (no variations, or seller didn't
 *     differentiate): "TS123"
 *   - comma-separated, one per variation-value combo, aligned by index:
 *     "TS123-S-RED,TS123-M-RED,TS123-S-BLUE,TS123-M-BLUE"
 *
 * When variationCount matches the comma-count, we treat the cell as
 * per-variant SKUs. Otherwise we suffix the single SKU with the combo's
 * axis values so Medusa's seller-scoped SKU uniqueness constraint doesn't
 * reject duplicate rows.
 */
function resolveSku(
  rawSku: string,
  variantIndex: number,
  combos: { axes: { value: string }[] }[],
): string {
  if (!rawSku) return ""
  const parts = rawSku.split(",").map((p) => p.trim())
  if (parts.length === combos.length && combos.length > 1) {
    return parts[variantIndex] ?? ""
  }
  const base = parts[0] ?? rawSku
  if (combos.length <= 1) return base
  const combo = combos[variantIndex]
  const suffix = combo.axes
    .map((a) =>
      a.value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
    )
    .filter(Boolean)
    .join("-")
  return suffix ? `${base}-${suffix}` : `${base}-${variantIndex + 1}`
}

export function parseEtsyCsv(text: string): Papa.ParseResult<EtsyRow> {
  return Papa.parse<EtsyRow>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (h) => h.trim(),
  })
}

/**
 * Map parsed Etsy rows into a Mercur-format File + stats + warnings.
 *
 * Filters:
 *   - Skip rows whose CURRENCY_CODE is not USD (USD-only v1, per plan).
 *   - Skip rows missing TITLE or PRICE.
 *   - Drop axes beyond MAX_OPTION_AXES with a warning (Etsy only supports
 *     2 axes so this is defensive).
 *
 * Notes:
 *   - No IS_DIGITAL filter because the real Etsy export doesn't include
 *     one. Digital listings come in as drafts; the vendor can delete them
 *     during review.
 *   - No per-variant inventory because LISTING_ID is absent from the
 *     listings export — we can't join against the Listings Inventory CSV.
 *     Listing-level quantity is duplicated across variants (known limitation
 *     surfaced as a warning when a listing has variations).
 */
export function mapEtsyRows(rows: EtsyRow[]): MappingResult {
  const warnings: EtsyWarning[] = []
  const output: MercurRow[] = []

  let importedListings = 0
  let skippedListings = 0
  let totalVariants = 0

  const usedHandles = new Set<string>()

  for (const row of rows) {
    const title = readCell(row, ETSY_HEADERS.TITLE).trim()
    if (!title) {
      skippedListings++
      warnings.push({
        listing: "(no title)",
        message: "Row skipped — TITLE is required.",
      })
      continue
    }

    const currency = readCell(row, ETSY_HEADERS.CURRENCY_CODE).trim().toUpperCase()
    if (currency && currency !== "USD") {
      skippedListings++
      warnings.push({
        listing: title,
        message: `Skipped — non-USD currency (${currency}). USD-only in this version.`,
      })
      continue
    }

    const priceStr = readCell(row, ETSY_HEADERS.PRICE).trim()
    const priceMajor = parseFloat(priceStr)
    if (!priceStr || Number.isNaN(priceMajor)) {
      skippedListings++
      warnings.push({
        listing: title,
        message: "Skipped — missing or invalid PRICE.",
      })
      continue
    }
    // Medusa v2 stores prices in major units (decimal dollars), not cents.
    // The Etsy CSV PRICE column is already in major units, so pass it through
    // as-is. Round to two decimals to keep the BigNumber clean.
    const priceForMedusa = (Math.round(priceMajor * 100) / 100).toFixed(2)

    const quantityStr = readCell(row, ETSY_HEADERS.QUANTITY).trim()
    const quantity = quantityStr ? parseInt(quantityStr, 10) : 0

    const rawSku = readCell(row, ETSY_HEADERS.SKU).trim()
    // Tags intentionally ignored in v1: Mercur's CSV normalizer throws
    // "Tag with value X not found" for any tag that isn't pre-created,
    // and creating tags inline would require a separate endpoint. Vendor
    // can re-tag after import. See normalize-for-import.js:84-88.
    const materials = readCell(row, ETSY_HEADERS.MATERIALS).trim()
    const description = readCell(row, ETSY_HEADERS.DESCRIPTION).trim()
    const images = collectImages(row)
    const thumbnail = images[0] ?? ""

    // Ensure stable-but-unique handle per listing even if two titles collide
    let handle = slugify(title) || "product"
    if (usedHandles.has(handle)) {
      let i = 2
      while (usedHandles.has(`${handle}-${i}`)) i++
      handle = `${handle}-${i}`
    }
    usedHandles.add(handle)

    const axes = parseVariationAxes({
      v1Name: readCell(row, ETSY_HEADERS.VARIATION_1_NAME),
      v1Values: readCell(row, ETSY_HEADERS.VARIATION_1_VALUES),
      v2Name: readCell(row, ETSY_HEADERS.VARIATION_2_NAME),
      v2Values: readCell(row, ETSY_HEADERS.VARIATION_2_VALUES),
    })
    const { combos, droppedAxes } = transposeVariations(axes, undefined)
    if (droppedAxes.length) {
      warnings.push({
        listing: title,
        message: `Only first 2 variation axes imported; dropped: ${droppedAxes.join(", ")}.`,
      })
    }
    if (combos.length > 1 && quantityStr) {
      warnings.push({
        listing: title,
        message: `Stock of ${quantity} applied to all ${combos.length} variants — adjust per-variant stock after import.`,
      })
    }

    combos.forEach((combo, variantIdx) => {
      const variantSku = resolveSku(rawSku, variantIdx, combos)

      const mercurRow: MercurRow = {
        "Product Handle": handle,
        "Product Title": title,
        "Product Description": description,
        "Product Status": DEFAULT_PRODUCT_STATUS,
        "Product Thumbnail": thumbnail,
        "Product Material": materials,
        "Product Discountable": "true",
        "Variant Title": combo.title,
        "Variant SKU": variantSku,
        "Variant Inventory Quantity": String(quantity),
        "Variant Allow Backorder": "false",
        "Variant Manage Inventory": "true",
        "Variant Price USD": priceForMedusa,
      }

      combo.axes.forEach((axis, axisIdx) => {
        const nameKey = `Option ${axisIdx + 1} Name` as MercurHeader
        const valueKey = `Option ${axisIdx + 1} Value` as MercurHeader
        mercurRow[nameKey] = axis.name
        mercurRow[valueKey] = axis.value
      })

      images.forEach((url, imgIdx) => {
        const key = `Image ${imgIdx + 1} Url` as MercurHeader
        mercurRow[key] = url
      })

      output.push(mercurRow)
      totalVariants++
    })

    importedListings++
  }

  const csv = serializeMercurCsv(output)
  const file = toMercurFile(csv)

  return {
    file,
    stats: {
      totalListings: importedListings + skippedListings,
      importedListings,
      skippedListings,
      totalVariants,
    },
    warnings,
    empty: output.length === 0,
  }
}

export type PipelineInput = {
  listingsCsvText: string
}

export async function buildMercurFileFromEtsy(
  input: PipelineInput,
): Promise<MappingResult> {
  const parsed = parseEtsyCsv(input.listingsCsvText)
  return mapEtsyRows(parsed.data)
}
