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
  const { data, isPending, error, refetch, isFetching } =
    useEmailVerificationStatus()
  const sendMutation = useSendVerificationEmail()

  useEffect(() => {
    if (isPending) return
    // No/!invalid session — go log in.
    if (error) {
      navigate("/login", { replace: true })
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

  // Styled to mirror the storefront's VerifyEmailGate (7/10, Liam): brand
  // serif heading, one primary action, and the resend demoted to a quiet
  // text link — previously this was the stock Medusa-UI card, so merchants
  // saw two very different verification screens depending on where they
  // landed.
  return (
    <div className="bg-co-cream bg-damask-pattern flex min-h-screen items-center justify-center p-4">
      <div className="bg-co-surface w-full max-w-xl rounded-sm border border-co-champagne/60 p-8 text-center shadow-sm lg:p-12">
        <p className="text-co-text-secondary mb-2 text-[11px] font-semibold uppercase tracking-[0.15em]">
          One more step
        </p>
        <h1 className="font-garamond text-co-text mb-4 text-2xl font-bold lg:text-3xl">
          Verify your email to continue
        </h1>
        <p className="text-co-text-secondary mb-2 text-[15px]">
          We sent a verification link
          {data?.email ? (
            <>
              {" "}
              to <span className="text-co-text font-semibold">{data.email}</span>
            </>
          ) : null}
          . Please open it to unlock your merchant dashboard.
        </p>
        <div className="mb-8" />
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="bg-co-navy hover:bg-co-navy-light rounded-sm px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition-colors disabled:opacity-50"
        >
          {isFetching ? "Checking..." : "I've verified — continue"}
        </button>
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
