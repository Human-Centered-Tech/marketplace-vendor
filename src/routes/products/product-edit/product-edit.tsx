import { useMemo } from "react"
import { Outlet, useParams } from "react-router-dom"

import { SingleColumnPageSkeleton } from "../../../components/common/skeleton/skeleton"
import { useStockLocations, useStore } from "../../../hooks/api"
import { useMultipleInventoryItemLevels } from "../../../hooks/api/inventory"
import { useProduct } from "../../../hooks/api/products"
import { PRODUCT_DETAIL_FIELDS } from "../product-detail/constants"
import { EditProductForm } from "./components/edit-product-form"

// Unified full-page product editor. Clicking a product lands here — everything
// (general, media, organize, attributes, per-variant pricing, stock, metadata)
// is editable inline with a single sticky Save bar. Replaces the read-only
// detail page.
export const ProductEdit = () => {
  const { id } = useParams()

  const { product, isLoading, isError, error } = useProduct(id!, {
    fields: `${PRODUCT_DETAIL_FIELDS},*variants.inventory_items,*options,*options.values`,
  })

  const { store, isPending: isStorePending } = useStore()

  const { stock_locations, isPending: isLocationsPending } = useStockLocations({
    limit: 9999,
  })

  const inventoryItemIds = useMemo(() => {
    const ids: string[] = []
    product?.variants?.forEach((variant) => {
      variant.inventory_items?.forEach((item) => {
        ids.push(item.inventory_item_id)
      })
    })
    return ids
  }, [product])

  const {
    inventoryItemsWithLevels,
    isPending: isInventoryPending,
    isError: isInventoryError,
    error: inventoryError,
  } = useMultipleInventoryItemLevels(inventoryItemIds, {
    fields: "*stock_locations",
  })

  if (isError || isInventoryError) {
    throw error || inventoryError
  }

  const ready =
    !isLoading &&
    !isStorePending &&
    !isLocationsPending &&
    !isInventoryPending &&
    !!product &&
    !!stock_locations &&
    !!inventoryItemsWithLevels

  if (!ready) {
    return <SingleColumnPageSkeleton sections={6} />
  }

  return (
    <>
      <EditProductForm
        // Re-seed the form when the product's structure changes server-side
        // (e.g. a variant added via the create-variant modal, or images saved),
        // so newly added variants/images appear without a manual reload.
        key={`${product.id}:${product.variants?.length ?? 0}:${
          product.images?.length ?? 0
        }:${product.options?.length ?? 0}`}
        product={product}
        store={store}
        stockLocations={stock_locations}
        inventoryItems={inventoryItemsWithLevels}
      />
      {/* Hosts any deep-linked modal child routes (media, prices, stock, …)
          that still resolve under /products/:id during the inline migration. */}
      <Outlet />
    </>
  )
}
