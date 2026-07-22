import { Input } from "@medusajs/ui"
import { RichTextEditor } from "../../../../../../../components/common/rich-text-editor/rich-text-editor"
import { UseFormReturn, useWatch } from "react-hook-form"
import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"

import { Form } from "../../../../../../../components/common/form"
import { HandleInput } from "../../../../../../../components/inputs/handle-input"
import { ProductCreateSchemaType } from "../../../../types"

type ProductCreateGeneralSectionProps = {
  form: UseFormReturn<ProductCreateSchemaType>
}

// URL-safe kebab-case handle from a free-text title.
const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

export const ProductCreateGeneralSection = ({
  form,
}: ProductCreateGeneralSectionProps) => {
  const { t } = useTranslation()

  // Auto-fill the handle from the title until the vendor edits it by hand.
  const title = useWatch({ control: form.control, name: "title" })
  const handleManuallyEdited = useRef(false)

  useEffect(() => {
    if (handleManuallyEdited.current) return
    form.setValue("handle", slugify(title || ""))
    // Only react to title changes; setValue is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title])

  return (
    <div id="general" className="flex flex-col gap-y-6">
      <div className="flex flex-col gap-y-2">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Form.Field
            control={form.control}
            name="title"
            render={({ field }) => {
              return (
                <Form.Item>
                  <Form.Label>{t("products.fields.title.label")}</Form.Label>
                  <Form.Control>
                    <Input {...field} placeholder="Winter jacket" />
                  </Form.Control>
                </Form.Item>
              )
            }}
          />
          <Form.Field
            control={form.control}
            name="subtitle"
            render={({ field }) => {
              return (
                <Form.Item>
                  <Form.Label optional>
                    {t("products.fields.subtitle.label")}
                  </Form.Label>
                  <Form.Control>
                    <Input {...field} placeholder="Warm and cosy" />
                  </Form.Control>
                </Form.Item>
              )
            }}
          />
          <Form.Field
            control={form.control}
            name="handle"
            render={({ field }) => {
              return (
                <Form.Item>
                  <Form.Label
                    tooltip={t("products.fields.handle.tooltip")}
                    optional
                  >
                    {t("fields.handle")}
                  </Form.Label>
                  <Form.Control>
                    <HandleInput
                      {...field}
                      onChange={(e) => {
                        handleManuallyEdited.current = true
                        field.onChange(e)
                      }}
                      placeholder="winter-jacket"
                    />
                  </Form.Control>
                </Form.Item>
              )
            }}
          />
        </div>
      </div>
      <Form.Field
        control={form.control}
        name="description"
        render={({ field }) => {
          return (
            <Form.Item>
              <Form.Label optional>
                {t("products.fields.description.label")}
              </Form.Label>
              <Form.Control>
                <RichTextEditor
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="A warm and cozy jacket"
                />
              </Form.Control>
            </Form.Item>
          )
        }}
      />
    </div>
  )
}
