import { Container, Heading, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

export const LocationListHeader = () => {
  const { t } = useTranslation()

  return (
    <Container className="flex h-fit items-center justify-between gap-x-4 px-6 py-4">
      <div>
        <Heading>{t("stockLocations.domain")}</Heading>
        <Text className="text-ui-fg-subtle txt-small">
          {t("stockLocations.list.description")}
        </Text>
      </div>
      {/*
        No Create button. A seller gets exactly one stock location, provisioned
        for them (ensureSellerFreeShipping) — extra ones only ever caused
        confusion: the two prod sellers who made a second had zero stock and
        zero shipping options on it, but their new products' stock still had to
        pick a location. The create route is unregistered too; the form under
        routes/locations/location-create is left in place, unrendered.
      */}
    </Container>
  )
}
