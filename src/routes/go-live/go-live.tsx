import {
  Badge,
  Button,
  Container,
  Heading,
  Text,
  toast,
} from "@medusajs/ui"
import { Link } from "react-router-dom"
import { useGoLive } from "../../hooks/api/go-live"
import { useSetup } from "../../hooks/api/setup"

// /go-live — focused, final-step screen for taking a draft store live.
//
// All preflight state comes from /vendor/setup (same source the dashboard
// SetupChecklist uses) so the two screens never disagree. The server-side
// preflight in POST /vendor/store/go-live remains the source of truth;
// this page just renders an explicit preview of the same checks before
// the vendor commits.
export const GoLive = () => {
  const { data, isPending } = useSetup()
  const goLiveMutation = useGoLive()

  if (isPending || !data) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-6">
          <Text className="text-ui-fg-subtle">Loading preflight…</Text>
        </div>
      </Container>
    )
  }

  const { store_basics, catholic_owned, go_live } = data
  const payoutsReady = store_basics.payouts === "active"
  const hasPublishedProduct = store_basics.products.published_count > 0
  const hasListing = catholic_owned.listing_exists
  const isAlreadyLive = go_live.store_status === "ACTIVE"
  const allReady =
    payoutsReady && hasPublishedProduct && hasListing && !isAlreadyLive

  const handleGoLive = async () => {
    try {
      const result = await goLiveMutation.mutateAsync()
      if (result.status === "live") {
        toast.success("Your store is live!")
        return
      }
      // needs_payment → hand off to the storefront subscription flow.
      // The directory checkout collects payment; the Stripe webhook
      // flips store_status to ACTIVE on completion.
      window.location.assign(result.subscribe_url)
    } catch (err: any) {
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
          done={payoutsReady}
          title="Set up payouts"
          subtitle="Verify your bank account through Stripe so we can deposit your earnings."
          ctaTo="/payouts"
          ctaLabel="Set up payouts"
        />
        <ChecklistItem
          done={hasPublishedProduct}
          title="Publish at least one product"
          subtitle="You can add more — or edit this one — at any time after going live."
          ctaTo="/products"
          ctaLabel="Add a product"
        />
        <ChecklistItem
          done={hasListing}
          title="Create your directory listing"
          subtitle="Your business's public profile on Catholic Owned. You'll do this on the storefront — there's a link from your dashboard."
          ctaTo="/"
          ctaLabel="Open dashboard"
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
        {/* Kill-switch while Terms of Service are being finalized. Backend
            POST /vendor/store/go-live → /store/directory/subscriptions
            returns 503 if someone bypasses this; the banner just makes the
            UX honest. Flip VITE_PAYMENTS_DISABLED in Railway when payments
            reopen (Vite inlines it as __PAYMENTS_DISABLED__ at build
            time — see vite.config.mts). */}
        {__PAYMENTS_DISABLED__ === "true" && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5">
            <Text size="small">
              Payments are temporarily disabled while we finalize our Terms of
              Service. You can keep setting up your store — we'll notify you
              when payment is available.
            </Text>
          </div>
        )}
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={handleGoLive}
            isLoading={goLiveMutation.isPending}
            disabled={
              !allReady ||
              goLiveMutation.isPending ||
              __PAYMENTS_DISABLED__ === "true"
            }
          >
            Go live &amp; pay →
          </Button>
          {!allReady &&
            process.env.NEXT_PUBLIC_PAYMENTS_DISABLED !== "true" && (
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
  done,
  title,
  subtitle,
  ctaTo,
  ctaLabel,
}: {
  done: boolean
  title: string
  subtitle: string
  ctaTo: string
  ctaLabel: string
}) => (
  <div className="flex items-start gap-3 rounded-md border px-3 py-2.5">
    <div className="pt-0.5" aria-hidden>
      {done ? (
        <span className="text-emerald-600 font-bold">✓</span>
      ) : (
        <span className="text-amber-600">○</span>
      )}
    </div>
    <div className="flex-1">
      <Text
        weight={done ? "regular" : "plus"}
        className={done ? "line-through text-ui-fg-subtle" : ""}
      >
        {title}
      </Text>
      {!done && (
        <Text size="small" className="text-ui-fg-subtle">
          {subtitle}
        </Text>
      )}
    </div>
    {!done && (
      <Link to={ctaTo} className="shrink-0">
        <Button variant="secondary" size="small">
          {ctaLabel}
        </Button>
      </Link>
    )}
  </div>
)
