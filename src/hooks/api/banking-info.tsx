import {
  useMutation,
  UseMutationOptions,
  useQuery,
} from "@tanstack/react-query"
import { fetchQuery } from "../../lib/client"
import { queryClient } from "../../lib/query-client"
import { FetchError } from "@medusajs/js-sdk"
import { queryKeysFactory } from "../../lib/query-key-factory"

const BANKING_INFO_QUERY_KEY = "banking_info" as const
export const bankingInfoQueryKeys = queryKeysFactory(BANKING_INFO_QUERY_KEY)

const PAYOUTS_QUERY_KEY = "vendor_payouts" as const
export const vendorPayoutsQueryKeys = queryKeysFactory(PAYOUTS_QUERY_KEY)

export type BankingInfo = {
  id: string
  account_holder_name: string
  account_type: "checking" | "savings"
  account_number_last4: string
  verified: boolean
  tos_version: string | null
  tos_accepted_at: string | null
}

export type BankingInfoResponse = {
  banking_info: BankingInfo | null
  current_tos_version: string
}

export type BankingInfoPayload = {
  account_holder_name: string
  routing_number: string
  account_number: string
  account_type: "checking" | "savings"
  agreed_to_tos: boolean
}

export const useBankingInfo = () => {
  return useQuery<BankingInfoResponse>({
    queryFn: () => fetchQuery("/vendor/banking-info", { method: "GET" }),
    queryKey: [BANKING_INFO_QUERY_KEY],
  })
}

export const useUpdateBankingInfo = (
  options?: UseMutationOptions<BankingInfoResponse, FetchError, BankingInfoPayload>
) => {
  return useMutation({
    mutationFn: (payload: BankingInfoPayload) =>
      fetchQuery("/vendor/banking-info", {
        method: "PUT",
        body: payload,
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: [BANKING_INFO_QUERY_KEY] })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

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
