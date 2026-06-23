import { Button, Container, Heading, Text, Textarea } from "@medusajs/ui"
import { useEffect, useRef, useState } from "react"
import { queryClient } from "../../lib/query-client"
import {
  messagingKeys,
  notifyVendorTyping,
  useMarkVendorRead,
  useSendVendorMessage,
  useVendorConversation,
  useVendorConversations,
  useVendorMessagingStream,
} from "../../hooks/api/messaging"

export const Messages = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [typing, setTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastTyping = useRef(0)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: listData, isLoading } = useVendorConversations()
  const conversations = listData?.conversations || []

  const { data: detail } = useVendorConversation(selectedId || undefined)
  const messages = detail?.conversation.messages || []
  const viewer = detail?.viewer_id || listData?.viewer_id || ""

  const sendMut = useSendVendorMessage(selectedId || "")
  const markRead = useMarkVendorRead()

  useEffect(() => {
    if (selectedId) markRead.mutate(selectedId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, messages.length])

  useVendorMessagingStream({
    onMessage: (e) => {
      if (e.conversation_id === selectedId) {
        queryClient.invalidateQueries({
          queryKey: messagingKeys.detail(selectedId),
        })
      }
      queryClient.invalidateQueries({ queryKey: messagingKeys.list })
    },
    onRead: (e) => {
      if (e.conversation_id === selectedId) {
        queryClient.invalidateQueries({
          queryKey: messagingKeys.detail(selectedId),
        })
      }
    },
    onTyping: (e) => {
      if (e.conversation_id === selectedId && e.sender_id !== viewer) {
        setTyping(true)
        if (typingTimer.current) clearTimeout(typingTimer.current)
        typingTimer.current = setTimeout(() => setTyping(false), 4000)
      }
    },
  })

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length, typing])

  const onDraft = (v: string) => {
    setDraft(v)
    if (!selectedId) return
    const now = Date.now()
    if (now - lastTyping.current > 2000) {
      lastTyping.current = now
      notifyVendorTyping(selectedId)
    }
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedId || !draft.trim()) return
    sendMut.mutate(draft.trim(), { onSuccess: () => setDraft("") })
  }

  const otherId = (c: { participant_a_id: string; participant_b_id: string }) =>
    c.participant_a_id === viewer ? c.participant_b_id : c.participant_a_id

  const contextLabel = (t: string) =>
    t === "product"
      ? "Product inquiry"
      : t === "barter_listing"
        ? "Trade"
        : t === "storefront"
          ? "Storefront"
          : "Conversation"

  return (
    <Container className="divide-y p-0 min-h-[700px]">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading>Messages</Heading>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] h-[655px]">
        {/* Conversation list */}
        <aside className="border-r overflow-y-auto">
          {isLoading ? (
            <div className="p-6">
              <Text size="small" className="text-ui-fg-subtle">
                Loading…
              </Text>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6">
              <Text size="small" className="text-ui-fg-subtle">
                No conversations yet.
              </Text>
            </div>
          ) : (
            <ul>
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left px-4 py-3 border-b hover:bg-ui-bg-base-hover ${
                      selectedId === c.id ? "bg-ui-bg-base-hover" : ""
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <Text
                        size="xsmall"
                        weight="plus"
                        className="uppercase text-ui-fg-muted"
                      >
                        {contextLabel(c.context_type)}
                      </Text>
                      {c.last_message_at && (
                        <Text size="xsmall" className="text-ui-fg-subtle">
                          {new Date(c.last_message_at).toLocaleDateString()}
                        </Text>
                      )}
                    </div>
                    <Text size="small" weight="plus" className="truncate">
                      {otherId(c).slice(0, 18)}…
                    </Text>
                    {c.last_message_preview && (
                      <Text
                        size="xsmall"
                        className="text-ui-fg-subtle truncate"
                      >
                        {c.last_message_preview}
                      </Text>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Thread */}
        <section className="flex flex-col">
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center">
              <Text className="text-ui-fg-subtle">Select a conversation</Text>
            </div>
          ) : (
            <>
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3"
              >
                {messages.map((m) => {
                  const mine = m.sender_id === viewer
                  return (
                    <div
                      key={m.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg px-3 py-2 ${
                          mine
                            ? "bg-ui-bg-interactive text-ui-fg-on-color"
                            : "bg-ui-bg-component"
                        }`}
                      >
                        {m.body && (
                          <Text
                            size="small"
                            className={`whitespace-pre-wrap ${
                              mine ? "text-ui-fg-on-color" : ""
                            }`}
                          >
                            {m.body}
                          </Text>
                        )}
                        {m.attachments && m.attachments.length > 0 && (
                          <div className="mt-2 flex flex-col gap-2">
                            {m.attachments.map((a, i) =>
                              a.type === "application/pdf" ? (
                                <a
                                  key={i}
                                  href={a.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs underline"
                                >
                                  📄 {a.name || "Attachment.pdf"}
                                </a>
                              ) : (
                                <a
                                  key={i}
                                  href={a.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <img
                                    src={a.url}
                                    alt={a.name || "attachment"}
                                    className="max-w-[220px] max-h-[220px] rounded-md"
                                  />
                                </a>
                              )
                            )}
                          </div>
                        )}
                        <Text
                          size="xsmall"
                          className={
                            mine
                              ? "text-ui-fg-on-color opacity-70"
                              : "text-ui-fg-subtle"
                          }
                        >
                          {new Date(m.created_at).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          {mine && m.read_at ? " · Read" : ""}
                        </Text>
                      </div>
                    </div>
                  )
                })}
                {typing && (
                  <div className="flex justify-start">
                    <div className="rounded-lg px-3 py-2 bg-ui-bg-component">
                      <Text size="small" className="text-ui-fg-subtle italic">
                        typing…
                      </Text>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleSend} className="border-t p-3 flex gap-2">
                <Textarea
                  value={draft}
                  onChange={(e) => onDraft(e.target.value)}
                  placeholder="Type a message…"
                  rows={1}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={sendMut.isPending || !draft.trim()}
                >
                  Send
                </Button>
              </form>
            </>
          )}
        </section>
      </div>
    </Container>
  )
}
