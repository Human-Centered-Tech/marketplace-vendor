import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Text,
  toast,
} from "@medusajs/ui"
import {
  ImportJob,
  ImportJobStatus,
  ShopifyCsvImportResult,
  useCreateImportJob,
  useImportJob,
  useImports,
  useShopifyClaim,
  useShopifyCsvImport,
  useShopifyStatus,
} from "../../hooks/api/imports"

// Direct Shopify connect is hidden while the Partner app awaits App Store
// review — Shopify refuses to install unreviewed public apps on real
// merchant stores. Controlled at runtime via the SHOPIFY_CONNECT_ENABLED
// env var on the Railway service (injected through runtime-config.js), so
// it can be flipped without a rebuild — e.g. on for the review window.
// Stores that already completed the connection keep their working import
// flow either way — and the ?claim= install flow (merchant installs from
// Shopify's side) works regardless of this flag.
const SHOPIFY_CONNECT_ENABLED = Boolean(
  typeof window !== "undefined" &&
    window.__RUNTIME_CONFIG__?.shopifyConnectEnabled
)
// The app's Shopify App Store page. Shopify supplies the shop context
// there, so merchants never type their .myshopify.com domain by hand
// (App Store requirement 2.3.1). TODO: fill in once the listing is live.
const SHOPIFY_APP_STORE_URL =
  "https://apps.shopify.com/catholic-owned-store-import"

const statusColor = (
  s: ImportJobStatus
): "green" | "orange" | "red" | "grey" => {
  if (s === "completed") return "green"
  if (s === "failed" || s === "cancelled") return "red"
  if (s === "partial") return "orange"
  return "orange" // pending / running
}

// /imports — Shopify connect + one-time product import (dry-run → commit)
// with live progress. This is the redirect target of the Shopify OAuth
// callback (?connected=shopify).
export const Imports = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: status, isLoading: statusLoading } = useShopifyStatus()
  const claim = useShopifyClaim()
  const createJob = useCreateImportJob()
  const { data: jobsData } = useImports()

  const [activeJobId, setActiveJobId] = useState<string | undefined>()

  const csvImport = useShopifyCsvImport()
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvResult, setCsvResult] = useState<ShopifyCsvImportResult | null>(
    null
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: activeData } = useImportJob(activeJobId)
  const activeJob = activeData?.job

  // Flash a toast when we return from the Shopify OAuth round-trip.
  useEffect(() => {
    if (searchParams.get("connected") === "shopify") {
      toast.success("Shopify store connected.")
      searchParams.delete("connected")
      setSearchParams(searchParams, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Shopify-initiated install (App Store flow): the OAuth callback parked
  // the connection as pending and sent the merchant here with a single-use
  // claim token. We're behind vendor auth, so by the time this runs the
  // merchant has logged in — redeem the token to attach the store to their
  // seller account.
  useEffect(() => {
    const claimToken = searchParams.get("claim")
    if (!claimToken) return
    searchParams.delete("claim")
    searchParams.delete("shop")
    setSearchParams(searchParams, { replace: true })
    claim
      .mutateAsync(claimToken)
      .then(({ shop }) => {
        toast.success(`Shopify store ${shop} connected.`)
      })
      .catch((e: any) => {
        toast.error(
          e?.message ||
            "Could not link the Shopify store. Reinstall the app from Shopify to try again."
        )
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const connected = Boolean(status?.connected)

  const startJob = async (mode: "dry_run" | "commit") => {
    try {
      const { job } = await createJob.mutateAsync({ source: "shopify", mode })
      setActiveJobId(job.id)
      toast.success(
        mode === "dry_run"
          ? "Preview started — fetching your Shopify catalog…"
          : "Import started — creating products…"
      )
    } catch (e: any) {
      toast.error(e?.message || "Could not start the import.")
    }
  }

  const previewItems = useMemo(
    () => (activeJob?.items ?? []).slice(0, 100),
    [activeJob]
  )

  const handleCsvImport = async () => {
    if (!csvFile) {
      toast.error("Choose your Shopify export file first.")
      return
    }
    try {
      const content = await csvFile.text()
      const result = await csvImport.mutateAsync(content)
      setCsvResult(result)
      if (result.count > 0) {
        toast.success(
          `Imported ${result.count} product${result.count === 1 ? "" : "s"} as drafts.`
        )
      } else {
        toast.info(
          result.message || "Nothing new to import — everything is up to date."
        )
      }
      setCsvFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (e: any) {
      toast.error(e?.message || "Could not import the CSV file.")
    }
  }


  return (
    <Container className="flex flex-col gap-y-6 p-0">
      {/* Connection */}
      <div className="px-6 py-5 border-b">
        <Heading level="h2">Import from Shopify</Heading>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          Connect your Shopify store and import your products. Products are
          created as drafts so you can review them before publishing.
        </Text>

        <div className="mt-4">
          {statusLoading || claim.isPending ? (
            <Text size="small" className="text-ui-fg-subtle">
              {claim.isPending ? "Linking your Shopify store…" : "Checking connection…"}
            </Text>
          ) : connected ? (
            <div className="flex items-center gap-3">
              <Badge color="green">Connected</Badge>
              <Text size="small">{status?.shop}</Text>
            </div>
          ) : SHOPIFY_CONNECT_ENABLED ? (
            // No manual .myshopify.com entry (App Store requirement 2.3.1):
            // the merchant installs from the app's App Store page, where
            // Shopify knows which store they're signed into. The install
            // redirects back here with a claim token (handled above).
            <div className="flex flex-col gap-2 max-w-md">
              <div>
                <Button variant="primary" asChild>
                  <a
                    href={SHOPIFY_APP_STORE_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Connect via the Shopify App Store
                  </a>
                </Button>
              </div>
              <Text size="xsmall" className="text-ui-fg-subtle">
                Install the Catholic Owned Store Import app on your Shopify
                store — you&apos;ll be sent right back here with your store
                connected. To switch to a different store, install the app on
                that store instead.
              </Text>
            </div>
          ) : (
            <Text size="small" className="text-ui-fg-subtle">
              Connecting your store directly is coming soon — our Shopify app
              is currently in Shopify&apos;s review queue. In the meantime you
              can import your full catalog from a Shopify export file below;
              it takes about two minutes.
            </Text>
          )}
        </div>
      </div>

      {/* Interim: import from a Shopify export CSV while the app awaits
          Shopify's review (direct connect is hidden above until then). */}
      {!connected && !statusLoading && (
        <div className="px-6 pb-2">
          <Text weight="plus">Import from a Shopify export file</Text>
          <ol className="list-decimal ml-4 mt-2 flex flex-col gap-1">
            <li>
              <Text size="small" className="text-ui-fg-subtle">
                In your Shopify admin, go to <b>Products</b> and click{" "}
                <b>Export</b> (top right).
              </Text>
            </li>
            <li>
              <Text size="small" className="text-ui-fg-subtle">
                Choose <b>All products</b> and <b>CSV for Excel, Numbers, or
                other spreadsheet programs</b>, then export. Shopify downloads
                the file or emails it to you.
              </Text>
            </li>
            <li>
              <Text size="small" className="text-ui-fg-subtle">
                Upload that file here. Your products come in as drafts for you
                to review and publish. Already-imported products are skipped,
                so you can safely upload a fresh export after adding new
                products in Shopify.
              </Text>
            </li>
          </ol>
          <div className="flex items-center gap-2 mt-3 max-w-md">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
            />
            <Button
              variant="primary"
              onClick={handleCsvImport}
              isLoading={csvImport.isPending}
              disabled={!csvFile}
            >
              Import products
            </Button>
          </div>
          {csvResult && (
            <div className="mt-3 flex flex-col gap-1">
              <Text size="small">
                {csvResult.count > 0 ? (
                  <>
                    Imported <b>{csvResult.count}</b> product
                    {csvResult.count === 1 ? "" : "s"} as drafts
                    {csvResult.stock_levels_set > 0
                      ? ` (stock set on ${csvResult.stock_levels_set} variant${csvResult.stock_levels_set === 1 ? "" : "s"})`
                      : ""}
                    . <Link to="/products" className="underline">Review and publish them</Link>.
                  </>
                ) : (
                  "Nothing new to import — everything in the file was already imported."
                )}
              </Text>
              {csvResult.skipped_existing.length > 0 && (
                <Text size="xsmall" className="text-ui-fg-subtle">
                  Skipped {csvResult.skipped_existing.length} already-imported
                  product{csvResult.skipped_existing.length === 1 ? "" : "s"}.
                </Text>
              )}
              {csvResult.skipped_archived.length > 0 && (
                <Text size="xsmall" className="text-ui-fg-subtle">
                  Skipped {csvResult.skipped_archived.length} archived product
                  {csvResult.skipped_archived.length === 1 ? "" : "s"}.
                </Text>
              )}
            </div>
          )}
        </div>
      )}

      {/* Run import */}
      {connected && (
        <div className="px-6 pb-2">
          <Text weight="plus">Import your products</Text>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            We&apos;ll bring your Shopify products in as drafts so you can
            review them before publishing.
          </Text>
          <Text size="small" className="text-ui-fg-subtle mt-2">
            You can run this as often as you like — it&apos;s also how you keep
            things up to date. The first run imports your products; running it
            again updates the ones you&apos;ve already imported (price,
            description, images, inventory, and more) and adds any new products
            from Shopify, without ever creating duplicates. So if you change a
            price or add a product in Shopify, just run the import again.
          </Text>
          <div className="flex items-center gap-3 mt-3">
            <Button
              variant="primary"
              onClick={() => startJob("commit")}
              isLoading={createJob.isPending}
            >
              Import products
            </Button>
          </div>
        </div>
      )}

      {/* Active job progress */}
      {activeJob && (
        <div className="px-6 py-4 border-t">
          <div className="flex items-center gap-3">
            <Badge color={statusColor(activeJob.status)}>
              {activeJob.status}
            </Badge>
            <Text size="small">
              {activeJob.processed_count} processed · {activeJob.succeeded_count}{" "}
              ok · {activeJob.skipped_count} skipped · {activeJob.failed_count}{" "}
              failed
            </Text>
          </div>

          {activeJob.error && (
            <Text size="small" className="text-ui-fg-error mt-2">
              {activeJob.error}
            </Text>
          )}

          {previewItems.length > 0 && (
            <div className="mt-4 flex flex-col gap-1 max-h-80 overflow-y-auto">
              {previewItems.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between text-sm border-b py-1"
                >
                  <span className="truncate">{it.title || it.source_id}</span>
                  <span className="text-ui-fg-subtle ml-3 shrink-0">
                    {it.status}
                    {it.preview?._action ? ` · ${it.preview._action}` : ""}
                    {it.error ? ` · ${it.error}` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History */}
      <div className="px-6 py-4 border-t">
        <Text weight="plus">Recent imports</Text>
        <div className="mt-3 flex flex-col gap-1">
          {(jobsData?.jobs ?? []).length === 0 && (
            <Text size="small" className="text-ui-fg-subtle">
              No imports yet.
            </Text>
          )}
          {(jobsData?.jobs ?? []).map((job: ImportJob) => (
            <button
              key={job.id}
              onClick={() => setActiveJobId(job.id)}
              className="flex items-center justify-between text-sm border-b py-2 text-left hover:bg-ui-bg-subtle"
            >
              <span className="flex items-center gap-2">
                <Badge color={statusColor(job.status)} size="2xsmall">
                  {job.status}
                </Badge>
                <span className="capitalize">{job.source}</span>
              </span>
              <span className="text-ui-fg-subtle">
                {job.succeeded_count}/{job.total_count}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Container>
  )
}
