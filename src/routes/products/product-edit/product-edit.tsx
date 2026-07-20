import { useParams } from "react-router-dom"

import { SingleColumnPageSkeleton } from "../../../components/common/skeleton/skeleton"
import { useProduct } from "../../../hooks/api/products"
import { PRODUCT_DETAIL_FIELDS } from "../product-detail/constants"
import { EditProductForm } from "./components/edit-product-form"

// Full-page single-form product edit (mirrors the create page + store settings).
// Replaces the old RouteDrawer. Advanced surfaces (stock, region pricing,
// add/remove variants, options, metadata, attributes) stay as their own modals
// on the product detail page.
export const ProductEdit = () => {
  const { id } = useParams()

  const { product, isLoading, isError, error } = useProduct(id!, {
    fields: PRODUCT_DETAIL_FIELDS,
  })

  if (isError) {
    throw error
  }

  if (isLoading || !product) {
    return <SingleColumnPageSkeleton sections={4} />
  }

  return <EditProductForm product={product} />
}
