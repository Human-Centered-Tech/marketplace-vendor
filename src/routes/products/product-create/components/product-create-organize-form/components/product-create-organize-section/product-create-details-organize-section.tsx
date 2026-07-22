import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { toast } from "@medusajs/ui"
import { Form } from "../../../../../../../components/common/form"
import { SwitchBox } from "../../../../../../../components/common/switch-box"
import { Combobox } from "../../../../../../../components/inputs/combobox"
import { useCreateProductTag } from "../../../../../../../hooks/api/tags"
import { useComboboxData } from "../../../../../../../hooks/use-combobox-data"
import { fetchQuery } from "../../../../../../../lib/client"
import { ProductCreateSchemaType } from "../../../../types"
import { CategoryCombobox } from "../../../../../common/components/category-combobox"
import { SelectedOrganizeSummary } from "../../../../../common/components/selected-organize-summary"

type ProductCreateOrganizationSectionProps = {
  form: UseFormReturn<ProductCreateSchemaType>
}

export const ProductCreateOrganizationSection = ({
  form,
}: ProductCreateOrganizationSectionProps) => {
  const { t } = useTranslation()

  const types = useComboboxData({
    queryKey: ["product_types", "creating"],
    queryFn: (params) =>
      fetchQuery("/vendor/product-types", {
        method: "GET",
        query: params,
      }),
    getOptions: (data) =>
      data.product_types.map((type: any) => ({
        label: type.value,
        value: type.id,
      })),
  })

  const tags = useComboboxData({
    queryKey: ["product_tags", "creating"],
    queryFn: (params) =>
      fetchQuery("/vendor/product-tags", {
        method: "GET",
        query: params,
      }),
    getOptions: (data) =>
      data.product_tags.map((tag: any) => ({
        label: tag.label || tag.value,
        value: tag.id,
      })),
  })

  const { mutateAsync: createTag } = useCreateProductTag()

  const handleCreateTag = async () => {
    const value = tags.searchValue?.trim()
    if (!value) return
    try {
      const result: any = await createTag({ value })
      const newId = result?.product_tag?.id
      if (newId) {
        const current = form.getValues("tags") ?? []
        const cleaned = current.filter((id) => id !== value && id !== newId)
        cleaned.push(newId)
        form.setValue("tags", cleaned)
      }
    } catch (error: any) {
      const current = form.getValues("tags") ?? []
      form.setValue(
        "tags",
        current.filter((id) => id !== value)
      )
      toast.error(error.message)
    }
  }

  return (
    <div id="organize" className="flex flex-col gap-y-8">
      <SwitchBox
        control={form.control}
        name="discountable"
        label={t("products.fields.discountable.label")}
        description={t("products.fields.discountable.hint")}
        optional
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Form.Field
          control={form.control}
          name="type_id"
          render={({ field }) => {
            return (
              <Form.Item>
                <Form.Label optional>
                  {t("products.fields.type.label")}
                </Form.Label>
                <Form.Control>
                  <Combobox
                    {...field}
                    options={types.options}
                    searchValue={types.searchValue}
                    onSearchValueChange={types.onSearchValueChange}
                    fetchNextPage={types.fetchNextPage}
                  />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )
          }}
        />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_minmax(200px,260px)]">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Form.Field
            control={form.control}
            name="categories"
            render={({ field }) => {
              return (
                <Form.Item>
                  <Form.Label optional>
                    {t("products.fields.categories.label")}
                  </Form.Label>
                  <Form.Control>
                    <CategoryCombobox {...field} maxSelected={3} />
                    {/* <CategorySelect  /> */}
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )
            }}
          />
          <Form.Field
            control={form.control}
            name="tags"
            render={({ field }) => {
              return (
                <Form.Item>
                  <Form.Label optional>
                    {t("products.fields.tags.label")}
                  </Form.Label>
                  <Form.Control>
                    <Combobox
                      {...field}
                      options={tags.options}
                      searchValue={tags.searchValue}
                      onSearchValueChange={tags.onSearchValueChange}
                      fetchNextPage={tags.fetchNextPage}
                      onCreateOption={handleCreateTag}
                    />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )
            }}
          />
        </div>
        {/* Live view of what's picked, so both category + tag selections are
            visible (and removable) without reopening either combobox. */}
        <SelectedOrganizeSummary form={form} />
      </div>
    </div>
  )
}
