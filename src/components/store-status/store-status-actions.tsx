import { Button, usePrompt, toast } from "@medusajs/ui"

import { usePauseShop, useReopenShop } from "../../hooks/api/vacation"

// Self-contained pause / reopen controls for vacation mode. Each wires the
// mutation + a confirmation prompt + toast feedback so they can be dropped
// into both the store settings card and the shell banner without
// duplicating logic.

type Props = {
  variant?: "primary" | "secondary" | "danger" | "transparent"
  size?: "small" | "base" | "large"
}

export const PauseShopButton = ({
  variant = "secondary",
  size = "small",
}: Props) => {
  const prompt = usePrompt()
  const { mutateAsync, isPending } = usePauseShop()

  const onClick = async () => {
    const confirmed = await prompt({
      title: "Pause your shop?",
      description:
        "Your products will be hidden and shoppers won't be able to place new orders. Existing orders are unaffected. You can reopen anytime.",
      confirmText: "Pause shop",
      cancelText: "Keep open",
    })
    if (!confirmed) return

    try {
      await mutateAsync()
      toast.success("Your shop is paused. Shoppers see an 'on vacation' notice.")
    } catch (e: any) {
      toast.error(e?.message || "Couldn't pause your shop. Please try again.")
    }
  }

  return (
    <Button variant={variant} size={size} isLoading={isPending} onClick={onClick}>
      Pause shop
    </Button>
  )
}

export const ReopenShopButton = ({
  variant = "primary",
  size = "small",
}: Props) => {
  const prompt = usePrompt()
  const { mutateAsync, isPending } = useReopenShop()

  const onClick = async () => {
    const confirmed = await prompt({
      title: "Reopen your shop?",
      description:
        "Your products will become visible again and shoppers can place orders.",
      confirmText: "Reopen shop",
      cancelText: "Stay paused",
    })
    if (!confirmed) return

    try {
      await mutateAsync()
      toast.success("Welcome back! Your shop is live again.")
    } catch (e: any) {
      toast.error(e?.message || "Couldn't reopen your shop. Please try again.")
    }
  }

  return (
    <Button variant={variant} size={size} isLoading={isPending} onClick={onClick}>
      Reopen shop
    </Button>
  )
}
