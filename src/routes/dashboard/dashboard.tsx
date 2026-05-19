import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { useOrders } from "../../hooks/api"
import { DashboardCharts } from "./components/dashboard-charts"
import { ChartSkeleton } from "./components/chart-skeleton"
import { AnalyticsPanel } from "./components/analytics-panel"
import { SetupChecklist } from "./components/setup-checklist"
import { PendingPayoutBanner } from "./components/pending-payout-banner"
import { useReviews } from "../../hooks/api/review"
import { useSyncPayoutAccount } from "../../hooks/api/payout-account"

// The dashboard renders a single unified SetupChecklist at the top
// (driven by GET /vendor/setup). When the checklist is complete it
// collapses to a slim "setup complete" strip, so the analytics and
// charts below are always visible. There's no longer a full-page
// wizard takeover or a separate Catholic-specific setup card — both
// are folded into SetupChecklist.
export const Dashboard = () => {
  const [isClient, setIsClient] = useState(false)
  useEffect(() => setIsClient(true), [])

  // Stripe redirects vendors back here with ?onboarding=done after the
  // hosted Connect flow. Force a sync (the GET endpoint only auto-syncs
  // for non-active accounts, so a manual sync also clears stale pending
  // state) and refetch /vendor/setup so the checklist's payout row
  // reflects the new status immediately rather than waiting on the
  // /hooks/payouts webhook.
  const [searchParams, setSearchParams] = useSearchParams()
  const syncMutation = useSyncPayoutAccount()
  const queryClient = useQueryClient()
  useEffect(() => {
    if (searchParams.get("onboarding") !== "done") return
    let cancelled = false
    const run = async () => {
      try {
        await syncMutation.mutateAsync()
      } catch {
        // sync failures shouldn't block — the webhook will catch up.
      }
      if (cancelled) return
      queryClient.invalidateQueries({ queryKey: ["setup"] })
      const next = new URLSearchParams(searchParams)
      next.delete("onboarding")
      setSearchParams(next, { replace: true })
    }
    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { orders, isPending: isPendingOrders } = useOrders()
  const { reviews, isPending: isPendingReviews } = useReviews()

  const notFulfilledOrders =
    orders?.filter((order) => order.fulfillment_status === "not_fulfilled")
      .length || 0
  const fulfilledOrders =
    orders?.filter((order) => order.fulfillment_status === "fulfilled")
      .length || 0
  const reviewsToReply =
    reviews?.filter((review: any) => !review?.seller_note).length || 0

  if (!isClient) return null

  if (isPendingOrders || isPendingReviews) {
    return (
      <div>
        <ChartSkeleton />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <SetupChecklist />
      <PendingPayoutBanner />
      <DashboardCharts
        notFulfilledOrders={notFulfilledOrders}
        fulfilledOrders={fulfilledOrders}
        reviewsToReply={reviewsToReply}
      />
      <AnalyticsPanel />
    </div>
  )
}
