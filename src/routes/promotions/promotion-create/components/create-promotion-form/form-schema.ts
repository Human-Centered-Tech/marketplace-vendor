import { z } from "zod"
import { CreateCampaignSchema } from "../../../../campaigns/campaign-create/components/create-campaign-form"

const isEmptyRuleValue = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === "number" && value < 1)

const RuleSchema = z.array(
  z
    .object({
      id: z.string().optional(),
      attribute: z.string().min(1, { message: "Required field" }),
      operator: z.string().min(1, { message: "Required field" }),
      // Values are optional at the schema level: only *required* rules (e.g. the
      // Buy X / Get Y quantities) must have a value. Optional conditions such as
      // Customer Group or Product may be left empty — that just means "no
      // restriction" and the empty rule is dropped before submit.
      values: z.union([z.number(), z.string(), z.array(z.string())]).optional(),
      required: z.boolean().optional(),
      disguised: z.boolean().optional(),
      field_type: z.string().optional(),
    })
    .superRefine((rule, ctx) => {
      if (rule.required && isEmptyRuleValue(rule.values)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["values"],
          message: "Required field",
        })
      }
    })
)

export const CreatePromotionSchema = z
  .object({
    template_id: z.string().optional(),
    campaign_id: z.string().optional(),
    campaign_choice: z.enum(["none", "existing", "new"]).optional(),
    is_automatic: z.string().toLowerCase(),
    code: z.string().min(1),
    type: z.enum(["buyget", "standard"]),
    status: z.enum(["draft", "active", "inactive"]),
    rules: RuleSchema,
    application_method: z.object({
      allocation: z.enum(["each", "across"]),
      value: z.number().min(0),
      currency_code: z.string().optional(),
      max_quantity: z.number().optional().nullable(),
      target_rules: RuleSchema,
      buy_rules: RuleSchema,
      type: z.enum(["fixed", "percentage"]),
      target_type: z.enum(["order", "shipping_methods", "items"]),
    }),
    campaign: CreateCampaignSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.application_method.allocation === "across") {
        return true
      }

      return (
        data.application_method.allocation === "each" &&
        typeof data.application_method.max_quantity === "number"
      )
    },
    {
      path: ["application_method.max_quantity"],
      message: `required field`,
    }
  )

export type CreatePromotionSchemaType = z.infer<typeof CreatePromotionSchema>
