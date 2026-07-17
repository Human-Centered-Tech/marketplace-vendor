import { z } from "zod"

import { MediaSchema } from "../../../routes/products/product-create/constants"

/**
 * Image formats accepted by the inline image fields (logo / cover). Kept here
 * (rather than inside a single form) so every page adopting the inline-edit
 * kit shares one allow-list. Moved out of the old store-edit drawer form.
 */
export const SUPPORTED_FORMATS = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/svg+xml",
]

export const SUPPORTED_FORMATS_FILE_EXTENSIONS = [
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".heic",
  ".svg",
]

/**
 * The `{ media: MediaSchema[] }` shape the store form uses for logo/cover
 * uploads. Re-exported from here so shared media components (e.g. the product
 * `upload-media-form-item`) can type against it without importing a specific
 * page's form module.
 */
export const StorefrontMediaSchema = z.object({
  media: z.array(MediaSchema).optional(),
})

export type StorefrontMediaSchemaType = z.infer<typeof StorefrontMediaSchema>
