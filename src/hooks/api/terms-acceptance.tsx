import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query"
import { fetchQuery } from "../../lib/client"

export type VendorTermsAcceptanceStatus = {
  terms_version: string
  requires_acceptance: boolean
  accepted_at: string | null
}

const QUERY_KEY = ["terms-acceptance-status"] as const

/**
 * Resolves whether the authenticated merchant must accept the current Merchant
 * Terms version (GET /vendor/terms-acceptance-status). Used by the route guard
 * + the accept-terms screen. Exempt from the backend's require-terms-accepted
 * gate. Fails open at the guard: on error `data` is undefined, so the guard
 * treats it as "not gated" rather than trapping the merchant.
 */
export const useTermsAcceptanceStatus = (
  options?: Partial<UseQueryOptions<VendorTermsAcceptanceStatus>>
) =>
  useQuery<VendorTermsAcceptanceStatus>({
    queryFn: () =>
      fetchQuery("/vendor/terms-acceptance-status", { method: "GET" }),
    queryKey: QUERY_KEY,
    staleTime: 0,
    refetchOnWindowFocus: true,
    ...options,
  })

/**
 * Records the merchant's affirmative acceptance (POST /vendor/accept-terms).
 * The response is the fresh status; we write it into the shared query cache so
 * the route guard clears the gate immediately, no extra round-trip.
 */
export const useAcceptTerms = () => {
  const queryClient = useQueryClient()
  return useMutation<VendorTermsAcceptanceStatus, Error, void>({
    mutationFn: () => fetchQuery("/vendor/accept-terms", { method: "POST" }),
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEY, data)
    },
  })
}
