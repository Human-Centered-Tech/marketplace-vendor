import { useMutation, useQuery, UseQueryOptions } from "@tanstack/react-query"
import { fetchQuery } from "../../lib/client"

export type VendorEmailVerificationStatus = {
  email: string | null
  email_verified: boolean
  requires_verification: boolean
}

const QUERY_KEY = ["email-verification-status"] as const

/**
 * Resolves the authenticated vendor's email-verification status from their
 * linked customer account (GET /vendor/email-verification-status). Used by
 * the route guard + the verify-email screen. Exempt from the backend's
 * require-verified-vendor gate.
 */
export const useEmailVerificationStatus = (
  options?: Partial<UseQueryOptions<VendorEmailVerificationStatus>>
) =>
  useQuery<VendorEmailVerificationStatus>({
    queryFn: () =>
      fetchQuery("/vendor/email-verification-status", { method: "GET" }),
    queryKey: QUERY_KEY,
    staleTime: 0,
    ...options,
  })

/** Resends the verification link to the vendor's linked customer email. */
export const useSendVerificationEmail = () =>
  useMutation({
    mutationFn: () =>
      fetchQuery("/vendor/send-verification-email", { method: "POST" }),
  })
