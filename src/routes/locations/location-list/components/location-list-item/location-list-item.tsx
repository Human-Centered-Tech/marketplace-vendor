import { Buildings, PencilSquare } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Container, StatusBadge, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { ActionMenu } from "../../../../../components/common/action-menu"
// import { BadgeListSummary } from "../../../../../components/common/badge-list-summary"
import { LinkButton } from "../../../../../components/common/link-button"
import { getFormattedAddress } from "../../../../../lib/addresses"
import { FulfillmentSetType } from "../../../common/constants"

// type SalesChannelsProps = {
//   salesChannels?: HttpTypes.AdminSalesChannel[] | null
// }

// function SalesChannels(props: SalesChannelsProps) {
//   const { t } = useTranslation()
//   const { salesChannels } = props

//   return (
//     <div className="flex flex-col px-6 py-4">
//       <div className="flex items-center justify-between">
//         <Text
//           size="small"
//           weight="plus"
//           className="text-ui-fg-subtle flex-1"
//           as="div"
//         >
//           {t(`stockLocations.salesChannels.label`)}
//         </Text>
//         <div className="flex-1 text-left">
//           {salesChannels?.length ? (
//             <BadgeListSummary
//               rounded
//               inline
//               n={3}
//               list={salesChannels.map((s) => s.name)}
//             />
//           ) : (
//             "-"
//           )}
//         </div>
//       </div>
//     </div>
//   )
// }

type FulfillmentSetProps = {
  fulfillmentSet?: HttpTypes.AdminFulfillmentSet
  type: FulfillmentSetType
}

function FulfillmentSet(props: FulfillmentSetProps) {
  const { t } = useTranslation()
  const { fulfillmentSet, type } = props

  const fulfillmentSetExists = !!fulfillmentSet

  return (
    <div className="flex flex-col px-6 py-4">
      <div className="flex items-center justify-between">
        <Text
          size="small"
          weight="plus"
          className="text-ui-fg-subtle flex-1"
          as="div"
        >
          {t(`stockLocations.fulfillmentSets.${type}.header`)}
        </Text>
        <div className="flex-1 text-left">
          <StatusBadge color={fulfillmentSetExists ? "green" : "grey"}>
            {t(fulfillmentSetExists ? "statuses.enabled" : "statuses.disabled")}
          </StatusBadge>
        </div>
      </div>
    </div>
  )
}

type LocationProps = {
  location: HttpTypes.AdminStockLocation
}

function LocationListItem(props: LocationProps) {
  const { location } = props
  const { t } = useTranslation()

  return (
    <Container className="flex flex-col divide-y p-0">
      <div className="px-6 py-4">
        <div className="flex flex-row items-center justify-between gap-x-4">
          <div className="shadow-borders-base flex size-7 items-center justify-center rounded-md">
            <div className="bg-ui-bg-field flex size-6 items-center justify-center rounded-[4px]">
              <Buildings className="text-ui-fg-subtle" />
            </div>
          </div>

          <div className="grow-1 flex flex-1 flex-col">
            <Text weight="plus">{location.name}</Text>
            <Text className="text-ui-fg-subtle txt-small">
              {getFormattedAddress({
                address: location.address,
              }).join(", ")}
            </Text>
          </div>

          <div className="flex grow-0 items-center gap-4">
            {/*
              No Delete. A seller has exactly one stock location, and deleting
              it cascades away the fulfillment set, service zones and shipping
              options beneath — leaving carts with their products dead-ended on
              "No shipping options are available for this address". That is how
              Chain of Joy became unbuyable on 2026-07-03. The backend
              middleware (reprovision-seller-shipping) re-provisions afterwards,
              but a merchant should not be able to walk into it at all.
            */}
            <ActionMenu
              groups={[
                {
                  actions: [
                    {
                      label: t("actions.edit"),
                      icon: <PencilSquare />,
                      to: `/settings/locations/${location.id}/edit`,
                    },
                  ],
                },
              ]}
            />
            <div className="bg-ui-border-strong h-[12px] w-[1px]" />
            <LinkButton to={`/settings/locations/${location.id}`}>
              {t("actions.viewDetails")}
            </LinkButton>
          </div>
        </div>
      </div>

      {/* <SalesChannels salesChannels={location.sales_channels} /> */}

      <FulfillmentSet
        type={FulfillmentSetType.Pickup}
        fulfillmentSet={location.fulfillment_sets?.find(
          (f) => f.type === FulfillmentSetType.Pickup
        )}
      />
      <FulfillmentSet
        type={FulfillmentSetType.Shipping}
        fulfillmentSet={location.fulfillment_sets?.find(
          (f) => f.type === FulfillmentSetType.Shipping
        )}
      />
    </Container>
  )
}

export default LocationListItem
