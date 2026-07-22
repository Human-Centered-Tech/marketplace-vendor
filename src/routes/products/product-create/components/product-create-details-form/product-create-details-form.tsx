import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { InlineEditCard } from "../../../../../components/common/inline-edit"
import {
  FormExtensionZone,
  useDashboardExtension,
} from "../../../../../extensions"
import { ProductCreateSchemaType } from "../../types"
import { ProductCreateGeneralSection } from "./components/product-create-details-general-section"
import { ProductCreateMediaSection } from "./components/product-create-details-media-section"
import { ProductCreateVariantsSection } from "./components/product-create-details-variant-section"

type ProductAttributesProps = {
  form: UseFormReturn<ProductCreateSchemaType>
}

export const ProductCreateDetailsForm = ({ form }: ProductAttributesProps) => {
  const { t } = useTranslation()
  const { getFormFields } = useDashboardExtension()
  const fields = getFormFields("product", "create", "general")

  return (
    <>
      <InlineEditCard title={t("products.create.header")}>
        <div className="flex flex-col gap-y-6 px-6 py-4">
          <ProductCreateGeneralSection form={form} />
          <FormExtensionZone fields={fields} form={form} />
        </div>
      </InlineEditCard>

      <InlineEditCard title={t("products.media.label")}>
        <div className="px-6 py-4">
          <ProductCreateMediaSection form={form} />
        </div>
      </InlineEditCard>

      <InlineEditCard title={t("products.create.variants.header")}>
        <div className="px-6 py-4">
          <ProductCreateVariantsSection form={form} />
        </div>
      </InlineEditCard>
    </>
  )
}
