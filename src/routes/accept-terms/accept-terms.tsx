import { Button, Checkbox, Heading, Text, toast } from "@medusajs/ui"
import { useState } from "react"
import { useAcceptTerms } from "../../hooks/api/terms-acceptance"
import { MEDUSA_STOREFRONT_URL } from "../../lib/storefront"

const MERCHANT_TERMS_URL = `${MEDUSA_STOREFRONT_URL}/us/merchant-terms`

/**
 * Non-dismissible Merchant Terms clickwrap gate.
 *
 * Rendered INLINE by ProtectedRoute (it replaces the dashboard <Outlet/> while
 * acceptance is required) rather than being a route you navigate to. That's
 * deliberate: an earlier version redirected to a /accept-terms route, and that
 * cross-route hop tangled with the vendor SSO handoff / login bounce and could
 * put the app into a reload loop. Rendering in place means no navigation, no
 * /login, no handoff — so the loop is structurally impossible.
 *
 * On accept, useAcceptTerms writes the fresh status into the shared query
 * cache, which re-renders ProtectedRoute and drops this overlay.
 */
export const AcceptTerms = () => {
  const acceptMutation = useAcceptTerms()
  const [agreed, setAgreed] = useState(false)

  const onAccept = async () => {
    try {
      await acceptMutation.mutateAsync()
      // No navigation: the mutation's onSuccess updates the shared status
      // query, so ProtectedRoute re-renders into the dashboard on its own.
    } catch {
      toast.error("Couldn't record your acceptance. Please try again.")
    }
  }

  return (
    <div className="bg-ui-bg-subtle flex min-h-screen items-center justify-center p-4">
      <div className="bg-ui-bg-base shadow-elevation-card-rest w-full max-w-lg rounded-lg border p-8">
        <Text
          size="small"
          weight="plus"
          className="text-ui-fg-muted mb-2 uppercase tracking-wider"
        >
          Action required
        </Text>
        <Heading level="h1" className="mb-3">
          Updated Merchant Terms of Service
        </Heading>
        <Text className="text-ui-fg-subtle mb-4">
          Before you continue, please review and accept our Merchant Terms of
          Service. These terms govern selling on the Catholic Owned® Marketplace
          — including fulfillment, fees, payouts, and marketplace standards. You
          &apos;ll need to accept them to keep using your merchant dashboard.
        </Text>

        <a
          href={MERCHANT_TERMS_URL}
          target="_blank"
          rel="noreferrer"
          className="text-ui-fg-interactive mb-6 inline-block font-medium underline"
        >
          Read the full Merchant Terms of Service ↗
        </a>

        <label className="bg-ui-bg-subtle mb-5 flex items-start gap-3 rounded-md border p-3">
          <Checkbox
            id="agree-terms"
            checked={agreed}
            onCheckedChange={(v) => setAgreed(Boolean(v))}
            className="mt-0.5"
          />
          <Text size="small" className="text-ui-fg-base">
            I have read and agree to the Catholic Owned® Merchant Terms of
            Service.
          </Text>
        </label>

        <Button
          variant="primary"
          className="w-full"
          disabled={!agreed}
          isLoading={acceptMutation.isPending}
          onClick={onAccept}
        >
          Agree &amp; Continue
        </Button>

        <Text size="xsmall" className="text-ui-fg-muted mt-4 text-center">
          Effective May 28, 2026 · Questions? merchants@catholicowned.com
        </Text>
      </div>
    </div>
  )
}
