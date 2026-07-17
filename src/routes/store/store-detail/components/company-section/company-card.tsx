import { Control } from "react-hook-form"

import {
  InlineEditCard,
  InlineTextField,
} from "../../../../../components/common/inline-edit"
import { StoreSettingsSchemaType } from "../../constants"

interface InlineCompanyCardProps {
  control: Control<StoreSettingsSchemaType>
}

/**
 * Merchant "Company" card, edited inline. Replaces the old read-only
 * CompanySection + its edit drawer. Tax ID is intentionally omitted — it is
 * collected by Stripe in the Stripe Connect flow, not here.
 */
export const InlineCompanyCard = ({ control }: InlineCompanyCardProps) => {
  return (
    <InlineEditCard title="Company" description="Manage your company's details">
      <InlineTextField control={control} name="address_line" label="Address" />
      <InlineTextField
        control={control}
        name="postal_code"
        label="Postal Code"
      />
      <InlineTextField control={control} name="city" label="City" />
      <InlineTextField
        control={control}
        name="country_code"
        label="Country"
      />
    </InlineEditCard>
  )
}
