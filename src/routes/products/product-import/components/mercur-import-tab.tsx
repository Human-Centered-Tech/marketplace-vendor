import { Heading, Text, toast } from "@medusajs/ui"
import { Trash } from "@medusajs/icons"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { FilePreview } from "../../../../components/common/file-preview"
import { useImportProducts } from "../../../../hooks/api"
import { useRouteModal } from "../../../../components/modals"

import { getProductImportCsvTemplate } from "../helpers/import-template"
import { ImportSummary } from "./import-summary"
import { UploadImport } from "./upload-import"

export const MercurImportTab = () => {
  const { t } = useTranslation()
  const [filename, setFilename] = useState<string>()
  const { mutateAsync: importProducts, isPending, data } = useImportProducts()
  const { handleSuccess } = useRouteModal()

  const templateContent = useMemo(() => getProductImportCsvTemplate(), [])

  const handleUploaded = async (file: File) => {
    setFilename(file.name)
    await importProducts(
      { file },
      {
        onSuccess: (data: any) => {
          const count = Array.isArray(data?.products) ? data.products.length : 0
          toast.success(
            count === 1
              ? "1 product imported as draft"
              : `${count} products imported as draft`,
            {
              description:
                "Review them in your product list, then bulk-publish when ready.",
            },
          )
          handleSuccess()
        },
        onError: (err) => {
          toast.error("Import failed", { description: err.message })
          setFilename(undefined)
        },
      },
    )
  }

  const uploadedFileActions = [
    {
      actions: [
        {
          label: t("actions.delete"),
          icon: <Trash />,
          onClick: () => setFilename(undefined),
        },
      ],
    },
  ]

  return (
    <div className="flex flex-col gap-y-6">
      <div>
        <Heading level="h2">{t("products.import.upload.title")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("products.import.upload.description")}
        </Text>
        <div className="mt-4">
          {filename ? (
            <FilePreview
              filename={filename}
              loading={isPending}
              activity={t("products.import.upload.preprocessing")}
              actions={uploadedFileActions}
            />
          ) : (
            <UploadImport onUploaded={handleUploaded} />
          )}
        </div>
        {data?.summary && !!filename && (
          <div className="mt-4">
            <ImportSummary summary={data.summary} />
          </div>
        )}
      </div>

      <div>
        <Heading level="h2">{t("products.import.template.title")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("products.import.template.description")}
        </Text>
        <div className="mt-4">
          <FilePreview
            filename={"product-import-template.csv"}
            url={templateContent}
          />
        </div>
      </div>
    </div>
  )
}
