import { Container, Heading, Text } from "@medusajs/ui"
import { Pencil } from "@medusajs/icons"
import { useTranslation } from "react-i18next"

import { StoreVendor } from "../../../../../types/user"
import { ActionMenu } from "../../../../../components/common/action-menu"

// Service-business replacement for StoreGeneralSection + CompanySection.
// Business Owners have no storefront, so the merchant split ("Store" vs
// "Company") and the storefront-only fields (logo, description, cover,
// shipping & return policy) don't apply — one "Business" card covers the
// contact + mailing details a directory listing needs. The two edit actions
// reuse the existing drawers: `edit` saves name/email/phone (the
// storefront-only fields are hidden there in service mode) and
// `edit-company` saves the mailing address + tax ID.
export const BusinessSection = ({ seller }: { seller: StoreVendor }) => {
  const { t } = useTranslation()

  const rows: Array<{ label: string; value: string | null | undefined }> = [
    { label: t("fields.name"), value: seller.name },
    { label: t("fields.email"), value: seller.email },
    { label: t("fields.phone"), value: seller.phone },
    { label: "Address", value: seller.address_line },
    { label: "Postal Code", value: seller.postal_code },
    { label: "City", value: seller.city },
    { label: "Country", value: seller.country_code },
    { label: "TaxID", value: seller.tax_id },
  ]

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>Business</Heading>
          <Text size="small" className="text-ui-fg-subtle text-pretty">
            Manage your business's contact details and mailing address
          </Text>
        </div>
        <ActionMenu
          groups={[
            {
              actions: [
                {
                  icon: <Pencil />,
                  label: "Edit contact details",
                  to: "edit",
                },
                {
                  icon: <Pencil />,
                  label: "Edit mailing address",
                  to: "edit-company",
                },
              ],
            },
          ]}
        />
      </div>
      {rows.map(({ label, value }) => (
        <div
          key={label}
          className="text-ui-fg-subtle grid grid-cols-2 px-6 py-4"
        >
          <Text size="small" leading="compact" weight="plus">
            {label}
          </Text>
          <Text size="small" leading="compact">
            {value || "-"}
          </Text>
        </div>
      ))}
    </Container>
  )
}
