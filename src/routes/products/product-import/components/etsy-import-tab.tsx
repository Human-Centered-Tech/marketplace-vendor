import { Button, Heading, Hint, Text, toast } from "@medusajs/ui"
import { Spinner, Trash } from "@medusajs/icons"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { FilePreview } from "../../../../components/common/file-preview"
import { FileType, FileUpload } from "../../../../components/common/file-upload"
import { useImportProducts } from "../../../../hooks/api"
import { useRouteModal } from "../../../../components/modals"

import { buildMercurFileFromEtsy, MappingResult } from "../helpers/etsy-mapper"

import { MappingPreview } from "./mapping-preview"

const SUPPORTED_FORMATS = ["text/csv"]
const SUPPORTED_FORMATS_FILE_EXTENSIONS = [".csv"]

type LocalFile = { file: File; text: string }

export const EtsyImportTab = () => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()

  const [listingsFile, setListingsFile] = useState<LocalFile>()
  const [mapping, setMapping] = useState<MappingResult>()
  const [parseError, setParseError] = useState<string>()
  const [uploadError, setUploadError] = useState<string>()

  const { mutateAsync: importProducts, isPending } = useImportProducts()

  const hasInvalidFile = (files: FileType[]): boolean => {
    return files.some((f) => !SUPPORTED_FORMATS.includes(f.file.type))
  }

  const readText = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result ?? ""))
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    })

  const runMapping = async (listings: LocalFile | undefined) => {
    setParseError(undefined)
    setUploadError(undefined)
    if (!listings) {
      setMapping(undefined)
      return
    }
    try {
      const result = await buildMercurFileFromEtsy({
        listingsCsvText: listings.text,
      })
      setMapping(result)
    } catch (err) {
      setParseError((err as Error).message)
      setMapping(undefined)
    }
  }

  const handleListingsUpload = async (files: FileType[]) => {
    if (hasInvalidFile(files)) {
      setParseError(
        t("products.media.invalidFileType", {
          name: files[0]?.file.name ?? "",
          types: SUPPORTED_FORMATS_FILE_EXTENSIONS.join(", "),
        }),
      )
      return
    }
    const file = files[0].file
    const text = await readText(file)
    const next = { file, text }
    setListingsFile(next)
    await runMapping(next)
  }

  const handleClearListings = async () => {
    setListingsFile(undefined)
    await runMapping(undefined)
  }

  const handleContinue = async () => {
    if (!mapping || mapping.empty) return
    setUploadError(undefined)
    await importProducts(
      { file: mapping.file },
      {
        onSuccess: () => {
          toast.info(t("products.import.success.title"))
          handleSuccess()
        },
        onError: (err) => {
          setUploadError(err.message)
          toast.error(err.message)
        },
      },
    )
  }

  const listingsActions = [
    {
      actions: [
        {
          label: t("actions.delete"),
          icon: <Trash />,
          onClick: handleClearListings,
        },
      ],
    },
  ]

  return (
    <div className="flex flex-col gap-y-6">
      <div className="bg-ui-bg-subtle text-ui-fg-subtle rounded-md p-3 text-xs">
        <Heading level="h3" className="text-ui-fg-base text-xs font-medium">
          {t("products.import.etsy.howTo.title")}
        </Heading>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>{t("products.import.etsy.howTo.step1")}</li>
          <li>{t("products.import.etsy.howTo.step2")}</li>
          <li>{t("products.import.etsy.howTo.step3")}</li>
        </ol>
      </div>

      <div>
        <Heading level="h2">{t("products.import.etsy.listings.title")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("products.import.etsy.listings.description")}
        </Text>
        <div className="mt-3">
          {listingsFile ? (
            <FilePreview
              filename={listingsFile.file.name}
              actions={listingsActions}
            />
          ) : (
            <FileUpload
              label={t("products.import.etsy.listings.uploadLabel")}
              hint={t("products.import.uploadHint")}
              multiple={false}
              formats={SUPPORTED_FORMATS}
              onUploaded={handleListingsUpload}
            />
          )}
        </div>
      </div>

      {parseError && <Hint variant="error">{parseError}</Hint>}

      {mapping && <MappingPreview stats={mapping.stats} warnings={mapping.warnings} />}

      {mapping && !mapping.empty && (
        <div className="bg-ui-bg-subtle text-ui-fg-subtle rounded-md p-3 text-xs">
          {t("products.import.etsy.rehostNotice")}
        </div>
      )}

      {isPending && (
        <div className="bg-ui-bg-highlight text-ui-fg-interactive flex items-center gap-x-2 rounded-md p-3 text-xs">
          <Spinner className="animate-spin" />
          <Text size="small" className="text-ui-fg-interactive">
            {t("products.import.etsy.uploading", {
              count: mapping?.stats.totalVariants ?? 0,
            })}
          </Text>
        </div>
      )}

      {uploadError && !isPending && (
        <Hint variant="error">
          <span className="font-medium">
            {t("products.import.etsy.uploadFailed")}
          </span>{" "}
          {uploadError}
        </Hint>
      )}

      <div className="flex justify-end">
        <Button
          size="small"
          variant="primary"
          disabled={!mapping || mapping.empty || isPending}
          isLoading={isPending}
          onClick={handleContinue}
        >
          {isPending
            ? t("products.import.etsy.continueLoading")
            : t("products.import.etsy.continue")}
        </Button>
      </div>
    </div>
  )
}
