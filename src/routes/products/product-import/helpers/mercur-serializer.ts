import { MERCUR_HEADERS, MercurHeader } from "./etsy-column-map"

export type MercurRow = Partial<Record<MercurHeader, string>>

/**
 * Serialize rows into the semicolon-delimited Mercur CSV format.
 *
 * The Mercur importer (via Medusa's parse-product-csv step) uses semicolons
 * as the column separator. Values containing semicolons, double-quotes, or
 * newlines are wrapped in double-quotes with internal quotes doubled.
 */
export function serializeMercurCsv(rows: MercurRow[]): string {
  const lines: string[] = []
  lines.push(MERCUR_HEADERS.join(";"))
  for (const row of rows) {
    const cells = MERCUR_HEADERS.map((h) => escapeCell(row[h] ?? ""))
    lines.push(cells.join(";"))
  }
  return lines.join("\n") + "\n"
}

function escapeCell(value: string): string {
  if (value === "") return ""
  const needsQuoting = /[;"\n\r]/.test(value)
  if (!needsQuoting) return value
  return `"${value.replace(/"/g, '""')}"`
}

/**
 * Build a File object from the serialized CSV so it can be handed to the
 * existing `useImportProducts` mutation without changing its contract.
 */
export function toMercurFile(csv: string, filename = "etsy-import.csv"): File {
  return new File([csv], filename, { type: "text/csv" })
}
