import { useMutation, useQuery } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { fetchQuery } from "../../lib/client"
import { queryClient } from "../../lib/query-client"
import {
  subscribeVendorMessaging,
  VendorStreamEvent,
} from "../../lib/messaging-stream"

export type VConversation = {
  id: string
  context_type: "product" | "barter_listing" | "storefront" | "general"
  context_id: string | null
  participant_a_id: string
  participant_b_id: string
  last_message_at: string | null
  last_message_preview: string | null
  created_at: string
  updated_at: string
}

export type VMessage = {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  read_at: string | null
  created_at: string
}

export const messagingKeys = {
  list: ["vendor-messaging", "conversations"] as const,
  detail: (id: string) => ["vendor-messaging", "conversation", id] as const,
  unread: ["vendor-messaging", "unread"] as const,
}

export const useVendorConversations = () =>
  useQuery<{ conversations: VConversation[]; count: number; viewer_id: string }>(
    {
      queryKey: messagingKeys.list,
      queryFn: async () =>
        await fetchQuery("/vendor/messaging/conversations", { method: "GET" }),
    }
  )

export const useVendorConversation = (id?: string) =>
  useQuery<{
    conversation: VConversation & { messages: VMessage[] }
    viewer_id: string
  }>({
    enabled: !!id,
    queryKey: messagingKeys.detail(id || ""),
    queryFn: async () =>
      await fetchQuery(`/vendor/messaging/conversations/${id}`, {
        method: "GET",
      }),
  })

export const useVendorUnreadCount = () =>
  useQuery<{ unread_messages: number; unread_conversations: number }>({
    queryKey: messagingKeys.unread,
    queryFn: async () =>
      await fetchQuery("/vendor/messaging/unread-count", { method: "GET" }),
    retry: false,
  })

export const useSendVendorMessage = (id: string) =>
  useMutation({
    mutationFn: async (body: string) =>
      await fetchQuery(`/vendor/messaging/conversations/${id}/messages`, {
        method: "POST",
        body: { body },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: messagingKeys.list })
    },
  })

export const useMarkVendorRead = () =>
  useMutation({
    mutationFn: async (id: string) =>
      await fetchQuery(`/vendor/messaging/conversations/${id}/read`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.unread })
      queryClient.invalidateQueries({ queryKey: messagingKeys.list })
    },
  })

export const notifyVendorTyping = (id: string) =>
  fetchQuery(`/vendor/messaging/conversations/${id}/typing`, {
    method: "POST",
  }).catch(() => {})

type StreamHandlers = {
  onMessage?: (e: VendorStreamEvent) => void
  onRead?: (e: VendorStreamEvent) => void
  onTyping?: (e: VendorStreamEvent) => void
}

/** Subscribe to the realtime vendor messaging stream. */
export function useVendorMessagingStream(handlers: StreamHandlers) {
  const ref = useRef(handlers)
  ref.current = handlers
  useEffect(() => {
    return subscribeVendorMessaging((evt) => {
      if (evt.type === "message.created") ref.current.onMessage?.(evt)
      else if (evt.type === "conversation.read") ref.current.onRead?.(evt)
      else if (evt.type === "typing") ref.current.onTyping?.(evt)
    })
  }, [])
}

/** Live unread-message count for nav badges (refreshes on realtime events). */
export function useUnreadMessages(): number {
  const { data, refetch } = useVendorUnreadCount()
  useVendorMessagingStream({
    onMessage: () => {
      refetch()
    },
    onRead: () => {
      refetch()
    },
  })
  return data?.unread_messages ?? 0
}
