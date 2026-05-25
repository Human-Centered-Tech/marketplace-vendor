import { z } from "zod"

export const CreateShipmentSchema = z.object({
  labels: z.array(
    z.object({
      tracking_number: z.string(),
      // TODO: this 2 are not optional in the API
      tracking_url: z.string().optional(),
      label_url: z.string().optional(),
    })
  ),
  // Free-text note shown to the buyer in the shipped email (e.g.
  // "Mailed via USPS First Class — no tracking"). Stored on the order,
  // separate from tracking. Optional.
  shipping_note: z.string().optional(),
})
