import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Text,
  toast,
} from "@medusajs/ui"
import {
  ImportJob,
  ImportJobStatus,
  useCreateImportJob,
  useImportJob,
  useImports,
  useShopifyConnectUrl,
  useShopifyStatus,
} from "../../hooks/api/imports"

const TERMINAL: ImportJobStatus[] = [
  "completed",
  "partial",
  "failed",
  "cancelled",
]

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
  const connectUrl = useShopifyConnectUrl()
  const createJob = useCreateImportJob()
  const { data: jobsData } = useImports()

  const [shop, setShop] = useState("")
  const [reconnecting, setReconnecting] = useState(false)
  const [activeJobId, setActiveJobId] = useState<string | undefined>()

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

  const connected = Boolean(status?.connected)

  const handleConnect = async () => {
    const handle = shop.trim().toLowerCase()
    if (!handle) {
      toast.error("Enter your myshopify.com store handle.")
      return
    }
    try {
      const { url } = await connectUrl.mutateAsync(handle)
      window.location.assign(url)
    } catch (e: any) {
      toast.error(e?.message || "Could not start Shopify connect.")
    }
  }

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

  const activeDone = activeJob && TERMINAL.includes(activeJob.status)
  const activeIsDryRun = activeJob?.mode === "dry_run"

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
          {statusLoading ? (
            <Text size="small" className="text-ui-fg-subtle">
              Checking connection…
            </Text>
          ) : connected && !reconnecting ? (
            <div className="flex items-center gap-3">
              <Badge color="green">Connected</Badge>
              <Text size="small">{status?.shop}</Text>
              <Button
                size="small"
                variant="transparent"
                onClick={() => setReconnecting(true)}
              >
                Change store
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-w-md">
              <Label size="small" htmlFor="shop">
                Your Shopify store handle
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="shop"
                  placeholder="your-store.myshopify.com"
                  value={shop}
                  onChange={(e) => setShop(e.target.value)}
                />
                <Button
                  variant="primary"
                  onClick={handleConnect}
                  isLoading={connectUrl.isPending}
                >
                  Connect
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Run import */}
      {connected && (
        <div className="px-6 pb-2">
          <Text weight="plus">Run an import</Text>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Start with a preview (no changes), then commit when it looks right.
            Re-running won&apos;t duplicate products you&apos;ve already imported.
          </Text>
          <div className="flex items-center gap-3 mt-3">
            <Button
              variant="secondary"
              onClick={() => startJob("dry_run")}
              isLoading={createJob.isPending}
            >
              Preview (dry run)
            </Button>
            <Button
              variant="primary"
              onClick={() => startJob("commit")}
              disabled={createJob.isPending}
            >
              Run import
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
              {activeIsDryRun ? "Preview" : "Import"} ·{" "}
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

          {/* Dry-run preview → offer commit */}
          {activeIsDryRun && activeDone && (
            <div className="mt-3">
              <Button
                variant="primary"
                onClick={() => startJob("commit")}
                isLoading={createJob.isPending}
              >
                Looks good — commit import
              </Button>
            </div>
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
                <span className="text-ui-fg-subtle">({job.mode})</span>
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
