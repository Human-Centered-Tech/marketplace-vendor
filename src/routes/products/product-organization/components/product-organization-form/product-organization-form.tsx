import { ExtendedAdminProduct } from "../../../../../types/products"
import { Button, toast } from "@medusajs/ui"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import * as zod from "zod"

import { Form } from "../../../../../components/common/form"
import { Combobox } from "../../../../../components/inputs/combobox"
import { RouteDrawer, useRouteModal } from "../../../../../components/modals"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import {
  FormExtensionZone,
  useDashboardExtension,
  useExtendableForm,
} from "../../../../../extensions"
import { useUpdateProduct } from "../../../../../hooks/api/products"
import { useCreateProductTag } from "../../../../../hooks/api/tags"
import {
  useProductVendorTags,
  useSetProductVendorTags,
} from "../../../../../hooks/api/product-vendor-tags"
import { useComboboxData } from "../../../../../hooks/use-combobox-data"
import { fetchQuery } from "../../../../../lib/client"

type ProductOrganizationFormProps = {
  product: ExtendedAdminProduct
}

const ProductOrganizationSchema = zod.object({
  type_id: zod.string().nullable(),
  collection_id: zod.string().nullable(),
  category_ids: zod.string().nullable(),
  // category_ids: zod.array(zod.string()),
  tag_ids: zod.array(zod.string()),
})

export const ProductOrganizationForm = ({
  product,
}: ProductOrganizationFormProps) => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()
  const { getFormConfigs, getFormFields } = useDashboardExtension()

  const configs = getFormConfigs("product", "organize")
  const fields = getFormFields("product", "organize")

  const categories = useComboboxData({
    queryKey: ["product_categories"],
    queryFn: (params) =>
      fetchQuery("/vendor/product-categories", {
        method: "GET",
        query: params as Record<string, string | number>,
      }),
    getOptions: (data) =>
      data.product_categories.map((category: any) => ({
        label: category.name!,
        value: category.id!,
      })),
  })

  const collections = useComboboxData({
    queryKey: ["product_collections"],
    queryFn: (params) =>
      fetchQuery("/vendor/product-collections", {
        method: "GET",
        query: params as Record<string, string | number>,
      }),
    getOptions: (data) =>
      data.product_collections.map((collection: any) => ({
        label: collection.title!,
        value: collection.id!,
      })),
  })

  const types = useComboboxData({
    queryKey: ["product_types"],
    queryFn: (params) =>
      fetchQuery("/vendor/product-types", {
        method: "GET",
        query: params as { [key: string]: string | number },
      }),
    getOptions: (data) =>
      data.product_types.map((type: any) => ({
        label: type.value,
        value: type.id,
      })),
  })

  const tags = useComboboxData({
    queryKey: ["product_tags"],
    queryFn: (params) =>
      fetchQuery("/vendor/product-tags", {
        method: "GET",
        query: params as { [key: string]: string | number },
      }),
    getOptions: (data) =>
      data.product_tags.map((tag: any) => ({
        label: tag.label || tag.value,
        value: tag.id,
      })),
  })

  const { product_tags: productVendorTags } = useProductVendorTags(product.id)

  const form = useExtendableForm({
    defaultValues: {
      type_id: product.type_id ?? "",
      collection_id: product.collection_id ?? "",
      category_ids: product.categories?.[0]?.id || "",
      tag_ids: productVendorTags?.map((t) => t.id) || [],
    },
    schema: ProductOrganizationSchema,
    configs: configs,
    data: product,
  })

  // Reset tag_ids once the vendor-tags query resolves (fetch is async).
  // Use reset (not setValue) so the field is not marked as dirty.
  useEffect(() => {
    if (productVendorTags) {
      form.resetField("tag_ids", {
        defaultValue: productVendorTags.map((t) => t.id),
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productVendorTags?.map((t) => t.id).join(",")])

  const { mutateAsync: updateProduct, isPending: isUpdating } = useUpdateProduct(
    product.id
  )
  const { mutateAsync: setVendorTags, isPending: isSettingTags } =
    useSetProductVendorTags(product.id)
  const { mutateAsync: createTag } = useCreateProductTag()

  const handleCreateTag = async () => {
    const value = tags.searchValue?.trim()
    if (!value) return
    try {
      const result: any = await createTag({ value })
      const newId = result?.product_tag?.id
      if (newId) {
        const current = form.getValues("tag_ids") ?? []
        const cleaned = current.filter((id) => id !== value && id !== newId)
        cleaned.push(newId)
        form.setValue("tag_ids", cleaned)
      }
    } catch (error: any) {
      const current = form.getValues("tag_ids") ?? []
      form.setValue(
        "tag_ids",
        current.filter((id) => id !== value)
      )
      toast.error(error.message)
    }
  }

  const handleSubmit = form.handleSubmit(async (data) => {
    const dirty = form.formState.dirtyFields
    const productPayload: Record<string, any> = {}
    if (dirty.type_id) productPayload.type_id = data.type_id || null
    if (dirty.collection_id)
      productPayload.collection_id = data.collection_id || null
    if (dirty.category_ids) {
      productPayload.categories = data.category_ids
        ? [{ id: data.category_ids }]
        : []
    }

    const tasks: Promise<unknown>[] = []
    if (Object.keys(productPayload).length > 0) {
      tasks.push(updateProduct(productPayload))
    }
    if (dirty.tag_ids) {
      tasks.push(setVendorTags({ tag_ids: data.tag_ids ?? [] }))
    }

    if (tasks.length === 0) {
      handleSuccess()
      return
    }

    try {
      await Promise.all(tasks)
      toast.success(
        t("products.organization.edit.toasts.success", {
          title: product.title,
        })
      )
      handleSuccess()
    } catch (error: any) {
      toast.error(error.message)
    }
  })

  const isPending = isUpdating || isSettingTags

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm onSubmit={handleSubmit} className="flex h-full flex-col">
        <RouteDrawer.Body>
          <div className="flex h-full flex-col gap-y-4">
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
            <Form.Field
              control={form.control}
              name="collection_id"
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Label optional>
                      {t("products.fields.collection.label")}
                    </Form.Label>
                    <Form.Control>
                      <Combobox
                        {...field}
                        multiple={false}
                        options={collections.options}
                        onSearchValueChange={collections.onSearchValueChange}
                        searchValue={collections.searchValue}
                      />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />
            <Form.Field
              control={form.control}
              name="category_ids"
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Label optional>
                      {t("products.fields.categories.label")}
                    </Form.Label>
                    <Form.Control>
                      {/* <CategoryCombobox {...field} /> */}
                      <Combobox
                        {...field}
                        multiple={false}
                        options={categories.options}
                        onSearchValueChange={categories.onSearchValueChange}
                        searchValue={categories.searchValue}
                      />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />
            <Form.Field
              control={form.control}
              name="tag_ids"
              render={({ field }) => {
                return (
                  <Form.Item>
                    <Form.Label optional>
                      {t("products.fields.tags.label")}
                    </Form.Label>
                    <Form.Control>
                      <Combobox
                        {...field}
                        multiple
                        options={tags.options}
                        onSearchValueChange={tags.onSearchValueChange}
                        searchValue={tags.searchValue}
                        onCreateOption={handleCreateTag}
                      />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }}
            />
            <FormExtensionZone fields={fields} form={form} />
          </div>
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary">
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>
            <Button size="small" type="submit" isLoading={isPending}>
              {t("actions.save")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}
