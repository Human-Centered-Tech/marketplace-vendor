import { Button, Text } from "@medusajs/ui"
import { FieldValues, UseFormReturn, useFormState } from "react-hook-form"
import { useTranslation } from "react-i18next"

interface StickySaveBarProps<T extends FieldValues> {
  /** The page-level form. Used to read dirty state and to reset on discard. */
  form: UseFormReturn<T>
  /** External mutation pending flag (e.g. useUpdateMe().isPending). */
  isSubmitting?: boolean
  /** Defaults to form.reset() — reverts every field to the pristine baseline. */
  onDiscard?: () => void
  saveLabel?: string
  discardLabel?: string
  /**
   * Optional second submit button rendered before the primary Save (e.g. a
   * "Save as draft" alongside "Create Product"). `dataName` is set as the
   * button's `data-name` so the host onSubmit can read
   * `e.nativeEvent.submitter?.dataset.name` to branch. Omit for a single-action
   * bar (unchanged behavior).
   */
  secondaryAction?: {
    label: string
    dataName: string
    isLoading?: boolean
  }
}

/**
 * Page-level save/discard bar for the inline-edit pattern. Renders nothing
 * until the form is dirty, then pins to the bottom of the scroll viewport.
 *
 * Positioned `sticky bottom-0` as the LAST child of the page column so it
 * respects the sidebar width and the layout's max-width centering (a `fixed`
 * bar would ignore both). Save is a real submit button, so it triggers the
 * host form's onSubmit without extra wiring.
 */
export const StickySaveBar = <T extends FieldValues>({
  form,
  isSubmitting = false,
  onDiscard,
  saveLabel,
  discardLabel,
  secondaryAction,
}: StickySaveBarProps<T>) => {
  const { t } = useTranslation()
  // Subscribe to dirty state so the bar toggles as the user edits.
  const { isDirty } = useFormState({ control: form.control })

  if (!isDirty) {
    return null
  }

  return (
    <div className="sticky bottom-0 z-10 pt-3">
      <div className="bg-ui-bg-base shadow-elevation-flyout flex items-center justify-between gap-x-3 rounded-lg border px-4 py-3">
        <Text size="small" className="text-ui-fg-subtle">
          {t("general.unsavedChangesArePresent", "You have unsaved changes")}
        </Text>
        <div className="flex items-center gap-x-2">
          <Button
            size="small"
            variant="secondary"
            type="button"
            disabled={isSubmitting}
            onClick={() => (onDiscard ? onDiscard() : form.reset())}
          >
            {discardLabel ?? t("actions.discard", "Discard")}
          </Button>
          {secondaryAction && (
            <Button
              size="small"
              variant="secondary"
              type="submit"
              data-name={secondaryAction.dataName}
              isLoading={secondaryAction.isLoading}
              disabled={isSubmitting}
            >
              {secondaryAction.label}
            </Button>
          )}
          <Button size="small" type="submit" isLoading={isSubmitting}>
            {saveLabel ?? t("actions.save")}
          </Button>
        </div>
      </div>
    </div>
  )
}
