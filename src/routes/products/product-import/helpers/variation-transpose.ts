import { MAX_OPTION_AXES } from "./etsy-column-map"

export type VariationAxis = {
  name: string
  values: string[]
}

export type VariantCombo = {
  /** Title joined by " / " — e.g., "Small / Red" */
  title: string
  /** Axes with the specific value picked for this combo */
  axes: { name: string; value: string }[]
  /** Stable lookup key for joining against any future inventory source */
  lookupKey: string
}

export type VariationInputs = {
  v1Name?: string
  v1Values?: string
  v2Name?: string
  v2Values?: string
}

/**
 * Read the four VARIATION N NAME/VALUES cells Etsy emits and produce a
 * list of axes. Values within a VALUES cell are comma-separated.
 *
 *   VARIATION 1 NAME="Size"       VARIATION 1 VALUES="Small,Medium,Large"
 *   VARIATION 2 NAME="Color"      VARIATION 2 VALUES="Red,Blue"
 */
export function parseVariationAxes(inputs: VariationInputs): VariationAxis[] {
  const axes: VariationAxis[] = []
  const pairs: Array<[string | undefined, string | undefined]> = [
    [inputs.v1Name, inputs.v1Values],
    [inputs.v2Name, inputs.v2Values],
  ]
  for (const [name, valuesRaw] of pairs) {
    const axisName = name?.trim()
    const rawValues = valuesRaw?.trim()
    if (!axisName || !rawValues) continue
    const values = rawValues
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
    if (values.length === 0) continue
    axes.push({ name: axisName, values })
  }
  return axes
}

function cartesian<T>(arrays: T[][]): T[][] {
  return arrays.reduce<T[][]>(
    (acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])),
    [[]],
  )
}

/**
 * Build a stable lookup key for matching against a per-variant inventory
 * source. Axis names alphabetized so (Size=S, Color=Red) and
 * (Color=Red, Size=S) hash the same.
 */
export function buildLookupKey(
  joinId: string | undefined,
  axes: { name: string; value: string }[],
): string {
  const normalized = axes
    .map((a) => ({ name: a.name.trim().toLowerCase(), value: a.value.trim().toLowerCase() }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((a) => `${a.name}=${a.value}`)
    .join("|")
  return `${joinId ?? ""}::${normalized}`
}

export type TransposeResult = {
  combos: VariantCombo[]
  /** Number of axes beyond MAX_OPTION_AXES we had to drop (reported as warning) */
  droppedAxes: string[]
}

/**
 * Expand a listing's axes into one combo per variant row.
 *
 * - No axes → returns one "Default" combo the caller can synthesize.
 * - More than MAX_OPTION_AXES axes → keeps the first N, reports the rest
 *   as dropped (caller surfaces a warning).
 */
export function transposeVariations(
  axes: VariationAxis[],
  joinId: string | undefined,
): TransposeResult {
  if (axes.length === 0) {
    return {
      combos: [
        {
          title: "Default",
          axes: [{ name: "Default", value: "Default" }],
          lookupKey: buildLookupKey(joinId, []),
        },
      ],
      droppedAxes: [],
    }
  }

  const kept = axes.slice(0, MAX_OPTION_AXES)
  const dropped = axes.slice(MAX_OPTION_AXES).map((a) => a.name)

  const valueGrid = kept.map((a) => a.values)
  const combos: VariantCombo[] = cartesian(valueGrid).map((valueRow) => {
    const axesForCombo = kept.map((a, i) => ({ name: a.name, value: valueRow[i] }))
    return {
      title: valueRow.join(" / "),
      axes: axesForCombo,
      lookupKey: buildLookupKey(joinId, axesForCombo),
    }
  })

  return { combos, droppedAxes: dropped }
}
