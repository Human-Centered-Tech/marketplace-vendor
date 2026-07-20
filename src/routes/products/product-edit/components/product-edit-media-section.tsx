import { StackPerspective, ThumbnailBadge, Trash } from "@medusajs/icons"
import { IconButton, Text, Tooltip, clx } from "@medusajs/ui"
import { UseFormReturn, useFieldArray } from "react-hook-form"

import { InlineEditCard } from "../../../../components/common/inline-edit"
import { ProductCreateSchemaType } from "../../product-create/types"
import { UploadMediaFormItem } from "../../common/components/upload-media-form-item"
import { ProductEditSchemaType } from "../constants"

type ProductEditMediaSectionProps = {
  form: UseFormReturn<ProductEditSchemaType>
}

/**
 * Inline media editor for the edit page. Unlike the create media section
 * (which only renders freshly-picked files), this shows the product's existing
 * images too, and lets you remove any image or pick the thumbnail. New picks
 * are uploaded on save; existing images keep their url.
 */
export const ProductEditMediaSection = ({
  form,
}: ProductEditMediaSectionProps) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "media",
    keyName: "field_id",
  })

  const makeThumbnail = (index: number) => {
    form.setValue(
      "media",
      fields.map((field, i) => ({
        id: field.id,
        url: field.url,
        file: field.file ?? null,
        isThumbnail: i === index,
      })),
      { shouldDirty: true, shouldTouch: true }
    )
  }

  // The shared uploader is typed against the create schema; media is a
  // compatible field on both.
  const uploaderForm = form as unknown as UseFormReturn<ProductCreateSchemaType>

  return (
    <InlineEditCard
      title="Media"
      description="Upload images, remove them, and choose a thumbnail."
    >
      <div className="flex flex-col gap-y-4 px-6 py-4">
        <UploadMediaFormItem
          form={uploaderForm}
          append={append}
          showHint={false}
        />

        {fields.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            No images yet.
          </Text>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {fields.map((field, index) => (
              <div
                key={field.field_id}
                className={clx(
                  "bg-ui-bg-subtle group relative aspect-square overflow-hidden rounded-lg border"
                )}
              >
                {field.isThumbnail && (
                  <div className="absolute left-2 top-2 z-10">
                    <Tooltip content="Thumbnail">
                      <ThumbnailBadge />
                    </Tooltip>
                  </div>
                )}
                <img
                  src={field.url}
                  alt=""
                  className="size-full object-cover object-center"
                />
                <div className="absolute right-2 top-2 z-10 flex gap-x-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  {!field.isThumbnail && (
                    <Tooltip content="Make thumbnail">
                      <IconButton
                        type="button"
                        size="small"
                        variant="primary"
                        onClick={() => makeThumbnail(index)}
                      >
                        <StackPerspective />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip content="Remove">
                    <IconButton
                      type="button"
                      size="small"
                      variant="primary"
                      onClick={() => remove(index)}
                    >
                      <Trash />
                    </IconButton>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </InlineEditCard>
  )
}
