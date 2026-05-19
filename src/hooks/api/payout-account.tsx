import {
  useMutation,
  UseMutationOptions,
  useQuery,
} from "@tanstack/react-query"
import { FetchError } from "@medusajs/js-sdk"
import { fetchQuery } from "../../lib/client"
import { queryClient } from "../../lib/query-client"
import { queryKeysFactory } from "../../lib/query-key-factory"

const PAYOUT_ACCOUNT_QUERY_KEY = "payout_account" as const
export const payoutAccountQueryKeys = queryKeysFactory(PAYOUT_ACCOUNT_QUERY_KEY)

// Mirrors @mercurjs/framework PayoutAccountStatus.
export type PayoutAccountStatus = "pending" | "active" | "disabled"

export type PayoutAccount = {
  id: string
  status: PayoutAccountStatus
  reference_id: string
  data: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type PayoutAccountResponse = {
  payout_account: PayoutAccount | null
}

// GET /vendor/payout-account — auto-syncs from Stripe (via
// syncStripeAccountWorkflow) if status !== 'active'. Returns null on 404
// (no payout_account yet — vendor hasn't started onboarding).
export const usePayoutAccount = () => {
  return useQuery<PayoutAccountResponse>({
    queryKey: [PAYOUT_ACCOUNT_QUERY_KEY],
    queryFn: async () => {
      try {
        const res = await fetchQuery("/vendor/payout-account", {
          method: "GET",
          query: { fields: "id,status,reference_id,data" },
        })
        return res as PayoutAccountResponse
      } catch (err: any) {
        if (err?.status === 404 || /not.found/i.test(err?.message || "")) {
          return { payout_account: null }
        }
        throw err
      }
    },
  })
}

// POST /vendor/payout-account — idempotent on the server (checks
// validateNoExistingPayoutAccountForSellerStep). Country defaults to US
// since Catholic Owned operates US-first.
export const useCreatePayoutAccount = (
  options?: UseMutationOptions<
    PayoutAccountResponse,
    FetchError,
    { country?: string } | undefined
  >
) => {
  return useMutation({
    mutationFn: async (input) =>
      (await fetchQuery("/vendor/payout-account", {
        method: "POST",
        body: { context: { country: input?.country ?? "US" } },
      })) as PayoutAccountResponse,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: [PAYOUT_ACCOUNT_QUERY_KEY] })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export type StartOnboardingResponse = {
  payout_account: PayoutAccount & {
    onboarding?: { data?: { url?: string } }
  }
}

// POST /vendor/payout-account/onboarding — returns a fresh Stripe-hosted
// account-link URL. The vendor is redirected here for KYC + bank account
// collection in Stripe's UI.
export const useStartPayoutOnboarding = (
  options?: UseMutationOptions<
    StartOnboardingResponse,
    FetchError,
    { refreshUrl: string; returnUrl: string }
  >
) => {
  return useMutation({
    mutationFn: async ({ refreshUrl, returnUrl }) =>
      (await fetchQuery("/vendor/payout-account/onboarding", {
        method: "POST",
        body: {
          context: { refresh_url: refreshUrl, return_url: returnUrl },
        },
        query: { fields: "id,status,reference_id,onboarding.data" },
      })) as StartOnboardingResponse,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: [PAYOUT_ACCOUNT_QUERY_KEY] })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

// POST /vendor/payout-account/sync — manual sync (the GET endpoint also
// auto-syncs when status !== 'active', so this is primarily for refresh
// buttons / debugging).
export const useSyncPayoutAccount = (
  options?: UseMutationOptions<PayoutAccountResponse, FetchError, void>
) => {
  return useMutation({
    mutationFn: async () =>
      (await fetchQuery("/vendor/payout-account/sync", {
        method: "POST",
      })) as PayoutAccountResponse,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: [PAYOUT_ACCOUNT_QUERY_KEY] })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

// Helper: derive the redirect URLs from the current vendor app origin.
// refresh_url is hit if the Stripe link expires; return_url lands the
// vendor back on the dashboard with ?onboarding=done so Dashboard can
// force a Stripe sync + setup-checklist refetch on arrival.
export const buildOnboardingUrls = () => {
  const origin =
    typeof window !== "undefined" ? window.location.origin : ""
  return {
    refreshUrl: `${origin}/onboarding/retry`,
    returnUrl: `${origin}/dashboard?onboarding=done`,
  }
}
