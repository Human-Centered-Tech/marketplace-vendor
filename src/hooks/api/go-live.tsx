import { useMutation, UseMutationOptions } from "@tanstack/react-query"
import { FetchError } from "@medusajs/js-sdk"
import { fetchQuery } from "../../lib/client"
import { queryClient } from "../../lib/query-client"

// POST /vendor/store/go-live — server-side preflight + branch:
//   - { status: "live" }                 shop is now visible to shoppers
//   - { status: "needs_payment", ... }   redirect user to subscribe_url
//   - 400 { code, message }              preflight failed (no payouts /
//                                        no published products / no listing)
export type GoLiveResponse =
  | {
      status: "live"
      seller_id: string
      published_product_count: number
    }
  | {
      status: "needs_payment"
      listing_id: string
      current_subscription_status: string | null
      current_subscription_tier: string | null
      subscribe_url: string
    }

export const useGoLive = (
  options?: UseMutationOptions<GoLiveResponse, FetchError, void>
) => {
  return useMutation({
    mutationFn: async () =>
      (await fetchQuery("/vendor/store/go-live", {
        method: "POST",
      })) as GoLiveResponse,
    onSuccess: (data, variables, context) => {
      // store_status may have flipped → invalidate the seller cache so
      // the banner in shell.tsx updates without a manual reload, and the
      // /vendor/setup composite so the dashboard checklist re-renders.
      queryClient.invalidateQueries({ queryKey: ["users", "me"] })
      queryClient.invalidateQueries({ queryKey: ["setup"] })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}
