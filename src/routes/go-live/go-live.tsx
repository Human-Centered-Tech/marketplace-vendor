import { useMemo } from "react"
import {
  Badge,
  Button,
  Container,
  Heading,
  Text,
  toast,
} from "@medusajs/ui"
import { Link } from "react-router-dom"
import { useMe } from "../../hooks/api"
import { useGoLive } from "../../hooks/api/go-live"
import { usePayoutAccount } from "../../hooks/api/payout-account"
import { useProducts } from "../../hooks/api/products"

// /go-live — explicit transition page that takes a draft store live.
//
// Mirrors the server-side preflight in marketplace-backend's
// vendor/store/go-live route: payouts must be active, at least one
// product must be published, and a directory listing must exist. The
// client side just renders the checklist + button. The server is the
// source of truth; the button calls POST /vendor/store/go-live and acts
// on the structured response (live / needs_payment / preflight error).
export const GoLive = () => {
  const { seller } = useMe()
  const { data: payoutData, isLoading: payoutLoading } = usePayoutAccount()
  const { count: publishedCount, isLoading: productsLoading } = useProducts({
    status: ["published"],
    limit: 0,
    fields: "id",
  } as any)
  const goLiveMutation = useGoLive()

  const isAlreadyLive = seller?.store_status === "ACTIVE"
  const payoutsReady = payoutData?.payout_account?.status === "active"
  const hasPublishedProduct = (publishedCount ?? 0) > 0
  const preflightLoading = payoutLoading || productsLoading

  const allReady = useMemo(
    () => payoutsReady && hasPublishedProduct,
    [payoutsReady, hasPublishedProduct]
  )

  const handleGoLive = async () => {
    try {
      const result = await goLiveMutation.mutateAsync()
      if (result.status === "live") {
        toast.success("Your store is live!")
        return
      }
      // needs_payment → hand the user off to the storefront subscription
      // flow. They're already logged in there as a customer; the directory
      // checkout will collect payment and the Stripe webhook will flip the
      // store to ACTIVE on completion.
      window.location.assign(result.subscribe_url)
    } catch (err: any) {
      // Server returned a structured preflight error (400). The fields
      // above already reflect what's missing; surface the message so the
      // user sees the same reason on the button click.
      toast.error(
        err?.message ||
          "Couldn't go live. Check the requirements below and try again."
      )
    }
  }

  if (isAlreadyLive) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-6 flex flex-col gap-4 max-w-2xl">
          <Heading>✅ You're live</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Your store is visible to shoppers on Catholic Owned. New products
            you publish will appear on your storefront page automatically.
          </Text>
          <div>
            <Link to="/">
              <Button variant="primary">Back to dashboard</Button>
            </Link>
          </div>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-5 flex items-start justify-between gap-4">
        <div>
          <Heading>Go live</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Once you've set everything up, take your store live so shoppers
            can find and buy from you.
          </Text>
        </div>
        <Badge color="orange">Draft</Badge>
      </div>

      <div className="px-6 py-6 flex flex-col gap-3 max-w-2xl">
        <Text weight="plus">Before going live</Text>
        <ChecklistItem
          loading={preflightLoading}
          done={payoutsReady}
          title="Set up payouts"
          subtitle="Verify your bank account through Stripe so we can deposit your earnings."
          ctaTo="/payouts"
          ctaLabel="Set up payouts"
        />
        <ChecklistItem
          loading={preflightLoading}
          done={hasPublishedProduct}
          title="Publish at least one product"
          subtitle="You can add more — or edit this one — at any time after going live."
          ctaTo="/products"
          ctaLabel="Add a product"
        />
      </div>

      <div className="px-6 py-6 flex flex-col gap-4 max-w-2xl">
        <div>
          <Text weight="plus">Pay your directory subscription</Text>
          <Text size="small" className="text-ui-fg-subtle">
            Your annual Business Directory subscription unlocks visibility on
            Catholic Owned. You won't be charged until you confirm checkout
            on the next screen.
          </Text>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={handleGoLive}
            isLoading={goLiveMutation.isPending}
            disabled={!allReady || goLiveMutation.isPending}
          >
            Go live &amp; pay →
          </Button>
          {!allReady && !preflightLoading && (
            <Text size="small" className="text-ui-fg-subtle">
              Finish the checklist above first.
            </Text>
          )}
        </div>
      </div>
    </Container>
  )
}

const ChecklistItem = ({
  loading,
  done,
  title,
  subtitle,
  ctaTo,
  ctaLabel,
}: {
  loading: boolean
  done: boolean
  title: string
  subtitle: string
  ctaTo: string
  ctaLabel: string
}) => (
  <div className="flex items-start gap-3 rounded-md border px-3 py-2.5">
    <div className="pt-0.5" aria-hidden>
      {loading ? (
        <span className="text-ui-fg-muted">…</span>
      ) : done ? (
        <span className="text-emerald-600 font-bold">✓</span>
      ) : (
        <span className="text-amber-600">○</span>
      )}
    </div>
    <div className="flex-1">
      <Text weight={done ? "regular" : "plus"} className={done ? "line-through text-ui-fg-subtle" : ""}>
        {title}
      </Text>
      {!done && (
        <Text size="small" className="text-ui-fg-subtle">
          {subtitle}
        </Text>
      )}
    </div>
    {!done && !loading && (
      <Link to={ctaTo} className="shrink-0">
        <Button variant="secondary" size="small">
          {ctaLabel}
        </Button>
      </Link>
    )}
  </div>
)
