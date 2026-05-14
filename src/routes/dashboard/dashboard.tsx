import { useEffect, useState } from "react"
import { useOrders } from "../../hooks/api"
import { DashboardCharts } from "./components/dashboard-charts"
import { ChartSkeleton } from "./components/chart-skeleton"
import { AnalyticsPanel } from "./components/analytics-panel"
import { SetupChecklist } from "./components/setup-checklist"
import { PendingPayoutBanner } from "./components/pending-payout-banner"
import { useReviews } from "../../hooks/api/review"

// The dashboard renders a single unified SetupChecklist at the top
// (driven by GET /vendor/setup). When the checklist is complete it
// collapses to a slim "setup complete" strip, so the analytics and
// charts below are always visible. There's no longer a full-page
// wizard takeover or a separate Catholic-specific setup card — both
// are folded into SetupChecklist.
export const Dashboard = () => {
  const [isClient, setIsClient] = useState(false)
  useEffect(() => setIsClient(true), [])

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
