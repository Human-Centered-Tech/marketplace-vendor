import { FetchError } from "@medusajs/js-sdk"
import { useMutation, useQuery, UseQueryOptions } from "@tanstack/react-query"
import { fetchQuery } from "../../lib/client"
import { queryClient } from "../../lib/query-client"

// Mirrors the backend imports module (src/modules/imports). The vendor UI
// polls job status + items until a job reaches a terminal state.

export type ImportSource = "shopify" | "etsy" | "csv"
export type ImportMode = "dry_run" | "commit"
export type ImportJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "partial"
  | "failed"
  | "cancelled"

export type ImportItem = {
  id: string
  source_id: string
  source_handle: string | null
  title: string | null
  status: string
  error: string | null
  product_id: string | null
  preview?: any
}

export type ImportJob = {
  id: string
  source: ImportSource
  mode: ImportMode
  status: ImportJobStatus
  total_count: number
  processed_count: number
  succeeded_count: number
  failed_count: number
  skipped_count: number
  log?: { at: string; message: string }[] | null
  error?: string | null
  created_at: string
  completed_at?: string | null
  items?: ImportItem[]
}

const TERMINAL: ImportJobStatus[] = [
  "completed",
  "partial",
  "failed",
  "cancelled",
]

export const importsQueryKeys = {
  list: () => ["imports"] as const,
  detail: (id: string) => ["imports", id] as const,
  shopifyStatus: () => ["imports", "shopify", "status"] as const,
}

// GET /vendor/imports — the seller's import jobs.
export const useImports = (
  options?: Partial<UseQueryOptions<{ jobs: ImportJob[]; count: number }, FetchError>>
) =>
  useQuery({
    queryKey: importsQueryKeys.list(),
    queryFn: async () =>
      (await fetchQuery("/vendor/imports", { method: "GET" })) as {
        jobs: ImportJob[]
        count: number
      },
    ...options,
  })

// GET /vendor/imports/:id — job detail + items. Polls every 2.5s while the
// job is still pending/running, then stops.
export const useImportJob = (
  id: string | undefined,
  options?: Partial<UseQueryOptions<{ job: ImportJob }, FetchError>>
) =>
  useQuery({
    queryKey: importsQueryKeys.detail(id || "none"),
    enabled: Boolean(id),
    queryFn: async () =>
      (await fetchQuery(`/vendor/imports/${id}`, { method: "GET" })) as {
        job: ImportJob
      },
    refetchInterval: (query) => {
      const status = (query.state.data as { job?: ImportJob } | undefined)?.job
        ?.status
      return status && !TERMINAL.includes(status) ? 2500 : false
    },
    ...options,
  })

// POST /vendor/imports — create a dry_run or commit job for a source.
export const useCreateImportJob = () =>
  useMutation<
    { job: ImportJob },
    FetchError,
    { source: ImportSource; mode: ImportMode; settings?: Record<string, unknown> }
  >({
    mutationFn: (payload) =>
      fetchQuery("/vendor/imports", { method: "POST", body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: importsQueryKeys.list() })
    },
  })

// DELETE /vendor/imports/:id — remove a finished job from history.
export const useDeleteImportJob = () =>
  useMutation<{ id: string; deleted: boolean }, FetchError, string>({
    mutationFn: (id) =>
      fetchQuery(`/vendor/imports/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: importsQueryKeys.list() })
    },
  })

// GET /vendor/imports/shopify/status — is the seller connected?
export const useShopifyStatus = () =>
  useQuery({
    queryKey: importsQueryKeys.shopifyStatus(),
    queryFn: async () =>
      (await fetchQuery("/vendor/imports/shopify/status", {
        method: "GET",
      })) as { connected: boolean; shop: string | null },
  })

// GET /vendor/imports/shopify/install?json=1 — returns the Shopify OAuth URL
// for the bearer-authed SPA to redirect to (a plain <a> can't send auth).
export const useShopifyConnectUrl = () =>
  useMutation<{ url: string }, FetchError, string>({
    mutationFn: (shop) =>
      fetchQuery("/vendor/imports/shopify/install", {
        method: "GET",
        query: { shop, json: "1" },
      }),
  })
