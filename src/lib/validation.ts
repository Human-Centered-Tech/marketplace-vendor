import i18next from "i18next"
import { FieldPath, FieldValues, UseFormReturn } from "react-hook-form"
import { z } from "zod"
import { castNumber } from "./cast-number"

/**
 * Validates that an optional value is an integer.
 */
export const optionalInt = z
  .union([z.string(), z.number()])
  .optional()
  .refine(
    (value) => {
      if (value === "" || value === undefined) {
        return true
      }

      return Number.isInteger(castNumber(value))
    },
    {
      message: i18next.t("validation.mustBeInt"),
    }
  )
  .refine(
    (value) => {
      if (value === "" || value === undefined) {
        return true
      }

      return castNumber(value) >= 0
    },
    {
      message: i18next.t("validation.mustBePositive"),
    }
  )

/**
 * Validates that an optional value is an number.
 */
export const optionalFloat = z
  .union([z.string(), z.number()])
  .optional()
  .refine(
    (value) => {
      if (value === "" || value === undefined) {
        return true
      }

      const amount = castNumber(value)
      // Number.isFinite is load-bearing, not belt-and-braces. A bare
      // `castNumber(value) >= 0` accepted two bad values:
      //   null -> castNumber returns null, and `null >= 0` is TRUE in JS
      //   NaN  -> from an unparseable string
      // Both serialize to `null` in JSON, and the API then rejects the whole
      // product with "Expected type: 'number' ... got: 'null'" — a 400 the
      // vendor sees as an unexplained failure instead of a field error.
      return Number.isFinite(amount) && amount >= 0
    },
    {
      message: i18next.t("validation.mustBePositive"),
    }
  )

/**
 * Schema for metadata form.
 */
export const metadataFormSchema = z.array(
  z.object({
    key: z.string(),
    value: z.unknown(),
    isInitial: z.boolean().optional(),
    isDeleted: z.boolean().optional(),
    isIgnored: z.boolean().optional(),
  })
)

/**
 * Validate subset of form fields
 * @param form
 * @param fields
 * @param schema
 */
export function partialFormValidation<TForm extends FieldValues>(
  form: UseFormReturn<TForm>,
  fields: FieldPath<any>[],
  schema: z.ZodSchema<any>
) {
  form.clearErrors(fields as any)

  const values = fields.reduce(
    (acc, key) => {
      acc[key] = form.getValues(key as any)
      return acc
    },
    {} as Record<string, unknown>
  )

  const validationResult = schema.safeParse(values)

  if (!validationResult.success) {
    validationResult.error.errors.forEach(({ path, message, code }) => {
      form.setError(path.join(".") as any, {
        type: code,
        message,
      })
    })

    return false
  }

  return true
}
