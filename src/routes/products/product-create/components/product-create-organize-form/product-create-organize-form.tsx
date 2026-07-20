import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { InlineEditCard } from "../../../../../components/common/inline-edit"
import {
  FormExtensionZone,
  useDashboardExtension,
} from "../../../../../extensions"
import { ProductCreateSchemaType } from "../../types"
import { ProductCreateOrganizationSection } from "./components/product-create-organize-section"
import { ProductCreateSalesChannelStackedModal } from "./components/product-create-sales-channel-stacked-modal"

type ProductAttributesProps = {
  form: UseFormReturn<ProductCreateSchemaType>
}

export const ProductCreateOrganizeForm = ({ form }: ProductAttributesProps) => {
  const { t } = useTranslation()
  const { getFormFields } = useDashboardExtension()
  const fields = getFormFields("product", "create", "organize")

  return (
    <InlineEditCard title={t("products.organization.header")}>
      <div className="flex flex-col gap-y-6 px-6 py-4">
        <ProductCreateOrganizationSection form={form} />
        <FormExtensionZone fields={fields} form={form} />
        <ProductCreateSalesChannelStackedModal form={form} />
      </div>
    </InlineEditCard>
  )
}
