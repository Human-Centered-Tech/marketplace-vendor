import { Button, Container, Heading, Text, Textarea } from "@medusajs/ui"
import { useEffect, useRef, useState } from "react"
import { queryClient } from "../../lib/query-client"
import { uploadFilesQuery } from "../../lib/client/client"
import { useProduct } from "../../hooks/api/products"
import {
  messagingKeys,
  notifyVendorTyping,
  useMarkVendorRead,
  useSendVendorMessage,
  useVendorConversation,
  useVendorConversations,
  useVendorMessagingStream,
  type VConversation,
  type VMessageAttachment,
} from "../../hooks/api/messaging"

const ATTACH_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "application/pdf",
]

const contextLabel = (t: string) =>
  t === "product"
    ? "Product inquiry"
    : t === "barter_listing"
      ? "Trade"
      : t === "storefront"
        ? "Storefront"
        : "Conversation"

// Friendly name for the person on the other side of the conversation. The
// messaging API doesn't return the other participant's name yet — only their
// customer id — so prefer a backend-provided `counterparty_name` when present
// and otherwise fall back to a role label rather than showing a raw id.
const counterpartyName = (c: VConversation) => {
  const name = c.counterparty_name?.trim()
  if (name) {
    return name
  }
  return c.context_type === "barter_listing" ? "Trade partner" : "Customer"
}

// Resolve the related product's title for a product-inquiry conversation.
// These are the vendor's own products, so /vendor/products/:id is authorized.
// Prefers a backend-provided `context_title` if/when the API starts sending it.
const useContextTitle = (c?: VConversation) => {
  const isProduct = c?.context_type === "product" && !!c?.context_id
  const { product } = useProduct(
    c?.context_id || "",
    { fields: "id,title" },
    { enabled: isProduct, retry: false, staleTime: 5 * 60 * 1000 }
  )
  return c?.context_title?.trim() || (isProduct ? product?.title : undefined)
}

const ConversationRow = ({
  c,
  selected,
  onSelect,
}: {
  c: VConversation
  selected: boolean
  onSelect: () => void
}) => {
  const productTitle = useContextTitle(c)
  return (
    <li>
      <button
        onClick={onSelect}
        className={`w-full text-left px-4 py-3 border-b hover:bg-ui-bg-base-hover ${
          selected ? "bg-ui-bg-base-hover" : ""
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
          {counterpartyName(c)}
        </Text>
        {productTitle && (
          <Text size="xsmall" className="text-ui-fg-subtle truncate">
            Re: {productTitle}
          </Text>
        )}
        {c.last_message_preview && (
          <Text size="xsmall" className="text-ui-fg-subtle truncate">
            {c.last_message_preview}
          </Text>
        )}
      </button>
    </li>
  )
}

export const Messages = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [typing, setTyping] = useState(false)
  const [pendingAttachments, setPendingAttachments] = useState<VMessageAttachment[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  const onAttachFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return
    const files = Array.from(fileList)
      .filter((f) => ATTACH_TYPES.includes(f.type))
      .slice(0, 5)
    if (!files.length) return
    setUploading(true)
    try {
      const res: any = await uploadFilesQuery(files.map((file) => ({ file })))
      const uploaded: any[] = Array.isArray(res) ? res : res?.files ?? []
      const atts = files
        .map((f, i) => ({
          url: uploaded[i]?.url as string,
          type: f.type,
          name: f.name,
          size: f.size,
        }))
        .filter((a) => a.url)
      setPendingAttachments((prev) => [...prev, ...atts])
    } catch {
      // swallow — merchant can retry
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedId || (!draft.trim() && pendingAttachments.length === 0)) return
    sendMut.mutate(
      { body: draft.trim(), attachments: pendingAttachments },
      {
        onSuccess: () => {
          setDraft("")
          setPendingAttachments([])
        },
      }
    )
  }

  const selectedConversation = detail?.conversation
  const headerProductTitle = useContextTitle(selectedConversation)

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
                <ConversationRow
                  key={c.id}
                  c={c}
                  selected={selectedId === c.id}
                  onSelect={() => setSelectedId(c.id)}
                />
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
              <div className="border-b px-4 py-3">
                {selectedConversation && (
                  <Text
                    size="xsmall"
                    weight="plus"
                    className="uppercase text-ui-fg-muted"
                  >
                    {contextLabel(selectedConversation.context_type)}
                  </Text>
                )}
                <Heading level="h3" className="truncate">
                  {selectedConversation
                    ? counterpartyName(selectedConversation)
                    : ""}
                </Heading>
                {headerProductTitle && (
                  <Text size="small" className="text-ui-fg-subtle truncate">
                    Re: {headerProductTitle}
                  </Text>
                )}
              </div>
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

              <form onSubmit={handleSend} className="border-t p-3 flex flex-col gap-2">
                {pendingAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {pendingAttachments.map((a, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1 bg-ui-bg-component rounded px-2 py-1 text-xs"
                      >
                        {a.type === "application/pdf" ? "📄" : "🖼️"}
                        <span className="max-w-[120px] truncate">
                          {a.name || "attachment"}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setPendingAttachments((prev) =>
                              prev.filter((_, idx) => idx !== i)
                            )
                          }
                          className="text-ui-fg-error"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => onAttachFiles(e.target.files)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={uploading || sendMut.isPending}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? "…" : "Attach"}
                  </Button>
                  <Textarea
                    value={draft}
                    onChange={(e) => onDraft(e.target.value)}
                    placeholder="Type a message…"
                    rows={1}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={
                      sendMut.isPending ||
                      uploading ||
                      (!draft.trim() && pendingAttachments.length === 0)
                    }
                  >
                    Send
                  </Button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </Container>
  )
}
