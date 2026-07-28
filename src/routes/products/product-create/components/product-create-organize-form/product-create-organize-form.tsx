import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { InlineEditCard } from "../../../../../components/common/inline-edit"
import {
  FormExtensionZone,
  useDashboardExtension,
} from "../../../../../extensions"
import { ProductCreateSchemaType } from "../../types"
import { ProductCreateOrganizationSection } from "./components/product-create-organize-section"

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
        {/*
          Sales-channel picker deliberately not rendered. There is exactly one
          sales channel in every environment ("Default Sales Channel") and
          vendors have no way to create more (no sales-channels nav entry), so
          the picker was a one-row table that could only be got wrong: clearing
          it made normalizeProductFormValues omit sales_channels entirely, and
          nothing backfills the store default — the product would be created
          invisible on the storefront.

          The `sales_channels` form field and its default seed (see
          product-create-form.tsx) are intentionally kept, so the create payload
          still carries the channel. If a second channel is ever added, restore
          <ProductCreateSalesChannelStackedModal form={form} /> here.
        */}
      </div>
    </InlineEditCard>
  )
}
