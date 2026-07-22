import { Control } from "react-hook-form"
import { useTranslation } from "react-i18next"

import {
  InlineEditCard,
  InlineTextField,
} from "../../../../../components/common/inline-edit"
import { StoreSettingsSchemaType } from "../../constants"

interface InlineBusinessCardProps {
  control: Control<StoreSettingsSchemaType>
}

/**
 * Service-business "Business" card, edited inline. Replaces the old read-only
 * BusinessSection + its two edit drawers. Service businesses have no
 * storefront, so the merchant Store/Company split and storefront-only fields
 * (logo, cover, description, refund policy) don't apply — one card covers the
 * contact + mailing details a directory listing needs. Tax ID is omitted (see
 * InlineCompanyCard).
 */
export const InlineBusinessCard = ({ control }: InlineBusinessCardProps) => {
  const { t } = useTranslation()

  return (
    <InlineEditCard
      title="Business"
      description="Manage your business's contact details and mailing address"
    >
      <InlineTextField control={control} name="name" label={t("fields.name")} />
      <InlineTextField
        control={control}
        name="email"
        label={t("fields.email")}
        type="email"
      />
      <InlineTextField
        control={control}
        name="phone"
        label={t("fields.phone")}
        type="tel"
      />
      <InlineTextField control={control} name="address_line" label="Address" />
      <InlineTextField
        control={control}
        name="postal_code"
        label="Postal Code"
      />
      <InlineTextField control={control} name="city" label="City" />
      <InlineTextField control={control} name="country_code" label="Country" />
    </InlineEditCard>
  )
}
