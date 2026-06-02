import { Button, Checkbox, Heading, Text, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  useAcceptTerms,
  useTermsAcceptanceStatus,
} from "../../hooks/api/terms-acceptance"
import { MEDUSA_STOREFRONT_URL } from "../../lib/storefront"

const MERCHANT_TERMS_URL = `${MEDUSA_STOREFRONT_URL}/us/merchant-terms`

/**
 * Non-dismissible clickwrap gate shown when an authenticated merchant hasn't
 * accepted the current Merchant Terms version. Lives outside ProtectedRoute so
 * the guard can land here without bouncing to /login. Makes authenticated
 * calls via the stored token. Once accepted, the status query reports
 * requires_acceptance=false and we send them to the dashboard. Fails open: if
 * the status endpoint errors (e.g. backend not yet deployed), we don't trap.
 */
export const AcceptTerms = () => {
  const navigate = useNavigate()
  const { data, isPending, error } = useTermsAcceptanceStatus()
  const acceptMutation = useAcceptTerms()
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    if (isPending) return
    // Can't determine status (e.g. backend not reachable) — fail open rather
    // than lock the merchant out. ProtectedRoute bounces to /login if the
    // session itself is gone.
    if (error) {
      navigate("/dashboard", { replace: true })
      return
    }
    // Already accepted the current version — proceed.
    if (data && !data.requires_acceptance) {
      navigate("/dashboard", { replace: true })
    }
  }, [isPending, error, data, navigate])

  const onAccept = async () => {
    try {
      await acceptMutation.mutateAsync()
      navigate("/dashboard", { replace: true })
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
