import { useEffect, useState } from "react"
import { Container, Heading, Text, Button } from "@medusajs/ui"
import { Link, useNavigate } from "react-router-dom"
import {
  usePayoutAccount,
  useSyncPayoutAccount,
} from "../../hooks/api/payout-account"

// /onboarding/done — the return_url Stripe redirects the vendor to after
// they finish (or cancel) the hosted onboarding flow. We force a sync from
// Stripe to pick up the new account state, then route the vendor based on
// the resulting status.
export const OnboardingDone = () => {
  const { data, refetch, isFetching } = usePayoutAccount()
  const syncMutation = useSyncPayoutAccount()
  const navigate = useNavigate()
  const [synced, setSynced] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        await syncMutation.mutateAsync()
      } catch {
        // sync failures shouldn't block the redirect — Stripe webhook will
        // catch the state eventually, or the vendor can click "refresh" on
        // the payouts page.
      }
      if (cancelled) return
      await refetch()
      if (cancelled) return
      setSynced(true)
    }
    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const status = data?.payout_account?.status

  return (
    <Container className="p-8 max-w-xl">
      <Heading>Welcome back</Heading>

      {!synced || isFetching ? (
        <Text className="text-ui-fg-subtle mt-2">
          Checking your account status…
        </Text>
      ) : status === "active" ? (
        <>
          <Text className="text-ui-fg-subtle mt-2">
            Your account is verified and payouts are enabled. You're ready to
            receive your earnings from marketplace sales.
          </Text>
          <div className="mt-6">
            <Button onClick={() => navigate("/payouts")}>
              Go to Payouts
            </Button>
          </div>
        </>
      ) : status === "pending" ? (
        <>
          <Text className="text-ui-fg-subtle mt-2">
            We're reviewing your information. This usually takes 1–3 business
            days. We'll email you once payouts are enabled.
          </Text>
          <div className="mt-6">
            <Button onClick={() => navigate("/payouts")}>
              Back to Payouts
            </Button>
          </div>
        </>
      ) : (
        <>
          <Text className="text-ui-fg-subtle mt-2">
            We couldn't read your account status yet — it may take a few
            moments to update. Head to the Payouts page to refresh.
          </Text>
          <div className="mt-6 flex gap-3 items-center">
            <Button onClick={() => navigate("/payouts")}>
              Go to Payouts
            </Button>
            <Link
              to="/payouts"
              className="text-ui-fg-interactive underline text-sm"
            >
              View account
            </Link>
          </div>
        </>
      )}
    </Container>
  )
}
