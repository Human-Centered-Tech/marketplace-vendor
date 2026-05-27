import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslation } from "react-i18next"
import * as zod from "zod"

import {
  Button,
  Checkbox,
  Heading,
  Input,
  Label,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useState } from "react"
import { useFieldArray, useForm } from "react-hook-form"

import { Form } from "../../../../../components/common/form"
import {
  RouteFocusModal,
  useRouteModal,
} from "../../../../../components/modals"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import { useCreateOrderShipment } from "../../../../../hooks/api"
import { fetchQuery } from "../../../../../lib/client"
import {
  ExtendedAdminOrder,
  ExtendedAdminOrderFulfillment,
} from "../../../../../types/order"
import { CreateShipmentSchema } from "./constants"

type OrderCreateFulfillmentFormProps = {
  order: ExtendedAdminOrder
  fulfillment: ExtendedAdminOrderFulfillment
}

export function OrderCreateShipmentForm({
  order,
  fulfillment,
}: OrderCreateFulfillmentFormProps) {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()

  const { mutateAsync: createShipment, isPending: isMutating } =
    useCreateOrderShipment(order.id, fulfillment?.id)

  const form = useForm<zod.infer<typeof CreateShipmentSchema>>({
    // Start with one empty tracking-number field so it's always visible —
    // vendors shouldn't have to click "add" to reveal it.
    defaultValues: { labels: [{ tracking_number: "" }] },
    resolver: zodResolver(CreateShipmentSchema),
  })

  const { fields: labels, append } = useFieldArray({
    name: "labels",
    control: form.control,
  })

  // When the order genuinely has no tracking number, the vendor confirms it
  // here, which reveals the free-text shipping comment box.
  const [noTracking, setNoTracking] = useState(false)

  const handleSubmit = form.handleSubmit(async (data) => {
    // Persist the shipping note FIRST, before creating the shipment.
    // Creating the shipment emits shipment.created, which triggers the
    // buyer "order shipped" email — that email reads the note off the
    // order, so it must already be saved. Order matters here.
    const note = (data.shipping_note ?? "").trim()
    try {
      await fetchQuery(`/vendor/orders/${order.id}/shipping-note`, {
        method: "POST",
        body: { shipping_note: note || null },
      })
    } catch (e) {
      // Don't block shipping if the note save fails — the order still
      // ships, the buyer just won't see the note. Surface it though.
      if (e instanceof Error) {
        toast.error(`Couldn't save shipping note: ${e.message}`)
      }
    }

    await createShipment(
      {
        items:
          fulfillment?.items
            ?.map((i) => ({ id: i?.line_item_id, quantity: i.quantity }))
            .filter((item) => !!item.id) ?? [],
        labels: data.labels
          .filter((l) => !!l.tracking_number)
          .map((l) => ({
            tracking_number: l.tracking_number,
            tracking_url: "#",
            label_url: "#"
            ,
          })),
      },
      {
        onSuccess: () => {
          toast.success(t("orders.shipment.toastCreated"))
          handleSuccess(`/orders/${order.id}`)
        },
        onError: (e) => {
          toast.error(e.message)
        },
      }
    )
  })

  return (
    <RouteFocusModal.Form form={form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex h-full flex-col overflow-hidden"
      >
        <RouteFocusModal.Header>
          <div className="flex items-center justify-end gap-x-2">
            <RouteFocusModal.Close asChild>
              <Button size="small" variant="secondary">
                {t("actions.cancel")}
              </Button>
            </RouteFocusModal.Close>
            <Button size="small" type="submit" isLoading={isMutating}>
              {t("actions.save")}
            </Button>
          </div>
        </RouteFocusModal.Header>
        <RouteFocusModal.Body className="flex h-full w-full flex-col items-center divide-y overflow-y-auto">
          <div className="flex size-full flex-col items-center overflow-auto p-16">
            <div className="flex w-full max-w-[736px] flex-col justify-center px-2 pb-2">
              <div className="flex flex-col divide-y">
                <div className="flex flex-1 flex-col">
                  <Heading className="mb-4">
                    {t("orders.shipment.title")}
                  </Heading>

                  {labels.map((label, index) => (
                    <Form.Field
                      key={label.id}
                      control={form.control}
                      name={`labels.${index}.tracking_number`}
                      render={({ field }) => {
                        return (
                          <Form.Item className="mb-4">
                            {index === 0 && (
                              <Form.Label optional>Tracking number</Form.Label>
                            )}
                            <Form.Control>
                              <Input
                                {...field}
                                placeholder="e.g. 9400 1000 0000 0000 0000 00"
                              />
                            </Form.Control>
                            <Form.ErrorMessage />
                          </Form.Item>
                        )
                      }}
                    />
                  ))}

                  <Button
                    type="button"
                    onClick={() => append({ tracking_number: "" })}
                    className="self-end"
                    variant="secondary"
                  >
                    Add another tracking number
                  </Button>

                  <div className="mt-6 flex items-center gap-x-2">
                    <Checkbox
                      id="no-tracking-number"
                      checked={noTracking}
                      onCheckedChange={(checked) => {
                        const value = checked === true
                        setNoTracking(value)
                        // Don't submit a stale note if they uncheck it.
                        if (!value) form.setValue("shipping_note", "")
                      }}
                    />
                    <Label htmlFor="no-tracking-number" weight="plus">
                      This order has no tracking number
                    </Label>
                  </div>

                  {noTracking && (
                    <Form.Field
                      control={form.control}
                      name="shipping_note"
                      render={({ field }) => (
                        <Form.Item className="mt-4">
                          <Form.Label optional>Shipping comment</Form.Label>
                          <span className="text-ui-fg-subtle text-xs">
                            Shown to the buyer in their shipped-order email —
                            explain how it was sent (e.g. &quot;Mailed via USPS
                            First Class — no tracking&quot;).
                          </span>
                          <Form.Control>
                            <Textarea
                              {...field}
                              rows={3}
                              placeholder="Add a shipping note for the buyer (optional)"
                            />
                          </Form.Control>
                          <Form.ErrorMessage />
                        </Form.Item>
                      )}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </RouteFocusModal.Body>
      </KeyboundForm>
    </RouteFocusModal.Form>
  )
}
