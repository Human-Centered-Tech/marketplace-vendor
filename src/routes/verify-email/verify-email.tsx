import { toast } from "@medusajs/ui"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  useEmailVerificationStatus,
  useSendVerificationEmail,
} from "../../hooks/api/email-verification"

/**
 * Shown when an authenticated vendor's linked email isn't verified. Lives
 * outside ProtectedRoute so the gate can land here without bouncing to /login.
 * Makes authenticated calls via the stored token. Once verified, the status
 * query reports requires_verification=false and we send them to the dashboard.
 */
export const VerifyEmail = () => {
  const navigate = useNavigate()
  // Poll while this screen is up: verification happens on the storefront (a
  // different origin, so it can't signal us), and each background refetch
  // feeds the effect below so the redirect fires without any manual action.
  const { data, isPending, error } = useEmailVerificationStatus({
    refetchInterval: 5000,
  })
  const sendMutation = useSendVerificationEmail()

  useEffect(() => {
    if (isPending) return
    // Only bounce to /login on a real auth failure. The 5s poll means a
    // transient network blip / 5xx (laptop sleep, wifi switch — exactly what
    // this auto-continue screen invites) would otherwise kick a valid
    // session off the page; non-auth errors just wait for the next poll.
    if (error) {
      const status = (error as any)?.status ?? (error as any)?.response?.status
      if (status === 401 || status === 403) {
        navigate("/login", { replace: true })
      }
      return
    }
    // Verified (or grandfathered / no gate) — proceed to the dashboard.
    if (data && !data.requires_verification) {
      navigate("/dashboard", { replace: true })
    }
  }, [isPending, error, data, navigate])

  const onResend = async () => {
    try {
      await sendMutation.mutateAsync()
      toast.success("Verification email sent — check your inbox.")
    } catch {
      toast.error("Couldn't send the email. Please try again.")
    }
  }

  // Styled to mirror the storefront's VerifyEmailGate: brand serif heading
  // with the resend demoted to a quiet text link. No continue button — the
  // status poll above advances the screen on its own, so the only action a
  // merchant ever needs here is the resend.
  return (
    <div className="bg-co-cream bg-damask-pattern flex min-h-screen items-center justify-center p-4">
      <div className="bg-co-surface w-full max-w-xl rounded-sm border border-co-champagne/60 p-8 text-center shadow-sm lg:p-12">
        <p className="text-co-text-secondary mb-2 text-[11px] font-semibold uppercase tracking-[0.15em]">
          One more step
        </p>
        <h1 className="font-garamond text-co-text mb-4 text-2xl font-bold lg:text-3xl">
          Check your email
        </h1>
        <p className="text-co-text-secondary mb-2 text-[15px]">
          We sent a verification link
          {data?.email ? (
            <>
              {" "}
              to <span className="text-co-text font-semibold">{data.email}</span>
            </>
          ) : null}
          . Open it and this page will continue automatically.
        </p>
        <p className="text-co-text-secondary mt-6 text-[13px]">
          Didn&apos;t get the email?{" "}
          <button
            type="button"
            onClick={onResend}
            disabled={sendMutation.isPending}
            className="text-co-text hover:text-co-navy underline underline-offset-2 transition-colors disabled:opacity-60"
          >
            {sendMutation.isPending ? "Sending..." : "Resend verification"}
          </button>
        </p>
      </div>
    </div>
  )
}
