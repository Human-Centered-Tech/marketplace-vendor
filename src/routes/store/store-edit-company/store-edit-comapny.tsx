import { Heading } from "@medusajs/ui"
import { RouteDrawer } from "../../../components/modals"
import { useMe } from "../../../hooks/api"
import { useSetup } from "../../../hooks/api/setup"
import { EditStoreCompanyForm } from "./components/edit-store-company-form"

export const StoreEditCompany = () => {
  const { seller, isPending: isLoading, isError, error } = useMe()

  // Service businesses reach this drawer as "Edit mailing address" from the
  // merged Business card — mirror that label here.
  const { data: setup } = useSetup()
  const isService = setup?.is_service === true

  if (isError) {
    throw error
  }

  const ready = !!seller && !isLoading
  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <Heading>{isService ? "Edit mailing address" : "Edit Company"}</Heading>
      </RouteDrawer.Header>
      {ready && <EditStoreCompanyForm seller={seller} />}
    </RouteDrawer>
  )
}
