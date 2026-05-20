import { HttpTypes } from "@medusajs/types"
import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { TextCell } from "../../../components/table/table-cells/common/text-cell"
import { formatProvider } from "../../../lib/format-provider"

const columnHelper = createColumnHelper<HttpTypes.AdminFulfillmentProvider>()

export const useFulfillmentProviderTableColumns = () => {
  const { t } = useTranslation()

  return useMemo(
    () => [
      columnHelper.accessor("id", {
        // Bold the column header so it reads as a label, not a row value.
        // Without this, the "select all" checkbox next to "Provider" looks
        // like a second selectable row alongside the actual provider row
        // ("Manual") and people misread it.
        header: () => (
          <div className="flex h-full w-full items-center justify-start text-start">
            <span className="truncate font-semibold">Provider</span>
          </div>
        ),
        cell: ({ getValue }) => <TextCell text={formatProvider(getValue())} />,
      }),
    ],
    [t]
  )
}
