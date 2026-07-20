import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { InlineEditCard } from "../../../../../components/common/inline-edit"
import { ProductCreateSchemaType } from "../../types"
import { ProductCreateInventoryKitSection } from "./components/product-create-inventory-kit-section/product-create-inventory-kit-section"

type ProductAttributesProps = {
  form: UseFormReturn<ProductCreateSchemaType>
}

export const ProductCreateInventoryKitForm = ({
  form,
}: ProductAttributesProps) => {
  const { t } = useTranslation()

  return (
    <InlineEditCard title={t("products.create.tabs.inventory")}>
      <div className="px-6 py-4">
        <ProductCreateInventoryKitSection form={form} />
      </div>
    </InlineEditCard>
  )
}
