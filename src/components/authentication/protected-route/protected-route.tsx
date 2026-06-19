import { Spinner } from "@medusajs/icons"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useMe } from "../../../hooks/api/users"
import { useEmailVerificationStatus } from "../../../hooks/api/email-verification"
import { useTermsAcceptanceStatus } from "../../../hooks/api/terms-acceptance"
import { AcceptTerms } from "../../../routes/accept-terms/accept-terms"
import { SearchProvider } from "../../../providers/search-provider"
import { SidebarProvider } from "../../../providers/sidebar-provider"

export const ProtectedRoute = () => {
  const { seller, isPending, error } = useMe()
  // Only resolve verification once we know the vendor is authenticated.
  const { data: verification, isPending: verificationPending } =
    useEmailVerificationStatus({ enabled: !!seller })
  // Drives the blocking Merchant Terms overlay below. Deliberately does NOT
  // gate rendering or redirect: the dashboard always mounts and we render a
  // full-screen overlay on top when acceptance is required. Keeping the gate
  // out of the routing/redirect path is what makes it loop-proof — and
  // server-side only mutations are blocked until accepted, so the read-only
  // dashboard underneath loads fine. Fails open (no overlay) if status errors.
  const { data: terms } = useTermsAcceptanceStatus({ enabled: !!seller })

  const location = useLocation()
  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="text-ui-fg-interactive animate-spin" />
      </div>
    )
  }

  if (!seller) {
    return (
      <Navigate
        to={`/login${error?.message ? `?reason=${error.message}` : ""}`}
        state={{ from: location }}
        replace
      />
    )
  }

  // Wait for the verification check before rendering the dashboard, so we
  // don't briefly fire data calls that the backend would 403.
  if (verificationPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="text-ui-fg-interactive animate-spin" />
      </div>
    )
  }

  if (verification?.requires_verification) {
    return <Navigate to="/verify-email" state={{ from: location }} replace />
  }

  return (
    <SidebarProvider>
      <SearchProvider>
        <Outlet />
        {terms?.requires_acceptance && <AcceptTerms />}
      </SearchProvider>
    </SidebarProvider>
  )
}
