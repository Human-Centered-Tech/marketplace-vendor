import { backendUrl, publishableApiKey } from "./client"

export type VendorStreamEvent = {
  type: "message.created" | "conversation.read" | "typing"
  conversation_id: string
  sender_id?: string
  recipient_id?: string
  reader_id?: string
  message?: {
    id: string
    conversation_id: string
    sender_id: string
    body: string
    created_at: string
  }
}

// A single shared SSE connection fans out to all subscribers. The vendor SPA
// is a static build (no same-origin proxy), and EventSource can't send the
// seller bearer token, so we use a fetch + ReadableStream reader that sets the
// auth header, parses SSE frames, and reconnects with backoff.

const handlers = new Set<(e: VendorStreamEvent) => void>()
let stop: (() => void) | null = null

function startConnection() {
  let closed = false
  let controller: AbortController | null = null

  const loop = async () => {
    while (!closed) {
      controller = new AbortController()
      try {
        const bearer = window.localStorage.getItem("medusa_auth_token") || ""
        const res = await fetch(`${backendUrl}/vendor/messaging/stream`, {
          headers: {
            authorization: `Bearer ${bearer}`,
            "x-publishable-api-key": publishableApiKey,
            accept: "text/event-stream",
          },
          signal: controller.signal,
        })
        if (!res.ok || !res.body) throw new Error(`stream ${res.status}`)

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (!closed) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          let sep: number
          while ((sep = buffer.indexOf("\n\n")) !== -1) {
            const frame = buffer.slice(0, sep)
            buffer = buffer.slice(sep + 2)
            let data = ""
            for (const line of frame.split("\n")) {
              if (line.startsWith("data:")) data += line.slice(5).trim()
            }
            if (data) {
              try {
                const evt = JSON.parse(data) as VendorStreamEvent
                handlers.forEach((h) => h(evt))
              } catch {
                /* ignore malformed frame */
              }
            }
          }
        }
      } catch {
        /* network/abort — fall through to reconnect */
      }
      if (closed) break
      await new Promise((r) => setTimeout(r, 3000))
    }
  }

  loop()

  return () => {
    closed = true
    controller?.abort()
  }
}

export function subscribeVendorMessaging(
  onEvent: (e: VendorStreamEvent) => void
): () => void {
  handlers.add(onEvent)
  if (!stop) {
    stop = startConnection()
  }
  return () => {
    handlers.delete(onEvent)
    if (handlers.size === 0 && stop) {
      stop()
      stop = null
    }
  }
}
