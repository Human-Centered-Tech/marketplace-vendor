import { useQuery } from "@tanstack/react-query"
import { FetchError } from "@medusajs/js-sdk"
import { fetchQuery } from "../../lib/client"

export type SetupResponse = {
  seller: {
    id: string
    name: string | null
    handle: string | null
  }
  store_basics: {
    store_information: boolean
    locations_shipping: boolean
    payouts: "not_started" | "pending" | "active" | "disabled"
    products: { published_count: number }
  }
  catholic_owned: {
    listing_exists: boolean
    listing_id: string | null
    owner_interview_populated: boolean
    parish_affiliated: boolean
  }
  go_live: {
    subscription_status:
      | "active"
      | "pending"
      | "expired"
      | "cancelled"
      | null
    subscription_tier: string | null
    store_status: "ACTIVE" | "INACTIVE" | "SUSPENDED"
    blockers: Array<{ code: string; message: string }>
  }
}

// GET /vendor/setup — one round trip returning every signal the unified
// setup checklist needs. Replaces useOnboarding + useCatholicOnboarding +
// usePayoutAccount when used from the dashboard checklist or /go-live.
export const useSetup = () => {
  return useQuery<SetupResponse, FetchError>({
    queryKey: ["setup"],
    queryFn: async () =>
      (await fetchQuery("/vendor/setup", { method: "GET" })) as SetupResponse,
    // Aggressive staleness so the checklist visibly updates after the
    // vendor finishes a step (publish a product, verify Stripe, etc.)
    // without needing a manual refresh.
    staleTime: 0,
  })
}
