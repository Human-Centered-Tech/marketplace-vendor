import { Container, Heading, Text, Badge } from "@medusajs/ui"

import { useSetup } from "../../../../../hooks/api/setup"
import {
  PauseShopButton,
  ReopenShopButton,
} from "../../../../../components/store-status/store-status-actions"

// "Vacation mode" control on the store settings page. Lets a live vendor
// pause their shop and a paused vendor reopen it. Drafts (never went live)
// and admin-suspended stores show no control here — drafts go live from the
// dedicated Go Live page, suspensions are admin-resolved.
export const StoreStatusSection = () => {
  const { data, isPending } = useSetup()

  if (isPending || !data) return null

  const { store_status, is_on_vacation } = data.go_live
  const isLive = store_status === "ACTIVE"
  const isPaused = store_status === "INACTIVE" && is_on_vacation

  // Nothing to manage here for a draft or suspended store.
  if (!isLive && !isPaused) return null

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading>Vacation mode</Heading>
        {isLive ? (
          <Badge color="green" size="2xsmall">
            Live
          </Badge>
        ) : (
          <Badge color="orange" size="2xsmall">
            Paused
          </Badge>
        )}
      </div>
      <div className="flex items-center justify-between gap-x-4 px-6 py-4">
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {isLive
            ? "Going away for a while? Pause your shop to temporarily hide your products and stop new orders. Existing orders are unaffected."
            : "Your shop is paused — products are hidden and shoppers see an 'on vacation' notice. Reopen whenever you're ready."}
        </Text>
        {isLive ? <PauseShopButton /> : <ReopenShopButton />}
      </div>
    </Container>
  )
}
