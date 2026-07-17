import { Check } from "@medusajs/icons"
import { clx, Text } from "@medusajs/ui"
import { useState } from "react"
import { Link } from "react-router-dom"
import { useSetup, SetupResponse } from "../../../hooks/api/setup"
import { backendUrl, publishableApiKey } from "../../../lib/client"

// Unified setup checklist. Replaces the old DashboardOnboarding takeover
// + the standalone CatholicSetupPanel card. Drives every row from a single
// /vendor/setup fetch; section ordering reflects the journey
// (basics -> Catholic Owned profile -> go live).
//
// Per the 5/14 auto-approve / auto-verify decision, there is no
// "verification" row — listings are verified on creation. The only
// admin-side gate that exists is unverify-after-the-fact, which the
// vendor doesn't see in this flow.
//
// Behavior:
//   In-progress (any required step incomplete): full card with header,
//     progress bar, all sections expanded.
//   Complete (all required steps done): slim green strip with a "Show
//     details" toggle so the vendor can drill back in for an edit.

export const SetupChecklist = () => {
  const { data, isPending, isError } = useSetup()
  const [showDetails, setShowDetails] = useState(false)

  if (isPending) {
    return (
      <div className="rounded-xl bg-white p-8 text-center">
        <Text className="text-co-text-secondary">Loading your setup…</Text>
      </div>
    )
  }
  if (isError || !data) return null

  const rows = buildRows(data)
  const completedCount = rows.filter((r) => r.done).length
  const totalSteps = rows.length
  const allDone = completedCount === totalSteps

  if (allDone && !showDetails) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-green-700">✅</span>
          <Text size="small" className="text-green-900">
            {data.is_service
              ? "Setup complete — your listing is fully configured."
              : "Setup complete — your store is fully configured."}
          </Text>
        </div>
        <button
          onClick={() => setShowDetails(true)}
          className="font-poppins text-sm text-green-800 underline hover:no-underline"
        >
          Show details
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white p-0 shadow-[0_4px_24px_rgba(23,41,74,0.08)]">
      {/* Navy header with progress bar */}
      <div className="rounded-t-xl bg-co-navy px-8 py-6">
        <div className="mb-2 flex items-center gap-3">
          <img
            src="/Logo.png"
            alt="Catholic Owned"
            className="h-8 w-auto object-contain brightness-0 invert"
          />
        </div>
        <h1 className="font-poppins text-base font-medium text-co-text-on-dark/80">
          {allDone
            ? "Setup complete"
            : data.is_service
              ? "Welcome to the Business Portal"
              : "Welcome to the Merchant Portal"}
        </h1>
        <p className="font-poppins mt-1 text-sm text-co-text-on-dark/70">
          {allDone
            ? data.is_service
              ? "Your listing is fully configured. You can update any of these any time."
              : "Your store is fully configured. You can update any of these any time."
            : data.is_service
              ? "Complete these steps to set up your listing on the platform."
              : "Complete these steps to start selling on the marketplace."}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-co-gold transition-all duration-500"
              style={{ width: `${(completedCount / totalSteps) * 100}%` }}
            />
          </div>
          <span className="font-poppins text-xs font-medium text-co-gold">
            {completedCount}/{totalSteps}
          </span>
        </div>
        {allDone && (
          <button
            onClick={() => setShowDetails(false)}
            className="mt-3 inline-flex items-center gap-1 font-poppins text-xs text-co-text-on-dark/70 underline hover:no-underline"
          >
            ↑ Collapse
          </button>
        )}
      </div>

      <div className="h-[2px] bg-gradient-to-r from-transparent via-co-gold to-transparent" />

      <div className="px-4 py-4 space-y-6">
        <Section
          title={data.is_service ? "Company Basics" : "Storefront Basics"}
          rows={rows.filter((r) => r.section === "store_basics")}
        />
        <Section
          title="Directory Listing"
          rows={rows.filter((r) => r.section === "catholic_owned")}
        />
        <Section title="Go live" rows={rows.filter((r) => r.section === "go_live")} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

type Row = {
  section: "store_basics" | "catholic_owned" | "go_live"
  label: string
  hint: string
  done: boolean
  disabled?: boolean
  cta?: {
    label: string
    href: string
    external?: boolean
    // When set, the row's CTA renders as a button that performs the
    // reverse-SSO handoff to the storefront, opening href as the
    // post-login destination.
    storefrontHandoff?: string
  }
}

const Section = ({ title, rows }: { title: string; rows: Row[] }) => (
  <div>
    <Text
      size="xsmall"
      weight="plus"
      className="text-co-gold-dark uppercase tracking-[0.15em] mb-2 font-poppins"
    >
      {title}
    </Text>
    <div className="space-y-1">
      {rows.map((row, i) => (
        <ChecklistRow key={`${row.section}-${i}`} row={row} />
      ))}
    </div>
  </div>
)

const primaryCtaClassName = (disabled?: boolean) =>
  clx(
    "min-w-[80px] rounded-lg px-4 py-2 font-poppins text-sm font-medium text-center transition-all",
    disabled
      ? "bg-co-text-secondary/20 text-co-text-secondary cursor-not-allowed pointer-events-none"
      : "bg-co-navy text-co-text-on-dark hover:bg-co-navy-light"
  )

// Renders a step's navigation target — storefront reverse-SSO handoff,
// external link, or in-app route. Reused by both the primary CTA (incomplete
// steps) and the "Edit" button (completed steps), so the three-way navigation
// logic lives in one place.
const StepActionLink = ({
  cta,
  disabled,
  label,
  className,
}: {
  cta: NonNullable<Row["cta"]>
  disabled?: boolean
  label: string
  className: string
}) => {
  if (cta.storefrontHandoff) {
    return (
      <button
        type="button"
        onClick={() => {
          if (disabled) return
          void navigateWithStorefrontHandoff(cta.storefrontHandoff!)
        }}
        className={className}
        disabled={disabled}
      >
        {label}
      </button>
    )
  }
  if (cta.external) {
    return (
      <a
        href={cta.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        aria-disabled={disabled}
      >
        {label}
      </a>
    )
  }
  // ?from=dashboard tells BackToDashboardBar (in Shell) to surface a "Back to
  // dashboard" return link while the vendor works through this step.
  return (
    <Link
      to={`${cta.href}?from=dashboard`}
      className={className}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : undefined}
    >
      {label}
    </Link>
  )
}

const ChecklistRow = ({ row }: { row: Row }) => {
  const { done, disabled, cta } = row
  return (
    <div
      className={clx(
        "flex items-center justify-between rounded-lg px-4 py-3 transition-colors",
        !done && "hover:bg-co-cream/50"
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={clx(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-all",
            done
              ? "border-2 border-co-success bg-co-success/10 text-co-success"
              : disabled
                ? "border-2 border-dashed border-co-text-secondary/30 text-co-text-secondary/60 font-poppins"
                : "border-2 border-dashed border-co-navy/20 text-co-text-secondary font-poppins"
          )}
        >
          {done ? <Check /> : "•"}
        </div>
        <div>
          <h4
            className={clx(
              "font-poppins text-sm font-medium",
              done ? "text-co-text-secondary line-through" : "text-co-text"
            )}
          >
            {row.label}
          </h4>
          {!done && row.hint && (
            <p className="font-poppins text-xs text-co-text-secondary mt-0.5">
              {row.hint}
            </p>
          )}
        </div>
      </div>
      {cta && !done && (
        <StepActionLink
          cta={cta}
          disabled={disabled}
          label={cta.label}
          className={primaryCtaClassName(disabled)}
        />
      )}
      {done && (
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-co-success bg-co-success/10 px-2.5 py-1 font-poppins text-xs font-medium text-co-success">
            Done
          </span>
          {cta && (
            // Lets the vendor re-open a completed step to make changes —
            // navigates to the same destination the step's CTA would.
            <StepActionLink
              cta={cta}
              label="Edit"
              className="rounded-lg border border-co-navy/20 px-3 py-1.5 font-poppins text-xs font-medium text-co-navy transition-all hover:bg-co-cream"
            />
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

// Reverse-SSO: mint a short-lived customer JWT from the vendor's seller
// session, then bounce the browser to the storefront's /customer-handoff
// page with the token in the URL fragment. The storefront exchanges the
// token for a customer session cookie and forwards to `return_to`.
//
// Fragment (not query) keeps the token out of server logs, proxy logs,
// and Referer headers. We fetch via JS rather than a plain <a href>
// because /store/* routes require the x-publishable-api-key header,
// which a regular link navigation can't attach.
const navigateWithStorefrontHandoff = async (path: string): Promise<void> => {
  const storefrontUrl =
    typeof __STOREFRONT_URL__ === "string" ? __STOREFRONT_URL__ : ""

  if (!storefrontUrl) {
    return
  }

  try {
    const bearer = window.localStorage.getItem("medusa_auth_token") || ""
    const res = await fetch(
      `${backendUrl.replace(/\/$/, "")}/store/account/customer-token`,
      {
        headers: {
          authorization: `Bearer ${bearer}`,
          "x-publishable-api-key": publishableApiKey,
        },
      }
    )

    if (res.ok) {
      const { token } = (await res.json()) as { token: string }
      const params = new URLSearchParams({ handoff: token, return_to: path })
      window.location.href = `${storefrontUrl}/customer-handoff#${params.toString()}`
      return
    }
  } catch {
    // Falls through to the login handoff below.
  }

  // Mint failed (e.g. a freshly-issued / stale seller token). Don't bare-
  // redirect to `path` — that lands on the storefront with NO customer session
  // and dead-ends the directory edit on "no listing found". Route through login
  // with return_to so the storefront re-establishes the session and bounces
  // them straight back to `path`.
  window.location.href = `${storefrontUrl}/us/user?return_to=${encodeURIComponent(
    path
  )}`
}

const buildRows = (data: SetupResponse): Row[] => {
  const sb = data.store_basics
  const co = data.catholic_owned
  const gl = data.go_live

  // Service businesses don't sell products through the marketplace — they
  // only complete + pay for a directory listing. Hide the product /
  // shipping / payout rows entirely and relabel the go-live step so it
  // reads as activating the listing rather than launching a storefront.
  const isService = data.is_service
  const tier = data.go_live?.subscription_tier
  const isFeatured = tier === "featured" || tier === "enterprise"

  const payoutsDone = sb.payouts === "active"
  const payoutsLabel =
    sb.payouts === "pending"
      ? "Finish payouts setup"
      : sb.payouts === "disabled"
        ? "Update payout details"
        : "Set up payouts"
  const payoutsHint =
    sb.payouts === "pending"
      ? "Stripe is reviewing your details. Click to check status or add missing info."
      : sb.payouts === "disabled"
        ? "Stripe needs additional information before we can deposit your earnings."
        : "Verify your bank account through Stripe so we can deposit your earnings."

  // Kill-switch while Terms of Service are being finalized. When the env
  // flag is on, the row stays visible but its CTA is disabled and the
  // hint explains why. Flip VITE_PAYMENTS_DISABLED in Railway to
  // re-enable (Vite inlines it as the __PAYMENTS_DISABLED__ global at
  // build time — see vite.config.mts).
  const paymentsDisabled = __PAYMENTS_DISABLED__ === "true"

  const goLiveDone = gl.store_status === "ACTIVE"
  const goLiveBlocked =
    (gl.blockers.length > 0 && !goLiveDone) || paymentsDisabled
  const goLiveHint = paymentsDisabled
    ? "Payments are temporarily disabled while we finalize our Terms of Service. " +
      (isService
        ? "Keep setting up your listing — we'll notify you when payment is available."
        : "Keep setting up your store — we'll notify you when payment is available.")
    : gl.blockers.length > 0 && !goLiveDone
      ? "Finish the steps above first."
      : gl.subscription_status === "active"
        ? isService
          ? "All ready — flip the switch and your listing goes live in the directory."
          : "All ready — flip the switch and your store goes live to shoppers."
        : isService
          ? "Pay your annual directory subscription and publish your listing."
          : "Pay your annual directory subscription and publish your store."

  // Storefront-only rows: products, shipping, and payouts. Service
  // businesses skip these entirely (see buildRows comment above). Product
  // merchants keep all of them.
  const storeBasicsRows: Row[] = [
    {
      section: "store_basics",
      label: isService
        ? "Complete your business information"
        : "Complete your store information",
      hint: "Add your business name, branding, and company address.",
      done: sb.store_information,
      cta: { label: "Manage", href: "/settings/store" },
    },
  ]
  if (!isService) {
    storeBasicsRows.push(
      {
        section: "store_basics",
        label: "Set up locations & shipping",
        hint: "Tell us where you ship from and your shipping rates.",
        done: sb.locations_shipping,
        cta: { label: "Set up", href: "/settings/locations" },
      },
      {
        section: "store_basics",
        label: payoutsLabel,
        hint: payoutsHint,
        done: payoutsDone,
        cta: { label: payoutsDone ? "Manage" : "Set up", href: "/payouts" },
      },
      {
        section: "store_basics",
        label: "Add your first product",
        hint: "List a product and start selling to the Catholic community.",
        done: sb.products.published_count >= 1,
        cta: { label: "Add", href: "/products" },
      }
    )
  }

  return [
    // --- Store basics ---
    ...storeBasicsRows,

    // --- Catholic Owned profile ---
    {
      section: "catholic_owned",
      label: "Create your directory listing",
      hint: "Your business's public profile on Catholic Owned.",
      done: co.listing_exists,
      cta: {
        label: "Create",
        href: "/user/directory/create",
        storefrontHandoff: "/user/directory/create",
      },
    },
    // Owner interview only displays on Featured/Enterprise listings, so only
    // surface the checklist step for those tiers (matches the form + display).
    ...(isFeatured
      ? [
          {
            section: "catholic_owned",
            label: "Add your owner interview",
            hint: "A few words about you and your faith — customers love this.",
            done: co.owner_interview_populated,
            cta: {
              label: "Add",
              href: "/user/directory/edit",
              storefrontHandoff: "/user/directory/edit",
            },
          } as Row,
        ]
      : []),
    {
      section: "catholic_owned",
      label: "Connect your parish",
      hint: "Helps your business appear in local searches.",
      done: co.parish_affiliated,
      cta: {
        label: "Add",
        href: "/user/directory/edit",
        storefrontHandoff: "/user/directory/edit",
      },
    },

    // --- Go live ---
    {
      section: "go_live",
      label: isService
        ? "Activate your listing & pay your annual subscription"
        : "Go live & pay your annual subscription",
      hint: goLiveHint,
      done: goLiveDone,
      disabled: goLiveBlocked,
      cta: { label: isService ? "Activate" : "Go live", href: "/go-live" },
    },
  ]
}
