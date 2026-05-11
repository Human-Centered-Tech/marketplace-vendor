import { Container, Heading, Text, Button, Badge, toast } from "@medusajs/ui"
import {
  buildOnboardingUrls,
  usePayoutAccount,
  useCreatePayoutAccount,
  useStartPayoutOnboarding,
  useSyncPayoutAccount,
} from "../../hooks/api/payout-account"

// Express Dashboard entry point. Vendors sign in with the email + phone they
// gave during Stripe-hosted onboarding (2FA via SMS or authenticator).
const EXPRESS_DASHBOARD_URL = "https://connect.stripe.com/express_login"

const TAX_NOTE = (
  <Text size="small" className="text-ui-fg-subtle">
    Sales tax is collected and remitted by Catholic Owned as the marketplace
    facilitator. You're not responsible for collecting or filing state sales
    tax on orders made through the platform.
  </Text>
)

// Stripe Connect Platform Agreement requires attribution to Stripe somewhere
// visible to vendors. Keep small + footer-style — co-branded, not co-led.
const POWERED_BY = (
  <Text size="xsmall" className="text-ui-fg-muted">
    Payouts powered by Stripe.
  </Text>
)

const SETUP_BULLETS = [
  "Bank info and identity verification are collected by our payments partner (Stripe) and never touch Catholic Owned servers.",
  "Setup typically takes 5–10 minutes.",
  "Identity verification usually completes within 1–3 business days.",
]

export const Payouts = () => {
  const { data, isLoading, refetch } = usePayoutAccount()
  const createMutation = useCreatePayoutAccount()
  const startMutation = useStartPayoutOnboarding()
  const syncMutation = useSyncPayoutAccount()

  const account = data?.payout_account
  const status = account?.status

  const handleConnect = async () => {
    try {
      if (!account) {
        await createMutation.mutateAsync({ country: "US" })
      }
      const urls = buildOnboardingUrls()
      const { payout_account: updated } = await startMutation.mutateAsync({
        refreshUrl: urls.refreshUrl,
        returnUrl: urls.returnUrl,
      })
      const url = updated?.onboarding?.data?.url
      if (typeof url !== "string") {
        toast.error("Couldn't start setup. Try again in a moment.")
        return
      }
      window.location.assign(url)
    } catch (err: any) {
      toast.error(err?.message || "Couldn't start setup")
    }
  }

  const handleSync = async () => {
    try {
      await syncMutation.mutateAsync()
      await refetch()
      toast.success("Status refreshed")
    } catch (err: any) {
      toast.error(err?.message || "Couldn't refresh status")
    }
  }

  const busy =
    isLoading ||
    createMutation.isPending ||
    startMutation.isPending ||
    syncMutation.isPending

  return (
    <Container className="divide-y p-0">
      <div className="flex items-start justify-between px-6 py-4 gap-4">
        <div>
          <Heading>Payouts</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Set up direct deposit so Catholic Owned can send you your earnings
            from marketplace sales.
          </Text>
        </div>
        <StatusBadge status={status} loading={isLoading} />
      </div>

      {!account && (
        <NotConnectedPanel onConnect={handleConnect} busy={busy} />
      )}

      {account && status === "pending" && (
        <PendingPanel
          onContinue={handleConnect}
          onRefresh={handleSync}
          busy={busy}
        />
      )}

      {account && status === "active" && (
        <ActivePanel
          account={account}
          onRefresh={handleSync}
          busy={busy}
        />
      )}

      {account && status === "disabled" && (
        <DisabledPanel
          onUpdate={handleConnect}
          onRefresh={handleSync}
          busy={busy}
        />
      )}

      <div className="px-6 py-3 flex items-center justify-between">
        {TAX_NOTE}
      </div>
      <div className="px-6 py-2 flex items-center justify-end">
        {POWERED_BY}
      </div>
    </Container>
  )
}

const StatusBadge = ({
  status,
  loading,
}: {
  status?: string
  loading: boolean
}) => {
  if (loading) return null
  if (!status) return <Badge color="grey">Not set up</Badge>
  if (status === "active") return <Badge color="green">Payouts enabled</Badge>
  if (status === "pending") return <Badge color="orange">In progress</Badge>
  if (status === "disabled") return <Badge color="red">Action needed</Badge>
  return <Badge color="grey">{status}</Badge>
}

const NotConnectedPanel = ({
  onConnect,
  busy,
}: {
  onConnect: () => void
  busy: boolean
}) => (
  <div className="px-6 py-6 flex flex-col gap-5 max-w-xl">
    <div>
      <Text weight="plus">Get paid for your sales</Text>
      <Text size="small" className="text-ui-fg-subtle">
        Connect a bank account so we can deposit your earnings. You'll be
        sent to a short, secure setup flow to verify your identity and add
        your bank — it usually takes about 5 minutes.
      </Text>
    </div>

    <ul className="flex flex-col gap-2">
      {SETUP_BULLETS.map((b, i) => (
        <li key={i} className="flex items-start gap-2">
          <span aria-hidden className="text-ui-fg-subtle">•</span>
          <Text size="small">{b}</Text>
        </li>
      ))}
    </ul>

    <div>
      <Button variant="primary" onClick={onConnect} isLoading={busy} disabled={busy}>
        Set up payouts →
      </Button>
    </div>
  </div>
)

const PendingPanel = ({
  onContinue,
  onRefresh,
  busy,
}: {
  onContinue: () => void
  onRefresh: () => void
  busy: boolean
}) => (
  <div className="px-6 py-6 flex flex-col gap-4 max-w-xl">
    <div>
      <Text weight="plus">Finish setting up payouts</Text>
      <Text size="small" className="text-ui-fg-subtle">
        We need a few more details before we can deposit your earnings. Pick
        up where you left off — your progress is saved.
      </Text>
    </div>

    <div className="flex gap-3 items-center">
      <Button variant="primary" onClick={onContinue} isLoading={busy} disabled={busy}>
        Continue setup →
      </Button>
      <Button variant="transparent" onClick={onRefresh} disabled={busy}>
        Refresh status
      </Button>
    </div>
  </div>
)

const ActivePanel = ({
  account,
  onRefresh,
  busy,
}: {
  account: { reference_id: string; data: Record<string, unknown> }
  onRefresh: () => void
  busy: boolean
}) => {
  const country = (account.data as any)?.country
  const last4 = (account.data as any)?.external_accounts?.data?.[0]?.last4

  return (
    <div className="px-6 py-6 flex flex-col gap-4 max-w-xl">
      <div>
        <Text weight="plus">You're all set — payouts are enabled</Text>
        <Text size="small" className="text-ui-fg-subtle">
          Your bank account is verified and ready to receive your earnings
          from marketplace sales on a rolling schedule.
        </Text>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm bg-ui-bg-subtle px-4 py-3 rounded-md">
        {last4 && (
          <>
            <dt className="text-ui-fg-subtle">Deposit account</dt>
            <dd className="font-mono">•••• {last4}</dd>
          </>
        )}
        {country && (
          <>
            <dt className="text-ui-fg-subtle">Country</dt>
            <dd className="uppercase">{country}</dd>
          </>
        )}
        <dt className="text-ui-fg-subtle">Status</dt>
        <dd className="text-ui-fg-positive">Active</dd>
      </dl>

      <div className="flex gap-3 items-center">
        <a
          href={EXPRESS_DASHBOARD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ui-fg-interactive underline text-sm"
        >
          Manage payouts →
        </a>
        <Button variant="transparent" onClick={onRefresh} disabled={busy}>
          Refresh status
        </Button>
      </div>
    </div>
  )
}

const DisabledPanel = ({
  onUpdate,
  onRefresh,
  busy,
}: {
  onUpdate: () => void
  onRefresh: () => void
  busy: boolean
}) => (
  <div className="px-6 py-6 flex flex-col gap-4 max-w-xl">
    <div>
      <Text weight="plus">More information needed to enable payouts</Text>
      <Text size="small" className="text-ui-fg-subtle">
        Your account needs a few more details before payouts can resume.
        Update your account information to continue receiving deposits.
      </Text>
    </div>

    <div className="flex gap-3 items-center">
      <Button variant="primary" onClick={onUpdate} isLoading={busy} disabled={busy}>
        Update details →
      </Button>
      <Button variant="transparent" onClick={onRefresh} disabled={busy}>
        Refresh status
      </Button>
    </div>
  </div>
)
