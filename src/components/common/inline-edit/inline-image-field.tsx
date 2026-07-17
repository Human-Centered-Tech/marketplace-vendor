import { Control, FieldValues, Path } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Form } from "../form"
import { FileType, FileUpload } from "../file-upload"
import { SUPPORTED_FORMATS } from "./constants"

interface InlineImageFieldProps<T extends FieldValues> {
  control: Control<T>
  /** Field-array name backing this image, e.g. "media" | "cover_media". */
  name: Path<T>
  label: string
  hint?: string
  optional?: boolean
  /** Existing saved image URL (seller.photo / stored cover) for the preview. */
  currentImageUrl?: string
  /** Live preview from a freshly-picked file, if any (fields[0]?.url). */
  previewUrl?: string
  formats?: string[]
  onUploaded: (files: FileType[]) => void
  /** When provided (and an image is present) renders a "Remove" affordance. */
  onRemove?: () => void
  removeLabel?: string
  hasError?: boolean
}

/**
 * Inline-editable image row wrapping {@link FileUpload} in the standard
 * label/value grid. The actual upload is deferred to form submit — this only
 * captures the picked File into the form's media array (via `onUploaded`),
 * matching the "only upload files with size > 0" convention the host handler
 * relies on to tell a new pick from a pre-existing URL.
 */
export const InlineImageField = <T extends FieldValues>({
  control,
  name,
  label,
  hint,
  optional,
  currentImageUrl,
  previewUrl,
  formats = SUPPORTED_FORMATS,
  onUploaded,
  onRemove,
  removeLabel,
  hasError,
}: InlineImageFieldProps<T>) => {
  const { t } = useTranslation()
  const shownImage = previewUrl || currentImageUrl || ""

  return (
    <Form.Field
      control={control}
      name={name}
      render={() => (
        // Image rows stack vertically (label/hint on top, full-width dropzone
        // below) rather than the 2-column label/value layout used by text
        // rows — the dropzone is too large to sit comfortably in a half-width
        // column.
        <Form.Item className="px-6 py-4">
          <div className="flex flex-col gap-y-1">
            <Form.Label optional={optional}>{label}</Form.Label>
            {hint && <span className="text-ui-fg-subtle text-xs">{hint}</span>}
          </div>
          <Form.Control>
            <FileUpload
              uploadedImage={shownImage}
              multiple={false}
              label={t("products.media.uploadImagesLabel")}
              hint={t("products.media.uploadImagesHint")}
              hasError={hasError}
              formats={formats}
              onUploaded={onUploaded}
            />
          </Form.Control>
          {onRemove && shownImage && (
            <button
              type="button"
              onClick={onRemove}
              className="text-ui-fg-subtle hover:text-ui-fg-base text-xs underline self-start"
            >
              {removeLabel ?? t("actions.remove", "Remove")}
            </button>
          )}
          <Form.ErrorMessage />
        </Form.Item>
      )}
    />
  )
}
