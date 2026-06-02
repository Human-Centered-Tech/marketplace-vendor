import { Button, Checkbox, Heading, Text, toast } from "@medusajs/ui"
import { useState } from "react"
import { useAcceptTerms } from "../../hooks/api/terms-acceptance"
import { MEDUSA_STOREFRONT_URL } from "../../lib/storefront"

const MERCHANT_TERMS_URL = `${MEDUSA_STOREFRONT_URL}/us/merchant-terms`

/**
 * Non-dismissible Merchant Terms clickwrap gate.
 *
 * Rendered by ProtectedRoute as a FULL-SCREEN OVERLAY on top of the dashboard
 * (not a route, not a redirect, no navigation). This keeps the gate entirely
 * out of the routing / SSO-handoff / login path, which is what caused reload
 * loops in earlier route- and redirect-based versions. The dashboard mounts
 * underneath but is fully covered and read-only (the backend blocks mutations
 * until accepted), so there is nothing to interact with until acceptance.
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
    <div className="bg-ui-bg-subtle fixed inset-0 z-50 flex items-center justify-center p-4">
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
