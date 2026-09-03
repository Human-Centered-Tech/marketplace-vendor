import { z } from "zod"

// Location and shipping option are resolved server-side
// (POST /vendor/shipping-setup); sellers never pick them.
export const CreateFulfillmentSchema = z.object({
  quantity: z.record(z.string(), z.number()),
  send_notification: z.boolean().optional(),
})
