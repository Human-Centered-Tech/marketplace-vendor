import { z } from "zod"

import { MediaSchema } from "../../products/product-create/constants"

/**
 * Page-level schema for the inline Store settings form. Merges the two former
 * drawer forms (store general + company) into one, MINUS `tax_id` — the tax ID
 * is collected by Stripe during the Stripe Connect onboarding flow, so it is
 * intentionally not captured here.
 *
 * Storefront-only fields (description, media/cover_media, refund_policy) are
 * present in the schema but only rendered/saved for merchants (non-service
 * businesses).
 */
export const StoreSettingsSchema = z.object({
  name: z.string().min(1),
  email: z.string().optional(),
  phone: z.string().optional(),
  description: z.string().optional(),
  media: z.array(MediaSchema).optional(),
  cover_media: z.array(MediaSchema).optional(),
  refund_policy: z.string().optional(),
  address_line: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  country_code: z.string().optional(),
})

export type StoreSettingsSchemaType = z.infer<typeof StoreSettingsSchema>
