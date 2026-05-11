import { useQuery } from "@tanstack/react-query"
import { fetchQuery } from "../../lib/client"
import { queryKeysFactory } from "../../lib/query-key-factory"

// Vendor payout ledger — in-house accrual tracker for orders that have
// completed before Stripe payouts have caught up. Separate concern from
// the Stripe-connected payout_account (see ./payout-account.tsx for that).

const PAYOUTS_QUERY_KEY = "vendor_payouts" as const
export const vendorPayoutsQueryKeys = queryKeysFactory(PAYOUTS_QUERY_KEY)

export type PayoutLedgerEntry = {
  id: string
  order_id: string | null
  description: string | null
  amount: number
  commission_withheld: number
  currency_code: string
  status: "accrued" | "paid" | "void"
  accrued_at: string
  paid_at: string | null
}

export type PayoutsResponse = {
  totals: { pending: number; paid: number }
  entries: PayoutLedgerEntry[]
}

export const useVendorPayouts = () => {
  return useQuery<PayoutsResponse>({
    queryFn: () => fetchQuery("/vendor/payouts", { method: "GET" }),
    queryKey: [PAYOUTS_QUERY_KEY],
  })
}
