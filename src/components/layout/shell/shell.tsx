import { SidebarLeft, TriangleRightMini, XMark } from "@medusajs/icons"
import { IconButton, clx } from "@medusajs/ui"
import { AnimatePresence } from "motion/react"
import { Dialog as RadixDialog } from "radix-ui"
import { PropsWithChildren, ReactNode, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Link,
  Outlet,
  UIMatch,
  useMatches,
  useNavigation,
} from "react-router-dom"

import { KeybindProvider } from "../../../providers/keybind-provider"
import { useGlobalShortcuts } from "../../../providers/keybind-provider/hooks"
import { useSidebar } from "../../../providers/sidebar-provider"
import { ProgressBar } from "../../common/progress-bar"
import { BackToDashboardBar } from "../../common/back-to-dashboard-bar"
import { Notifications } from "../notifications"
import { useMe } from "../../../hooks/api"
import { useSetup } from "../../../hooks/api/setup"
import { ReopenShopButton } from "../../store-status/store-status-actions"

export const Shell = ({ children }: PropsWithChildren) => {
  const globalShortcuts = useGlobalShortcuts()
  const navigation = useNavigation()
  const { seller } = useMe()
  // store_status alone can't tell a paused (vacation) shop from a
  // never-launched draft — both are INACTIVE. /vendor/setup carries the
  // is_on_vacation flag, so the banner shows the right message + action.
  const { data: setup } = useSetup()

  const loading = navigation.state === "loading"

  return (
    <KeybindProvider shortcuts={globalShortcuts}>
      <div className="flex flex-col h-screen">
        <StoreStatusBanner
          status={seller?.store_status}
          handle={seller?.handle}
          isOnVacation={Boolean(setup?.go_live?.is_on_vacation)}
          isService={Boolean(setup?.is_service)}
          listingId={setup?.catholic_owned?.listing_id ?? undefined}
        />
        <div className="relative flex flex-1 h-full items-start overflow-hidden lg:flex-row">
          <NavigationBar loading={loading} />
          <div className="h-full">
            <MobileSidebarContainer>{children}</MobileSidebarContainer>
            <DesktopSidebarContainer>{children}</DesktopSidebarContainer>
          </div>
          <div className="flex h-full w-full flex-col overflow-auto">
            <Topbar />
            <main
              className={clx(
                "flex h-full w-full flex-col items-center overflow-y-auto transition-opacity delay-200 duration-200",
                {
                  "opacity-25": loading,
                }
              )}
            >
              <Gutter>
                <BackToDashboardBar />
                <Outlet />
              </Gutter>
            </main>
          </div>
        </div>
      </div>
    </KeybindProvider>
  )
}

// Full-width status strip at the top of the vendor portal. Mirrors the
// store_status finite-state-machine:
//   INACTIVE  → draft mode (default for new vendors). CTAs to preview /
//               go live. The most common state until the vendor pays.
//   ACTIVE    → live and visible. Slim confirmation strip with a link to
//               the public store page.
//   SUSPENDED → admin-blocked. Red strip, no self-serve action.
const StoreStatusBanner = ({
  status,
  handle,
  isOnVacation,
  isService,
  listingId,
}: {
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | string
  handle?: string
  isOnVacation?: boolean
  isService?: boolean
  listingId?: string
}) => {
  if (!status) return null

  // Storefront origin comes from the build-time __STOREFRONT_URL__ define
  // (same source user-menu.tsx uses). The previous code read
  // import.meta.env.VITE_STOREFRONT_URL — a var that doesn't exist and
  // isn't present in the static prod build — so it always fell back to
  // localhost, breaking "Preview as public" / "View public page" in prod.
  const storefrontUrl =
    (typeof __STOREFRONT_URL__ === "string" && __STOREFRONT_URL__) ||
    "http://localhost:8000"

  // Service listings live in the public directory, not on a /sellers
  // storefront page — so a service business's "preview" / "view public"
  // links must point at its directory listing. (This is what fixes the
  // bug where going live showed a storefront preview for a service
  // listing.) Product merchants keep the storefront seller page.
  const draftPreviewHref = isService
    ? listingId
      ? `${storefrontUrl}/directory/${listingId}`
      : null
    : handle
      ? `${storefrontUrl}/sellers/${handle}?preview=1`
      : null
  const livePublicHref = isService
    ? listingId
      ? `${storefrontUrl}/directory/${listingId}`
      : null
    : handle
      ? `${storefrontUrl}/sellers/${handle}`
      : null

  if (status === "SUSPENDED") {
    return (
      <div className="w-full bg-red-600 text-white p-1 text-center text-sm">
        Your store is <b>suspended</b>. Please contact support.
      </div>
    )
  }

  if (status === "INACTIVE" && isOnVacation) {
    return (
      <div className="w-full bg-amber-50 border-b border-amber-300 text-amber-900 px-4 py-2 flex items-center justify-center gap-x-4 text-sm">
        <span>
          🌿 Your shop is <b>paused</b> for vacation — products are hidden and
          new orders are off.
        </span>
        <ReopenShopButton size="small" variant="primary" />
      </div>
    )
  }

  if (status === "INACTIVE") {
    return (
      <div className="w-full bg-amber-50 border-b border-amber-300 text-amber-900 px-4 py-2 flex items-center justify-center gap-x-4 text-sm">
        <span>
          🚧 Your {isService ? "listing" : "store"} is in <b>draft mode</b> —
          shoppers can't see it yet.
        </span>
        <div className="flex items-center gap-x-3">
          {draftPreviewHref && (
            <a
              href={draftPreviewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline font-medium"
            >
              Preview as public
            </a>
          )}
          <Link
            to="/go-live"
            className="rounded-md bg-amber-900 text-amber-50 px-3 py-1 font-semibold hover:bg-amber-800"
          >
            Go live →
          </Link>
        </div>
      </div>
    )
  }

  if (status === "ACTIVE") {
    return (
      <div className="w-full bg-emerald-50 border-b border-emerald-200 text-emerald-900 px-4 py-1 flex items-center justify-center gap-x-4 text-xs">
        <span>✅ Your {isService ? "listing" : "store"} is live</span>
        {livePublicHref && (
          <a
            href={livePublicHref}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline font-medium"
          >
            View public page →
          </a>
        )}
      </div>
    )
  }

  return null
}

const NavigationBar = ({ loading }: { loading: boolean }) => {
  const [showBar, setShowBar] = useState(false)

  /**
   * If the loading state is true, we want to show the bar after a short delay.
   * The delay is used to prevent the bar from flashing on quick navigations.
   */
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>

    if (loading) {
      timeout = setTimeout(() => {
        setShowBar(true)
      }, 200)
    } else {
      setShowBar(false)
    }

    return () => {
      clearTimeout(timeout)
    }
  }, [loading])

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-1">
      <AnimatePresence>{showBar ? <ProgressBar /> : null}</AnimatePresence>
    </div>
  )
}

const Gutter = ({ children }: PropsWithChildren) => {
  return (
    <div className="flex w-full max-w-[1600px] flex-col gap-y-2 p-3">
      {children}
    </div>
  )
}

const Breadcrumbs = () => {
  const matches = useMatches() as unknown as UIMatch<
    unknown,
    {
      breadcrumb?: (match?: UIMatch) => string | ReactNode
    }
  >[]

  const crumbs = matches
    .filter((match) => match.handle?.breadcrumb)
    .map((match) => {
      const handle = match.handle

      let label: string | ReactNode | undefined = undefined

      try {
        label = handle.breadcrumb?.(match)
      } catch (error) {
        // noop
      }

      if (!label) {
        return null
      }

      return {
        label: label,
        path: match.pathname,
      }
    })
    .filter(Boolean) as { label: string | ReactNode; path: string }[]

  return (
    <ol
      className={clx(
        "text-ui-fg-muted txt-compact-small-plus flex select-none items-center"
      )}
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1
        const isSingle = crumbs.length === 1

        return (
          <li key={index} className={clx("flex items-center")}>
            {!isLast ? (
              <Link
                className="transition-fg hover:text-ui-fg-subtle"
                to={crumb.path}
              >
                {crumb.label}
              </Link>
            ) : (
              <div>
                {!isSingle && <span className="block lg:hidden">...</span>}
                <span
                  key={index}
                  className={clx({
                    "hidden lg:block": !isSingle,
                  })}
                >
                  {crumb.label}
                </span>
              </div>
            )}
            {!isLast && (
              <span className="mx-2">
                <TriangleRightMini />
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

const ToggleSidebar = () => {
  const { toggle } = useSidebar()

  return (
    <div>
      <IconButton
        className="hidden lg:flex"
        variant="transparent"
        onClick={() => toggle("desktop")}
        size="small"
      >
        <SidebarLeft className="text-ui-fg-muted" />
      </IconButton>
      <IconButton
        className="hidden max-lg:flex"
        variant="transparent"
        onClick={() => toggle("mobile")}
        size="small"
      >
        <SidebarLeft className="text-ui-fg-muted" />
      </IconButton>
    </div>
  )
}

const Topbar = () => {
  return (
    <div className="grid w-full grid-cols-2 border-b p-3">
      <div className="flex items-center gap-x-1.5">
        <ToggleSidebar />
        <Breadcrumbs />
      </div>
      <div className="flex items-center justify-end gap-x-3">
        <Notifications />
      </div>
    </div>
  )
}

const DesktopSidebarContainer = ({ children }: PropsWithChildren) => {
  const { desktop } = useSidebar()

  return (
    <div
      className={clx("hidden h-full w-[220px] border-r", {
        "lg:flex": desktop,
      })}
    >
      {children}
    </div>
  )
}

const MobileSidebarContainer = ({ children }: PropsWithChildren) => {
  const { t } = useTranslation()
  const { mobile, toggle } = useSidebar()

  return (
    <RadixDialog.Root open={mobile} onOpenChange={() => toggle("mobile")}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className={clx(
            "bg-ui-bg-overlay fixed inset-0",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        <RadixDialog.Content
          className={clx(
            "bg-ui-bg-subtle shadow-elevation-modal fixed inset-y-2 left-2 flex w-full max-w-[304px] flex-col overflow-hidden rounded-lg border-r",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2 duration-200"
          )}
        >
          <div className="p-3">
            <RadixDialog.Close asChild>
              <IconButton
                size="small"
                variant="transparent"
                className="text-ui-fg-subtle"
              >
                <XMark />
              </IconButton>
            </RadixDialog.Close>
            <RadixDialog.Title className="sr-only">
              {t("app.nav.accessibility.title")}
            </RadixDialog.Title>
            <RadixDialog.Description className="sr-only">
              {t("app.nav.accessibility.description")}
            </RadixDialog.Description>
          </div>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
