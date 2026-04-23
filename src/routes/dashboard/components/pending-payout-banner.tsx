import { Button, Heading, Text } from "@medusajs/ui"
import { Link } from "react-router-dom"
import {
  useBankingInfo,
  useVendorPayouts,
} from "../../../hooks/api/banking-info"

const fmtUsd = (cents: number) =>
  `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

export const PendingPayoutBanner = () => {
  const { data: bankingResp } = useBankingInfo()
  const { data: payoutsResp } = useVendorPayouts()

  const banking = bankingResp?.banking_info
  const pending = payoutsResp?.totals?.pending ?? 0

  const needsBanking = !banking

  return (
    <div className="rounded-xl bg-white p-6 shadow-[0_4px_24px_rgba(23,41,74,0.08)]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Heading level="h2">Payouts</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            The marketplace goes live at the end of June. Until then, orders
            accrue here and pay out via ACH once live sales start.
          </Text>
        </div>
        <div className="text-right">
          <Text size="small" className="text-ui-fg-subtle">
            Pending payout
          </Text>
          <Heading level="h1">{fmtUsd(pending)}</Heading>
        </div>
      </div>

      {needsBanking && (
        <div className="mt-4 rounded-md bg-ui-bg-base-pressed px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <Text size="small">
            We don't have your banking info yet. Add it now so you're ready
            when payouts start.
          </Text>
          <Button size="small" asChild>
            <Link to="/banking-info">Add banking info</Link>
          </Button>
        </div>
      )}

      {!needsBanking && (
        <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
          <Text size="small" className="text-ui-fg-subtle">
            On file: {banking?.account_holder_name} ••••{" "}
            {banking?.account_number_last4}
          </Text>
          <Link to="/banking-info" className="text-sm underline">
            Update
          </Link>
        </div>
      )}
    </div>
  )
}
