import { Container, Heading, Text, Button, toast } from "@medusajs/ui"
import { useNavigate } from "react-router-dom"
import {
  buildOnboardingUrls,
  useStartPayoutOnboarding,
} from "../../hooks/api/payout-account"

// /onboarding/retry — the refresh_url Stripe redirects to if the hosted
// onboarding link expires (Stripe links are short-lived). Generates a
// fresh link and bounces the vendor back to Stripe.
export const OnboardingRetry = () => {
  const startMutation = useStartPayoutOnboarding()
  const navigate = useNavigate()

  const handleRetry = async () => {
    try {
      const urls = buildOnboardingUrls()
      const { payout_account } = await startMutation.mutateAsync({
        refreshUrl: urls.refreshUrl,
        returnUrl: urls.returnUrl,
      })
      const url = payout_account?.onboarding?.data?.url
      if (typeof url !== "string") {
        toast.error("Couldn't generate a new link. Try from the Payouts page.")
        navigate("/payouts")
        return
      }
      window.location.assign(url)
    } catch (err: any) {
      toast.error(err?.message || "Couldn't restart Stripe onboarding")
    }
  }

  return (
    <Container className="p-8 max-w-xl">
      <Heading>Let's pick up where you left off</Heading>
      <Text className="text-ui-fg-subtle mt-2">
        Your secure setup link expired (we use short-lived links for safety).
        Click below to start a new one — your progress is saved.
      </Text>
      <div className="mt-6 flex gap-3 items-center">
        <Button
          onClick={handleRetry}
          isLoading={startMutation.isPending}
          disabled={startMutation.isPending}
        >
          Continue setup →
        </Button>
        <Button variant="transparent" onClick={() => navigate("/payouts")}>
          Cancel
        </Button>
      </div>
    </Container>
  )
}
