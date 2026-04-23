import { FetchError } from "@medusajs/js-sdk"
import {
  QueryKey,
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
} from "@tanstack/react-query"
import { fetchQuery } from "../../lib/client"
import { queryClient } from "../../lib/query-client"
import { queryKeysFactory } from "../../lib/query-key-factory"

export type VendorCollection = {
  id: string
  seller_id: string
  title: string
  subtitle: string | null
  description: string | null
  slug: string
  image_url: string | null
  tag_match_mode: "any" | "all"
  display_order: number
  is_visible: boolean
  hide_when_empty: boolean
  metadata: Record<string, unknown> | null
  tag_ids: string[]
  created_at: string
  updated_at: string
}

export type VendorCollectionListResponse = {
  collections: VendorCollection[]
  count: number
  offset: number
  limit: number
}

export type VendorCollectionResponse = {
  collection: VendorCollection
}

export type VendorCollectionPreviewResponse = {
  product_ids: string[]
  products: Array<{
    id: string
    title: string
    handle: string
    thumbnail: string | null
    status: string
  }>
  count: number
  limit: number
}

export type CreateVendorCollectionPayload = {
  title: string
  subtitle?: string
  description?: string
  slug?: string
  image_url?: string | null
  tag_ids?: string[]
  tag_match_mode?: "any" | "all"
  display_order?: number
  is_visible?: boolean
  hide_when_empty?: boolean
  metadata?: Record<string, unknown>
}

export type UpdateVendorCollectionPayload = Partial<CreateVendorCollectionPayload>

const VENDOR_COLLECTIONS_QUERY_KEY = "vendor_collections" as const
export const vendorCollectionsQueryKeys = queryKeysFactory(
  VENDOR_COLLECTIONS_QUERY_KEY
)

export const useVendorCollections = (
  query?: Record<string, any>,
  options?: Omit<
    UseQueryOptions<
      VendorCollectionListResponse,
      FetchError,
      VendorCollectionListResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: vendorCollectionsQueryKeys.list(query),
    queryFn: () =>
      fetchQuery("/vendor/collections", {
        method: "GET",
        query: query as { [k: string]: string | number },
      }),
    ...options,
  })
  return { ...data, ...rest }
}

export const useVendorCollection = (
  id: string,
  options?: Omit<
    UseQueryOptions<
      VendorCollectionResponse,
      FetchError,
      VendorCollectionResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: vendorCollectionsQueryKeys.detail(id),
    queryFn: () =>
      fetchQuery(`/vendor/collections/${id}`, { method: "GET" }),
    ...options,
  })
  return { ...data, ...rest }
}

export const useVendorCollectionPreview = (
  id: string,
  limit = 12,
  options?: Omit<
    UseQueryOptions<
      VendorCollectionPreviewResponse,
      FetchError,
      VendorCollectionPreviewResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: [
      ...vendorCollectionsQueryKeys.detail(id),
      "preview",
      limit,
    ] as const,
    queryFn: () =>
      fetchQuery(`/vendor/collections/${id}/preview`, {
        method: "GET",
        query: { limit },
      }),
    ...options,
  })
  return { ...data, ...rest }
}

export const useCreateVendorCollection = (
  options?: UseMutationOptions<
    VendorCollectionResponse,
    FetchError,
    CreateVendorCollectionPayload
  >
) =>
  useMutation({
    mutationFn: (body) =>
      fetchQuery("/vendor/collections", { method: "POST", body }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vendorCollectionsQueryKeys.lists(),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })

export const useUpdateVendorCollection = (
  id: string,
  options?: UseMutationOptions<
    VendorCollectionResponse,
    FetchError,
    UpdateVendorCollectionPayload
  >
) =>
  useMutation({
    mutationFn: (body) =>
      fetchQuery(`/vendor/collections/${id}`, { method: "POST", body }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vendorCollectionsQueryKeys.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: vendorCollectionsQueryKeys.detail(id),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })

export const useDeleteVendorCollection = (
  id: string,
  options?: UseMutationOptions<
    { id: string; object: string; deleted: boolean },
    FetchError,
    void
  >
) =>
  useMutation({
    mutationFn: () =>
      fetchQuery(`/vendor/collections/${id}`, { method: "DELETE" }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: vendorCollectionsQueryKeys.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: vendorCollectionsQueryKeys.detail(id),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
