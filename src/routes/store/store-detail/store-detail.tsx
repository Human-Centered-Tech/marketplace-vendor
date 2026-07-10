import { useLoaderData } from "react-router-dom"

import { useStore } from "../../../hooks/api/store.tsx"
import { StoreGeneralSection } from "./components/store-general-section/index.ts"
import { storeLoader } from "./loader.ts"

import { SingleColumnPageSkeleton } from "../../../components/common/skeleton/skeleton.tsx"
import { SingleColumnPage } from "../../../components/layout/pages/index.ts"
import { useDashboardExtension } from "../../../extensions/index.ts"
import { BusinessSection } from "./components/business-section/business-section.tsx"
import { CompanySection } from "./components/company-section/company-section.tsx"
import { StoreStatusSection } from "./components/store-status-section/store-status-section.tsx"
import { useMe } from "../../../hooks/api/users.tsx"
import { useSetup } from "../../../hooks/api/setup.tsx"

export const StoreDetail = () => {
  const initialData = useLoaderData() as Awaited<ReturnType<typeof storeLoader>>

  const { store, isPending, isError, error } = useStore(undefined, {
    initialData,
  })

  const { seller, isPending: sellerPending, isError: sellerError } = useMe()

  // Service businesses (no storefront) get one merged "Business" card
  // instead of the merchant Store/Company split.
  const { data: setup, isPending: setupPending } = useSetup()
  const isService = setup?.is_service === true

  const { getWidgets } = useDashboardExtension()

  if (isPending || sellerPending || setupPending || !store || !seller) {
    return <SingleColumnPageSkeleton sections={2} />
  }

  if (isError || sellerError) {
    throw error
  }

  return (
    <SingleColumnPage
      widgets={{
        before: getWidgets("store.details.before"),
        after: getWidgets("store.details.after"),
      }}
      data={store}
      hasOutlet
    >
      {isService ? (
        <BusinessSection seller={seller} />
      ) : (
        <>
          <StoreGeneralSection seller={seller} />
          <StoreStatusSection />
          <CompanySection seller={seller} />
        </>
      )}
    </SingleColumnPage>
  )
}
