import { useQuery, UseQueryOptions } from "@tanstack/react-query"
import { fetchQuery } from "../../lib/client"

export type VendorShippingSetup = {
  location_id: string
  shipping_option_id: string
  shipping_profile_id?: string
}

/**
 * POST /vendor/shipping-setup — makes the seller's shipping chain exist
 * (location → $0 option → profile) and returns the ids the fulfillment
 * dialog needs. Shipping is included in product prices and sellers never
 * configure it, so the dialog asks the server instead of the seller.
 * Idempotent on the server, so a query (re-run on open) is the right shape.
 */
export const useShippingSetup = (
  options?: Partial<UseQueryOptions<VendorShippingSetup, Error>>
) =>
  useQuery<VendorShippingSetup, Error>({
    queryFn: () => fetchQuery("/vendor/shipping-setup", { method: "POST" }),
    queryKey: ["shipping-setup"],
    staleTime: 60_000,
    retry: false,
    ...options,
  })
