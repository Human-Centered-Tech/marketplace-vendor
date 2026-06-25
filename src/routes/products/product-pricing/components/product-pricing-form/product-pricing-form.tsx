import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Input, Text, toast } from "@medusajs/ui"
import { useFieldArray, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import * as zod from "zod"

import { Form } from "../../../../../components/common/form"
import { RouteDrawer, useRouteModal } from "../../../../../components/modals"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import { useUpdateProductVariantsBatch } from "../../../../../hooks/api/products"
import {
  ExtendedAdminProduct,
  ExtendedAdminProductVariant,
} from "../../../../../types/products"

// Vendor catalog is USD-only today; amounts are stored in major units (dollars).
const CURRENCY_CODE = "usd"

const ProductPricingSchema = zod.object({
  variants: zod.array(
    zod.object({
      id: zod.string(),
      title: zod.string(),
      amount: zod.string().optional(),
    })
  ),
})

type ProductPricingSchemaType = zod.infer<typeof ProductPricingSchema>

const readUsdAmount = (variant: ExtendedAdminProductVariant): string => {
  const price = variant.prices?.find((p) => p.currency_code === CURRENCY_CODE)

  if (!price || price.amount == null) {
    return ""
  }

  return String(price.amount)
}

export const ProductPricingForm = ({
  product,
}: {
  product: ExtendedAdminProduct
}) => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()
  const { mutateAsync, isPending } = useUpdateProductVariantsBatch(product.id)

  const form = useForm<ProductPricingSchemaType>({
    defaultValues: {
      variants: (product.variants ?? []).map((variant) => ({
        id: variant.id,
        title: variant.title || variant.sku || "Variant",
        amount: readUsdAmount(variant),
      })),
    },
    resolver: zodResolver(ProductPricingSchema),
  })

  const { fields } = useFieldArray({
    control: form.control,
    name: "variants",
  })

  const handleSubmit = form.handleSubmit(async (data) => {
    // Only push variants whose price field has a value. Leaving a field blank
    // means "don't change this variant's price".
    const payload = data.variants
      .filter((v) => v.amount !== "" && v.amount != null)
      .map((v) => ({
        id: v.id,
        prices: [
          {
            currency_code: CURRENCY_CODE,
            amount: parseFloat(v.amount as string),
          },
        ],
      }))
      .filter((v) => !Number.isNaN(v.prices[0].amount))

    if (!payload.length) {
      handleSuccess()
      return
    }

    try {
      await mutateAsync(payload)
      toast.success("Pricing updated successfully")
      handleSuccess()
    } catch (error: any) {
      toast.error(error.message)
    }
  })

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm onSubmit={handleSubmit} className="flex h-full flex-col">
        <RouteDrawer.Body className="flex-1 overflow-auto">
          <div className="flex flex-col gap-y-4">
            {fields.map((field, index) => (
              <Form.Field
                key={field.id}
                control={form.control}
                name={`variants.${index}.amount`}
                render={({ field: inputField }) => (
                  <Form.Item>
                    <Form.Label>
                      {form.getValues(`variants.${index}.title`)}
                    </Form.Label>
                    <Form.Control>
                      <div className="relative">
                        <span className="text-ui-fg-muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm">
                          $
                        </span>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0.00"
                          className="pl-7"
                          {...inputField}
                        />
                      </div>
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
            ))}
          </div>
          <Text size="small" className="text-ui-fg-subtle mt-4">
            Prices are in US dollars. Leave a field blank to keep its current
            price.
          </Text>
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
