import { useMutation, UseMutationOptions } from "@tanstack/react-query"
import { FetchError } from "@medusajs/js-sdk"
import { fetchQuery } from "../../lib/client"
import { queryClient } from "../../lib/query-client"

// Vacation mode — pause / reopen the shop. Both flip seller.store_status
// (ACTIVE ⇄ INACTIVE) and the seller_storefront.is_on_vacation flag, then
// re-index the seller's products in Algolia. Mirrors useGoLive: on success
// we invalidate the seller cache (so the shell banner updates) and the
// /vendor/setup composite (so the store status card re-renders).

export type PauseShopResponse = {
  status: "paused"
  seller_id: string
  hidden_product_count: number
}

export type ReopenShopResponse = {
  status: "live"
  seller_id: string
  restored_product_count: number
}

const invalidateStoreStatus = () => {
  queryClient.invalidateQueries({ queryKey: ["users", "me"] })
  queryClient.invalidateQueries({ queryKey: ["setup"] })
}

export const usePauseShop = (
  options?: UseMutationOptions<PauseShopResponse, FetchError, void>
) => {
  return useMutation({
    mutationFn: async () =>
      (await fetchQuery("/vendor/store/pause", {
        method: "POST",
      })) as PauseShopResponse,
    onSuccess: (data, variables, context) => {
      invalidateStoreStatus()
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useReopenShop = (
  options?: UseMutationOptions<ReopenShopResponse, FetchError, void>
) => {
  return useMutation({
    mutationFn: async () =>
      (await fetchQuery("/vendor/store/reopen", {
        method: "POST",
      })) as ReopenShopResponse,
    onSuccess: (data, variables, context) => {
      invalidateStoreStatus()
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}
