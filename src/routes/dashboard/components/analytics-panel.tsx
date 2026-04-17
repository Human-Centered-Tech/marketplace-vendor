import { useQuery } from "@tanstack/react-query"
import { Container, Heading, Text } from "@medusajs/ui"
import { sdk } from "../../../lib/client"

type AnalyticsResponse = {
  period_start: string
  days: number
  storefront_views: number
  product_views: number
  product_favorites: number
  button_clicks: number
  top_products: { id: string; views: number; favorites: number }[]
  tracked_products: number
}

/**
 * Vendor-facing analytics widget on the dashboard home (PRD §3.4.4 /
 * §4.2.3). Shows 30-day views, favorites, button clicks, and a
 * top-products list.
 */
export const AnalyticsPanel = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["vendor-analytics-overview"],
    queryFn: () =>
      sdk.client
        .fetch<AnalyticsResponse>("/vendor/analytics/overview", {
          query: { days: 30 },
        })
        .catch(() => null),
  })

  return (
    <Container>
      <div className="flex items-center justify-between mb-4">
        <div>
          <Heading level="h2">Your Analytics</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Last 30 days
          </Text>
        </div>
      </div>

      {isLoading || !data ? (
        <Text className="text-ui-fg-subtle">Loading…</Text>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Metric label="Storefront views" value={data.storefront_views} />
            <Metric label="Product views" value={data.product_views} />
            <Metric label="Favorites" value={data.product_favorites} />
            <Metric label="Button clicks" value={data.button_clicks} />
          </div>

          {data.top_products.length > 0 ? (
            <div>
              <Text weight="plus" className="mb-2">
                Top viewed products
              </Text>
              <div className="divide-y border rounded">
                {data.top_products.slice(0, 5).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <span className="font-mono truncate mr-2">{p.id}</span>
                    <span className="text-ui-fg-subtle">
                      {p.views} view{p.views === 1 ? "" : "s"} &middot;{" "}
                      {p.favorites} fav{p.favorites === 1 ? "" : "s"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Text size="small" className="text-ui-fg-subtle italic">
              No product views yet. Analytics will populate once customers
              start viewing your storefront and products.
            </Text>
          )}
        </>
      )}
    </Container>
  )
}

const Metric = ({ label, value }: { label: string; value: number }) => (
  <div className="p-3 border rounded-md">
    <Text size="small" className="text-ui-fg-subtle uppercase tracking-wider">
      {label}
    </Text>
    <div className="text-xl font-semibold mt-1">{value.toLocaleString()}</div>
  </div>
)
