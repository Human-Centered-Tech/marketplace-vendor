import { Button, Heading, Text } from "@medusajs/ui"
import { Link } from "react-router-dom"
import { usePayoutAccount } from "../../../hooks/api/payout-account"
import { useVendorPayouts } from "../../../hooks/api/vendor-payouts"

const fmtUsd = (cents: number) =>
  `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

export const PendingPayoutBanner = () => {
  const { data: payoutAccountResp } = usePayoutAccount()
  const { data: payoutsResp } = useVendorPayouts()

  const account = payoutAccountResp?.payout_account
  const status = account?.status
  const pending = payoutsResp?.totals?.pending ?? 0

  const last4 = (account?.data as any)?.external_accounts?.data?.[0]?.last4

  return (
    <div className="rounded-xl bg-white p-6 shadow-[0_4px_24px_rgba(23,41,74,0.08)]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Heading level="h2">Payouts</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Earnings from marketplace sales accrue here and are deposited to
            your bank on a rolling schedule once payouts are enabled.
          </Text>
        </div>
        <div className="text-right">
          <Text size="small" className="text-ui-fg-subtle">
            Pending
          </Text>
          <Heading level="h1">{fmtUsd(pending)}</Heading>
        </div>
      </div>

      {(!account || status === "pending") && (
        <div className="mt-4 rounded-md bg-ui-bg-base-pressed px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <Text size="small">
            {status === "pending"
              ? "We're reviewing your details. Payouts will start once your account is verified."
              : "Set up direct deposit so we can send you your earnings."}
          </Text>
          <Button size="small" asChild>
            <Link to="/payouts">
              {status === "pending" ? "Continue setup" : "Set up payouts"}
            </Link>
          </Button>
        </div>
      )}

      {status === "active" && (
        <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
          <Text size="small" className="text-ui-fg-subtle">
            {last4 ? `Deposits go to •••• ${last4}` : "Payouts are enabled."}
          </Text>
          <Link to="/payouts" className="text-sm underline">
            Manage
          </Link>
        </div>
      )}

      {status === "disabled" && (
        <div className="mt-4 rounded-md bg-ui-bg-base-pressed px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <Text size="small">
            Action needed — please update your account details to resume
            payouts.
          </Text>
          <Button size="small" asChild>
            <Link to="/payouts">Update</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
