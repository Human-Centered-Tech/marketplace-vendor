/**
 * Inline-edit kit — reusable primitives for settings pages that edit fields
 * in place (no kebab menu, no drawer) with a single page-level sticky save bar.
 *
 * Opt-in convention for a page:
 *   1. Own one `useForm({ defaultValues, resolver })`.
 *   2. Wrap the page body in `<Form {...form}>` (FormProvider) and a
 *      `<KeyboundForm onSubmit={handleSubmit}>`.
 *   3. Render one or more `<InlineEditCard>`s containing `Inline*Field` rows,
 *      all bound to the same `form.control`.
 *   4. Render `<StickySaveBar form={form} isSubmitting={mutation.isPending} />`
 *      as the last child — it appears only while the form is dirty.
 *
 * See routes/store/store-detail/store-detail.tsx for the reference adoption.
 */
export { StickySaveBar } from "./sticky-save-bar"
export { InlineEditCard } from "./inline-edit-card"
export { InlineTextField } from "./inline-text-field"
export { InlineTextareaField } from "./inline-textarea-field"
export { InlineImageField } from "./inline-image-field"
export {
  SUPPORTED_FORMATS,
  SUPPORTED_FORMATS_FILE_EXTENSIONS,
  StorefrontMediaSchema,
} from "./constants"
export type { StorefrontMediaSchemaType } from "./constants"
