/**
 * Helper function to cast a z.union([z.number(), z.string()]) to a number
 *
 * Commas are treated as THOUSANDS separators (US convention) — our merchants
 * are US-based. "1,299.00" -> 1299, "1,299" -> 1299.
 *
 * This previously did `replace(",", ".")`, i.e. read a comma as a European
 * DECIMAL separator. That silently mangled ordinary US input: "1,299" became
 * 1.299, so a $1,299 product was created priced at $1.30 with no error shown.
 * Worse, "1,299.00" became "1.299.00" -> NaN, and NaN serializes to null in
 * JSON, which made the API reject the whole product create (Sentry
 * VENDOR-DASHBOARD-3). The old call also only replaced the FIRST comma.
 *
 * Trade-off, decided deliberately (Liam, 8/1): European decimal input
 * ("12,50") now reads as 1250 rather than 12.50. That is the right call for a
 * US merchant base, but it is why this is a comment and not a silent one-liner.
 *
 * Callers must still reject non-finite results: an unparseable string yields
 * NaN, and NaN must never reach a request body (see optionalFloat in
 * lib/validation.ts).
 */
export const castNumber = (number: number | string) => {
  return typeof number === "string" ? Number(number.replace(/,/g, "")) : number
}
