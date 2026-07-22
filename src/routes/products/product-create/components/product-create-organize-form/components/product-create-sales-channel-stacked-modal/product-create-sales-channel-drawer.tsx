import {
  Badge,
  Button,
  createDataTableColumnHelper,
  DataTableRowSelectionState,
  FocusModal,
  Heading,
  Text,
} from "@medusajs/ui"
import { HttpTypes } from "@medusajs/types"
import { useEffect, useMemo, useState } from "react"
import { UseFormReturn, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { keepPreviousData } from "@tanstack/react-query"
import { DataTable } from "../../../../../../../components/data-table"
import * as hooks from "../../../../../../../components/data-table/helpers/sales-channels"
import { useSalesChannels } from "../../../../../../../hooks/api/sales-channels"
import { ProductCreateSchemaType } from "../../../../types"

type ProductCreateSalesChannelStackedModalProps = {
  form: UseFormReturn<ProductCreateSchemaType>
}

const PAGE_SIZE = 50
const PREFIX = "sc"

export const ProductCreateSalesChannelStackedModal = ({
  form,
}: ProductCreateSalesChannelStackedModalProps) => {
  const { t } = useTranslation()
  const { getValues, setValue } = form

  const [open, setOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<DataTableRowSelectionState>(
    {}
  )
  const [state, setState] = useState<{ id: string; name: string }[]>([])

  // Live summary of the currently-selected channels for the card.
  const selectedChannels =
    useWatch({ control: form.control, name: "sales_channels" }) ?? []

  const searchParams = hooks.useSalesChannelTableQuery({
    pageSize: PAGE_SIZE,
    prefix: PREFIX,
  })
  const { sales_channels, count, isLoading, isError, error } = useSalesChannels(
    searchParams,
    {
      placeholderData: keepPreviousData,
    }
  )

  // Seed the modal's selection from the form each time it opens.
  useEffect(() => {
    if (!open) {
      return
    }

    const salesChannels = getValues("sales_channels")

    if (salesChannels) {
      setState(
        salesChannels.map((channel) => ({
          id: channel.id,
          name: channel.name,
        }))
      )

      setRowSelection(
        salesChannels.reduce(
          (acc, channel) => ({
            ...acc,
            [channel.id]: true,
          }),
          {}
        )
      )
    }
  }, [open, getValues])

  const onRowSelectionChange = (state: DataTableRowSelectionState) => {
    const ids = Object.keys(state)

    const addedIdsSet = new Set(
      ids.filter((id) => state[id] && !rowSelection[id])
    )

    let addedSalesChannels: { id: string; name: string }[] = []

    if (addedIdsSet.size > 0) {
      addedSalesChannels =
        sales_channels?.filter((channel) => addedIdsSet.has(channel.id)) ?? []
    }

    setState((prev) => {
      const filteredPrev = prev.filter((channel) => state[channel.id])
      return Array.from(new Set([...filteredPrev, ...addedSalesChannels]))
    })
    setRowSelection(state)
  }

  const handleAdd = () => {
    setValue("sales_channels", state, {
      shouldDirty: true,
      shouldTouch: true,
    })
    setOpen(false)
  }

  const filters = hooks.useSalesChannelTableFilters()
  const columns = useColumns()
  const emptyState = hooks.useSalesChannelTableEmptyState()

  if (isError) {
    throw error
  }

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex items-start justify-between gap-x-4">
        <div className="flex flex-col">
          <Text size="small" weight="plus" className="text-ui-fg-base">
            {t("products.fields.sales_channels.label", "Sales channels")}
          </Text>
          <Text size="small" className="text-ui-fg-subtle">
            {t(
              "products.fields.sales_channels.hint",
              "Choose which sales channels this product is available on."
            )}
          </Text>
        </div>
        <FocusModal open={open} onOpenChange={setOpen}>
          <FocusModal.Trigger asChild>
            <Button size="small" variant="secondary" type="button">
              {t("actions.edit")}
            </Button>
          </FocusModal.Trigger>
          <FocusModal.Content className="flex flex-col overflow-hidden">
            <FocusModal.Header>
              <Heading level="h2">
                {t("products.fields.sales_channels.label", "Sales channels")}
              </Heading>
            </FocusModal.Header>
            <FocusModal.Body className="flex flex-1 flex-col overflow-hidden">
              <DataTable
                data={sales_channels}
                columns={columns}
                filters={filters}
                emptyState={emptyState}
                rowCount={count}
                pageSize={PAGE_SIZE}
                getRowId={(row) => row.id}
                rowSelection={{
                  state: rowSelection,
                  onRowSelectionChange,
                }}
                isLoading={isLoading}
                layout="fill"
                prefix={PREFIX}
              />
            </FocusModal.Body>
            <FocusModal.Footer>
              <div className="flex items-center justify-end gap-x-2">
                <Button
                  size="small"
                  variant="secondary"
                  type="button"
                  onClick={() => setOpen(false)}
                >
                  {t("actions.cancel")}
                </Button>
                <Button size="small" onClick={handleAdd} type="button">
                  {t("actions.save")}
                </Button>
              </div>
            </FocusModal.Footer>
          </FocusModal.Content>
        </FocusModal>
      </div>
      <div className="flex flex-wrap gap-2">
        {selectedChannels.length > 0 ? (
          selectedChannels.map((channel) => (
            <Badge key={channel.id} size="2xsmall">
              {channel.name}
            </Badge>
          ))
        ) : (
          <Text size="small" className="text-ui-fg-muted">
            {t("general.none", "None")}
          </Text>
        )}
      </div>
    </div>
  )
}

const columnHelper = createDataTableColumnHelper<HttpTypes.AdminSalesChannel>()

const useColumns = () => {
  const base = hooks.useSalesChannelTableColumns()

  return useMemo(() => [columnHelper.select(), ...base], [base])
}
