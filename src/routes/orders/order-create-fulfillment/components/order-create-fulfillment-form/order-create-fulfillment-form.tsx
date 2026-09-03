import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import * as zod from "zod"

import { AdminOrder, HttpTypes } from "@medusajs/types"
import { Alert, Button, Switch, toast } from "@medusajs/ui"
import { useForm } from "react-hook-form"

import { OrderLineItemDTO } from "@medusajs/types"
import { Form } from "../../../../../components/common/form"
import {
  RouteFocusModal,
  useRouteModal,
} from "../../../../../components/modals"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import { useCreateOrderFulfillment } from "../../../../../hooks/api/orders"
import { useShippingSetup } from "../../../../../hooks/api/shipping-setup"
import { useStockLocations } from "../../../../../hooks/api/stock-locations"
import { getFulfillableQuantity } from "../../../../../lib/order-item"
import { CreateFulfillmentSchema } from "./constants"
import { OrderCreateFulfillmentItem } from "./order-create-fulfillment-item"
import { useReservationItems } from "../../../../../hooks/api"

type OrderCreateFulfillmentFormProps = {
  order: AdminOrder
  requiresShipping: boolean
}

/**
 * Sellers bake shipping into the product price and just ship — they never
 * pick a location, a shipping method or a shipping profile. So this dialog
 * is only "which items, how many, notify the buyer?". The server
 * (POST /vendor/shipping-setup, then the fulfillments route itself) owns the
 * location/option/profile chain and repairs it when it has drifted, which is
 * why nothing here filters items by shipping profile any more: that filter is
 * what used to silently post an empty item list and fail.
 */
export function OrderCreateFulfillmentForm({
  order,
  requiresShipping,
}: OrderCreateFulfillmentFormProps) {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()

  const { mutateAsync: createOrderFulfillment, isPending: isMutating } =
    useCreateOrderFulfillment(order.id)

  const {
    data: shippingSetup,
    isLoading: isSetupLoading,
    error: setupError,
  } = useShippingSetup()

  // Fallback only: if setup somehow fails but the seller does have a
  // location, still let them try — the server validates ownership.
  const { stock_locations = [] } = useStockLocations()
  const locationId = shippingSetup?.location_id ?? stock_locations[0]?.id

  const { reservations: reservationsRaw } = useReservationItems()

  const reservations = reservationsRaw?.filter((r) =>
    order.items.some((i) => i.id === r.line_item_id)
  )

  const itemReservedQuantitiesMap = useMemo(
    () =>
      new Map((reservations || []).map((r) => [r.line_item_id, r.quantity])),
    [reservations]
  )

  const [fulfillableItems, setFulfillableItems] = useState(() =>
    (order.items || []).filter(
      (item) =>
        item.requires_shipping === requiresShipping &&
        getFulfillableQuantity(item as any) > 0
    )
  )

  const form = useForm<zod.infer<typeof CreateFulfillmentSchema>>({
    defaultValues: {
      quantity: fulfillableItems.reduce(
        (acc, item) => {
          acc[item.id] = getFulfillableQuantity(item as any)
          return acc
        },
        {} as Record<string, number>
      ),
      send_notification: true,
    },
    resolver: zodResolver(CreateFulfillmentSchema),
  })

  const handleSubmit = form.handleSubmit(async (data) => {
    if (!locationId) {
      toast.error(t("orders.fulfillment.error.setupUnavailable"))
      return
    }

    const items = Object.entries(data.quantity)
      .filter(([, value]) => !!value && value > 0)
      .map(([id, quantity]) => ({ id, quantity }))

    if (!items.length) {
      form.setError("root", {
        type: "manual",
        message: t("orders.fulfillment.error.noItems"),
      })
      return
    }

    const payload: HttpTypes.AdminCreateOrderFulfillment & {
      requires_shipping: boolean
    } = {
      location_id: locationId,
      requires_shipping: requiresShipping,
      items,
    }

    try {
      await createOrderFulfillment(payload)

      toast.success(t("orders.fulfillment.toast.created"))
      handleSuccess(`/orders/${order.id}`)
    } catch (e: any) {
      toast.error(e.message)
    }
  })

  const fulfilledQuantityArray = (order.items || []).map(
    (item) =>
      item.requires_shipping === requiresShipping &&
      item.detail.fulfilled_quantity
  )

  useEffect(() => {
    const itemsToFulfill =
      order?.items?.filter(
        (item) =>
          item.requires_shipping === requiresShipping &&
          getFulfillableQuantity(item as OrderLineItemDTO) > 0
      ) || []

    setFulfillableItems(itemsToFulfill)

    if (itemsToFulfill.length) {
      form.clearErrors("root")
    } else {
      form.setError("root", {
        type: "manual",
        message: t("orders.fulfillment.error.noItems"),
      })
    }

    const quantityMap = itemsToFulfill.reduce(
      (acc, item) => {
        acc[item.id] = getFulfillableQuantity(item as OrderLineItemDTO)
        return acc
      },
      {} as Record<string, number>
    )

    form.setValue("quantity", quantityMap)
  }, [...fulfilledQuantityArray, requiresShipping])

  const setupFailed = !isSetupLoading && !locationId

  return (
    <RouteFocusModal.Form form={form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex h-full flex-col overflow-hidden"
      >
        <RouteFocusModal.Header />

        <RouteFocusModal.Body className="flex h-full w-full flex-col items-center divide-y overflow-y-auto">
          <div className="flex size-full flex-col items-center overflow-auto p-16">
            <div className="flex w-full max-w-[736px] flex-col justify-center px-2 pb-2">
              <div className="flex flex-col divide-y divide-dashed">
                {setupFailed && (
                  <Alert variant="error" dismissible={false} className="mb-8">
                    {setupError?.message ||
                      t("orders.fulfillment.error.setupUnavailable")}
                  </Alert>
                )}
                <div>
                  <Form.Item>
                    <Form.Label>
                      {t("orders.fulfillment.itemsToFulfill")}
                    </Form.Label>
                    <Form.Hint>
                      {t("orders.fulfillment.itemsToFulfillDesc")}
                    </Form.Hint>

                    <div className="flex flex-col gap-y-1">
                      {fulfillableItems.map((item) => (
                        <OrderCreateFulfillmentItem
                          key={item.id}
                          form={form}
                          item={item}
                          locationId={locationId}
                          currencyCode={order.currency_code}
                          onItemRemove={() => {}}
                          disabled={false}
                          itemReservedQuantitiesMap={itemReservedQuantitiesMap}
                        />
                      ))}
                    </div>
                  </Form.Item>
                  {form.formState.errors.root && (
                    <Alert
                      variant="error"
                      dismissible={false}
                      className="flex items-center"
                    >
                      {form.formState.errors.root.message}
                    </Alert>
                  )}
                </div>

                <div className="mt-8 pt-8 ">
                  <Form.Field
                    control={form.control}
                    name="send_notification"
                    render={({ field: { onChange, value, ...field } }) => {
                      return (
                        <Form.Item>
                          <div className="flex items-center justify-between">
                            <Form.Label>
                              {t("orders.returns.sendNotification")}
                            </Form.Label>
                            <Form.Control>
                              <Switch
                                checked={!!value}
                                onCheckedChange={onChange}
                                {...field}
                              />
                            </Form.Control>
                          </div>
                          <Form.Hint className="!mt-1">
                            {t("orders.fulfillment.sendNotificationHint")}
                          </Form.Hint>
                          <Form.ErrorMessage />
                        </Form.Item>
                      )
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </RouteFocusModal.Body>
        <RouteFocusModal.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteFocusModal.Close asChild>
              <Button size="small" variant="secondary">
                {t("actions.cancel")}
              </Button>
            </RouteFocusModal.Close>
            <Button
              size="small"
              type="submit"
              isLoading={isMutating || isSetupLoading}
              disabled={!locationId || !fulfillableItems.length}
            >
              {t("orders.fulfillment.create")}
            </Button>
          </div>
        </RouteFocusModal.Footer>
      </KeyboundForm>
    </RouteFocusModal.Form>
  )
}
