import { useSalesChannels, useStockLocations } from "../../../hooks/api"
import { useStore } from "../../../hooks/api/store"
import { SingleColumnPageSkeleton } from "../../../components/common/skeleton/skeleton"
import { ProductCreateForm } from "./components/product-create-form/product-create-form"

export const ProductCreate = () => {
  const { store, isPending: isStorePending } = useStore()

  const { sales_channels, isPending: isSalesChannelPending } =
    useSalesChannels()

  // Needed for the per-variant starting-stock field: stock levels are written
  // against a location, so we can't offer the field until we know the seller's.
  const { stock_locations, isPending: isLocationsPending } = useStockLocations({
    limit: 9999,
  })

  const ready =
    !!store &&
    !isStorePending &&
    !!sales_channels &&
    !isSalesChannelPending &&
    !!stock_locations &&
    !isLocationsPending

  if (!ready) {
    return <SingleColumnPageSkeleton sections={4} />
  }

  return (
    <ProductCreateForm
      defaultChannel={sales_channels[0]}
      store={store}
      stockLocations={stock_locations}
    />
  )
}
