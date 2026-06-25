import { Heading } from "@medusajs/ui"
import { useParams } from "react-router-dom"

import { RouteDrawer } from "../../../components/modals"
import { useProduct } from "../../../hooks/api/products"
import { ProductPricingForm } from "./components/product-pricing-form"

export const ProductPricing = () => {
  const { id } = useParams()

  // Default fetch includes variant prices (same as the per-variant prices
  // editor), so no extra fields are needed here.
  const { product, isLoading, isError, error } = useProduct(id!)

  if (isError) {
    throw error
  }

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>Edit pricing</Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>
      {!isLoading && product && <ProductPricingForm product={product} />}
    </RouteDrawer>
  )
}
