import { Container, Heading, Switch, Text, toast } from "@medusajs/ui"
import { useParams } from "react-router-dom"

import {
  usePromotionFirstTime,
  useSetPromotionFirstTime,
} from "../../../../../hooks/api/promotions"

// Sidebar toggle on the promotion detail page. When on, the code only works
// for a customer's first order from this shop — enforced server-side at
// promo-apply time (backend: cart-validate-first-time-promo hook).
export const PromotionFirstTimeSection = () => {
  const { id } = useParams()
  const { first_time_only, isLoading } = usePromotionFirstTime(id!)
  const { mutate, isPending } = useSetPromotionFirstTime(id!)

  return (
    <Container>
      <div className="flex items-center justify-between">
        <Heading level="h2">First-time buyers only</Heading>
        <Switch
          checked={Boolean(first_time_only)}
          disabled={isLoading || isPending}
          onCheckedChange={(checked) =>
            mutate(checked, {
              onSuccess: () =>
                toast.success(
                  checked
                    ? "Promotion limited to first-time buyers"
                    : "First-time-buyers restriction removed"
                ),
              onError: () =>
                toast.error("Could not update the first-time-buyers setting"),
            })
          }
        />
      </div>
      <Text size="small" className="text-ui-fg-subtle mt-2">
        When enabled, this code only works on a customer's first order from your
        shop. Customers who have ordered from you before will have the code
        rejected at checkout.
      </Text>
    </Container>
  )
}
