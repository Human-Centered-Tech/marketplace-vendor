import { useMemo, useState } from "react"
import { Outlet, useParams } from "react-router-dom"

import { SingleColumnPageSkeleton } from "../../../components/common/skeleton/skeleton"
import { useStockLocations, useStore } from "../../../hooks/api"
import { useMultipleInventoryItemLevels } from "../../../hooks/api/inventory"
import { useProduct } from "../../../hooks/api/products"
import { useProductVendorTags } from "../../../hooks/api/product-vendor-tags"
import { PRODUCT_DETAIL_FIELDS } from "../product-detail/constants"
import { EditProductForm } from "./components/edit-product-form"

// Unified full-page product editor. Clicking a product lands here — everything
// (general, media, organize, attributes, per-variant pricing, stock, metadata)
// is editable inline with a single sticky Save bar. Replaces the read-only
// detail page.
export const ProductEdit = () => {
  const { id } = useParams()

  // Bumped after each successful save so the form remounts and re-seeds from the
  // freshly-refetched product — even when net variant/image/option counts are
  // unchanged (e.g. a swap: delete one + add one).
  const [saveNonce, setSaveNonce] = useState(0)

  const { product, isLoading, isError, error } = useProduct(id!, {
    fields: `${PRODUCT_DETAIL_FIELDS},*variants.inventory_items,*options,*options.values`,
  })

  const { store, isPending: isStorePending } = useStore()

  // The product's vendor tags (vptag_…) — seed the tags field from these, not
  // native product.tags, so saves target the right namespace.
  const {
    product_tags: vendorTags,
    isPending: isVendorTagsPending,
    isError: isVendorTagsError,
    error: vendorTagsError,
  } = useProductVendorTags(id!)

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
    // Must request the level's own quantity columns explicitly — "*stock_locations"
    // alone returns only the relation, so stocked_quantity came back undefined
    // and the Quantity fields seeded blank even when stock existed.
    fields:
      "id,location_id,stocked_quantity,reserved_quantity,*stock_locations",
  })

  if (isError || isInventoryError || isVendorTagsError) {
    throw error || inventoryError || vendorTagsError
  }

  const ready =
    !isLoading &&
    !isStorePending &&
    !isLocationsPending &&
    !isInventoryPending &&
    !isVendorTagsPending &&
    !!product &&
    !!stock_locations &&
    !!inventoryItemsWithLevels &&
    !!vendorTags

  if (!ready) {
    return <SingleColumnPageSkeleton sections={6} />
  }

  const vendorTagIds = (vendorTags ?? []).map((t) => t.id)

  return (
    <>
      <EditProductForm
        // Re-seed the form when the product changes server-side (a modal
        // deep-link edit, or our own save) so freshly created variants carry
        // their real ids. saveNonce covers count-neutral saves (swaps); the
        // vendor-tag signature re-seeds when tags change (they live on a
        // separate query that our save invalidates).
        key={`${product.id}:${product.variants?.length ?? 0}:${
          product.images?.length ?? 0
        }:${product.options?.length ?? 0}:${saveNonce}:${vendorTagIds.join(
          "-"
        )}`}
        product={product}
        store={store}
        stockLocations={stock_locations}
        inventoryItems={inventoryItemsWithLevels}
        vendorTagIds={vendorTagIds}
        onSaved={() => setSaveNonce((n) => n + 1)}
      />
      {/* Hosts any deep-linked modal child routes (media, prices, stock, …)
          that still resolve under /products/:id during the inline migration. */}
      <Outlet />
    </>
  )
}
