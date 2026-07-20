import { HttpTypes } from "@medusajs/types"
import { Button, toast, usePrompt } from "@medusajs/ui"
import { useMemo } from "react"
import { UseFormReturn, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { InlineEditCard } from "../../../../components/common/inline-edit"
import { InlineTextField } from "../../../../components/common/inline-edit/inline-text-field"
import { useDeleteVariantLazy } from "../../../../hooks/api/products"
import { ProductCreatePriceField } from "../../product-create/components/product-create-variants-pricing-section/product-create-price-field"
import { ProductEditSchemaType } from "../constants"

type ProductEditVariantsSectionProps = {
  form: UseFormReturn<ProductEditSchemaType>
  productId: string
  store?: HttpTypes.AdminStore
}

/**
 * Per-variant editing on an existing product: title / SKU / USD price, plus an
 * explicit Remove (delete) with confirmation. Deletion is immediate against the
 * variant endpoint — no permutation checkboxes, so a variant is only ever
 * removed when the vendor explicitly asks. The last variant can't be removed
 * (a product always needs one).
 */
export const ProductEditVariantsSection = ({
  form,
  productId,
  store,
}: ProductEditVariantsSectionProps) => {
  const { t } = useTranslation()
  const prompt = usePrompt()
  const { mutateAsync: deleteVariant } = useDeleteVariantLazy(productId)

  const currencyCodes = useMemo(
    () => store?.supported_currencies?.map((c) => c.currency_code) ?? [],
    [store]
  )

  const variants = useWatch({
    control: form.control,
    name: "variants",
    defaultValue: [],
  })

  const options = useWatch({
    control: form.control,
    name: "options",
    defaultValue: [],
  })

  // Carry originalIndex so field paths stay `variants.${originalIndex}.…`.
  const variantData = useMemo(() => {
    const ret: Array<
      ProductEditSchemaType["variants"][number] & { originalIndex: number }
    > = []
    variants.forEach((v, i) => {
      if (v.should_create) {
        ret.push({ ...v, originalIndex: i })
      }
    })
    return ret
  }, [variants])

  const isMulti = variantData.length > 1

  const handleRemove = async (variantId: string, title: string) => {
    const confirmed = await prompt({
      title: "Remove variant?",
      description: `"${title}" and its SKU, price, and stock will be permanently removed. This can't be undone.`,
      confirmText: t("actions.delete", "Remove"),
      cancelText: t("actions.cancel", "Cancel"),
    })
    if (!confirmed) {
      return
    }
    try {
      await deleteVariant({ variantId })
      toast.success(`Removed "${title}".`)
    } catch (err) {
      toast.error(
        `Couldn't remove the variant: ${
          err instanceof Error ? err.message : "unknown error"
        }`
      )
    }
  }

  return (
    <div className="flex flex-col gap-y-3">
      {variantData.map((v, idx) => {
        const comboLabel = options
          .map((o) => v.options?.[o.title])
          .filter(Boolean)
          .join(" / ")
        const cardTitle = isMulti
          ? comboLabel || `${t("fields.variant", "Variant")} ${idx + 1}`
          : "Pricing"

        return (
          <InlineEditCard key={v.id} title={cardTitle}>
            <InlineTextField
              control={form.control}
              name={`variants.${v.originalIndex}.title`}
              label={t("fields.title")}
              stacked
            />
            <InlineTextField
              control={form.control}
              name={`variants.${v.originalIndex}.sku`}
              label={t("fields.sku")}
              optional
              stacked
            />
            {currencyCodes.map((code) => (
              <ProductCreatePriceField
                key={code}
                control={form.control as any}
                name={`variants.${v.originalIndex}.prices.${code}`}
                code={code}
                stacked
              />
            ))}
            <div className="flex justify-end px-6 py-3">
              <Button
                type="button"
                variant="secondary"
                size="small"
                disabled={!isMulti}
                onClick={() => handleRemove(v.id, cardTitle)}
              >
                {t("products.variants.actions.remove", "Remove variant")}
              </Button>
            </div>
          </InlineEditCard>
        )
      })}
    </div>
  )
}
