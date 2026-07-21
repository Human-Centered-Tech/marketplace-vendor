import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Form } from "../../../../components/common/form"
import { InlineTextField } from "../../../../components/common/inline-edit/inline-text-field"
import { CountrySelect } from "../../../../components/inputs/country-select"
import { ProductEditSchemaType } from "../constants"

type ProductEditAttributesSectionProps = {
  form: UseFormReturn<ProductEditSchemaType>
}

/**
 * Attribute fields (country of origin, material, dimensions, customs codes) as
 * stacked inline rows — no section heading of its own, so it drops cleanly into
 * the collapsible card. All optional; used for shipping-rate math and customs.
 */
export const ProductEditAttributesSection = ({
  form,
}: ProductEditAttributesSectionProps) => {
  const { t } = useTranslation()

  return (
    <>
      <Form.Field
        control={form.control}
        name="origin_country"
        render={({ field }) => (
          <Form.Item className="px-6 py-4">
            <Form.Label optional>
              {t("products.fields.countryOrigin.label", "Country of origin")}
            </Form.Label>
            <Form.Control>
              <CountrySelect {...field} />
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />
      <InlineTextField
        control={form.control}
        name="material"
        label={t("products.fields.material.label", "Material")}
        optional
        stacked
      />
      <InlineTextField
        control={form.control}
        name="width"
        label={t("products.fields.width.label", "Width")}
        optional
        stacked
        inputProps={{ inputMode: "numeric" }}
      />
      <InlineTextField
        control={form.control}
        name="length"
        label={t("products.fields.length.label", "Length")}
        optional
        stacked
        inputProps={{ inputMode: "numeric" }}
      />
      <InlineTextField
        control={form.control}
        name="height"
        label={t("products.fields.height.label", "Height")}
        optional
        stacked
        inputProps={{ inputMode: "numeric" }}
      />
      <InlineTextField
        control={form.control}
        name="weight"
        label={t("products.fields.weight.label", "Weight")}
        optional
        stacked
        inputProps={{ inputMode: "numeric" }}
      />
      <InlineTextField
        control={form.control}
        name="mid_code"
        label={t("products.fields.mid_code.label", "MID code")}
        optional
        stacked
      />
      <InlineTextField
        control={form.control}
        name="hs_code"
        label={t("products.fields.hs_code.label", "HS code")}
        optional
        stacked
      />
    </>
  )
}
