import { useQuery } from "@tanstack/react-query"
import { FetchError } from "@medusajs/js-sdk"
import { fetchQuery } from "../../lib/client"

export type SetupResponse = {
  seller: {
    id: string
    name: string | null
    handle: string | null
  }
  // "service" businesses (consultants, nonprofits, trades) don't sell
  // products — their onboarding skips products/shipping/payouts and they
  // only pay for + publish their directory listing. Derived backend-side
  // from the onboarding tier. is_service is a convenience mirror.
  business_type: "product" | "service"
  is_service: boolean
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
    // True when the vendor paused their live shop (vacation mode) — vs a
    // never-launched draft, which is also store_status INACTIVE. Drives
    // the "Reopen shop" vs "Go Live" affordances.
    is_on_vacation: boolean
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
