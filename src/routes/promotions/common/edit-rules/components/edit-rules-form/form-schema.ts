import i18n from "i18next"
import { z } from "zod"

const isEmptyRuleValue = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === "number" && value < 1)

export const EditRules = z.object({
  type: z.string().optional(),
  rules: z.array(
    z
      .object({
        id: z.string().optional(),
        attribute: z
          .string()
          .min(1, { message: i18n.t("promotions.form.required") }),
        operator: z
          .string()
          .min(1, { message: i18n.t("promotions.form.required") }),
        // Only required rules must have a value; optional conditions (Customer
        // Group / Product) may be left empty and are dropped before submit.
        values: z
          .union([z.number(), z.string(), z.array(z.string())])
          .optional(),
        required: z.boolean().optional(),
        disguised: z.boolean().optional(),
        field_type: z.string().optional(),
      })
      .superRefine((rule, ctx) => {
        if (rule.required && isEmptyRuleValue(rule.values)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["values"],
            message: i18n.t("promotions.form.required"),
          })
        }
      })
  ),
})

export type EditRulesType = z.infer<typeof EditRules>
