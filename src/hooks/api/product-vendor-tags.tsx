import { FetchError } from "@medusajs/js-sdk"
import {
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
} from "@tanstack/react-query"
import { fetchQuery } from "../../lib/client"
import { queryClient } from "../../lib/query-client"
import { productsQueryKeys } from "./products"

type ProductVendorTag = {
  id: string
  value: string
  label: string | null
}

type ProductVendorTagsResponse = {
  product_tags: ProductVendorTag[]
}

type SetProductVendorTagsPayload = {
  tag_ids: string[]
}

type SetProductVendorTagsResponse = {
  product_id: string
  tag_ids: string[]
}

const keyFor = (productId: string) => [
  "products",
  "detail",
  productId,
  "vendor-tags",
]

export const useProductVendorTags = (
  productId: string,
  options?: Omit<
    UseQueryOptions<
      ProductVendorTagsResponse,
      FetchError,
      ProductVendorTagsResponse,
      ReturnType<typeof keyFor>
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: keyFor(productId),
    queryFn: () =>
      fetchQuery(`/vendor/products/${productId}/vendor-tags`, {
        method: "GET",
      }),
    ...options,
  })

  return { ...data, ...rest }
}

export const useSetProductVendorTags = (
  productId: string,
  options?: UseMutationOptions<
    SetProductVendorTagsResponse,
    FetchError,
    SetProductVendorTagsPayload
  >
) =>
  useMutation({
    mutationFn: (body) =>
      fetchQuery(`/vendor/products/${productId}/vendor-tags`, {
        method: "POST",
        body,
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: keyFor(productId) })
      queryClient.invalidateQueries({
        queryKey: productsQueryKeys.detail(productId),
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
