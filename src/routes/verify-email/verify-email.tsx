import { Button, Heading, Text, toast } from "@medusajs/ui"
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

  return (
    <div className="bg-ui-bg-subtle flex min-h-screen items-center justify-center p-4">
      <div className="bg-ui-bg-base shadow-elevation-card-rest w-full max-w-md rounded-lg border p-8 text-center">
        <Heading level="h1" className="mb-2">
          Verify your email
        </Heading>
        <Text className="text-ui-fg-subtle mb-1">
          Confirm your email
          {data?.email ? ` (${data.email})` : ""} to access your merchant
          dashboard.
        </Text>
        <Text size="small" className="text-ui-fg-muted mb-6">
          Open the link we emailed you, then return here and continue.
        </Text>
        <div className="flex flex-col gap-3">
          <Button
            variant="secondary"
            onClick={onResend}
            isLoading={sendMutation.isPending}
          >
            Resend verification email
          </Button>
          <Button
            variant="primary"
            onClick={() => refetch()}
            isLoading={isFetching}
          >
            I&apos;ve verified — continue
          </Button>
        </div>
      </div>
    </div>
  )
}
