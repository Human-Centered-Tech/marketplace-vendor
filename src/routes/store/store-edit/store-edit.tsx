import { Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { RouteDrawer } from "../../../components/modals"
import { EditStoreForm } from "./components/edit-store-form/edit-store-form"
import { useMe } from "../../../hooks/api"
import { useSetup } from "../../../hooks/api/setup"

export const StoreEdit = () => {
  const { t } = useTranslation()
  const { seller, isPending: isLoading, isError, error } = useMe()

  // Service businesses see this surface as "Business", not "Store".
  const { data: setup } = useSetup()
  const isService = setup?.is_service === true

  if (isError) {
    throw error
  }

  const ready = !!seller && !isLoading

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <Heading>
          {isService ? "Edit business" : t("store.edit.header")}
        </Heading>
      </RouteDrawer.Header>
      {ready && <EditStoreForm seller={seller} />}
    </RouteDrawer>
  )
}
