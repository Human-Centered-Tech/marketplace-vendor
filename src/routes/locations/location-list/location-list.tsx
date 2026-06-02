import { useLoaderData } from "react-router-dom"

import { useStockLocations } from "../../../hooks/api/stock-locations"
import LocationListItem from "./components/location-list-item/location-list-item"
import { LOCATION_LIST_FIELDS } from "./constants"
import { shippingListLoader } from "./loader"

import { TwoColumnPage } from "../../../components/layout/pages"
import { useDashboardExtension } from "../../../extensions"
import { LocationListHeader } from "./components/location-list-header"

export function LocationList() {
  const initialData = useLoaderData() as Awaited<
    ReturnType<typeof shippingListLoader>
  >

  const {
    stock_locations: stockLocations = [],
    isError,
    error,
  } = useStockLocations(
    {
      fields: LOCATION_LIST_FIELDS,
    },
    { initialData }
  )

  const { getWidgets } = useDashboardExtension()

  if (isError) {
    throw error
  }

  return (
    <TwoColumnPage
      widgets={{
        after: getWidgets("location.details.after"),
        before: getWidgets("location.details.before"),
        sideAfter: getWidgets("location.details.side.after"),
        sideBefore: getWidgets("location.details.side.before"),
      }}
    >
      <TwoColumnPage.Main>
        <LocationListHeader />
        <div className="flex flex-col gap-3 lg:col-span-2">
          {stockLocations.map((location) => (
            <LocationListItem key={location.id} location={location} />
          ))}
        </div>
      </TwoColumnPage.Main>
      <TwoColumnPage.Sidebar>
        <></>
      </TwoColumnPage.Sidebar>
    </TwoColumnPage>
  )
}
