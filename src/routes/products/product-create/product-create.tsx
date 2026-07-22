import { useSalesChannels } from "../../../hooks/api"
import { useStore } from "../../../hooks/api/store"
import { SingleColumnPageSkeleton } from "../../../components/common/skeleton/skeleton"
import { ProductCreateForm } from "./components/product-create-form/product-create-form"

export const ProductCreate = () => {
  const { store, isPending: isStorePending } = useStore()

  const { sales_channels, isPending: isSalesChannelPending } =
    useSalesChannels()

  const ready =
    !!store && !isStorePending && !!sales_channels && !isSalesChannelPending

  if (!ready) {
    return <SingleColumnPageSkeleton sections={4} />
  }

  return <ProductCreateForm defaultChannel={sales_channels[0]} store={store} />
}
