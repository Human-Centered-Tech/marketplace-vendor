import { ArrowUturnLeft, MinusMini } from "@medusajs/icons"
import { clx, Divider, IconButton, Text } from "@medusajs/ui"
import { Collapsible as RadixCollapsible } from "radix-ui"
import { Fragment, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Link, useLocation } from "react-router-dom"

import { INavItem, NavItem } from "../nav-item"
import { Shell } from "../shell"

import { useDashboardExtension } from "../../../extensions"
import { UserMenu } from "../user-menu"

export const SettingsLayout = () => {
  return (
    <Shell>
      <SettingsSidebar />
    </Shell>
  )
}

const useSettingRoutes = (): INavItem[] => {
  const { t } = useTranslation()

  return useMemo(
    () => [
      {
        label: t("store.domain"),
        to: "/settings/store",
      },
      {
        label: "Team",
        to: "/settings/users",
      },
      {
        label: t("productTypes.domain"),
        to: "/settings/product-types",
      },
      {
        label: t("productTags.domain"),
        to: "/settings/product-tags",
      },
      {
        label: "Shop Collections",
        to: "/settings/shop-collections",
      },
      {
        label: t("stockLocations.domain"),
        to: "/settings/locations",
      },
      {
        label: "Directory Listing",
        to: "/settings/directory-listing",
      },
    ],
    [t]
  )
}

const useMyAccountRoutes = (): INavItem[] => {
  const { t } = useTranslation()

  return useMemo(
    () => [
      {
        label: t("profile.domain"),
        to: "/settings/profile",
      },
    ],
    [t]
  )
}

const SettingsSidebar = () => {
  const { getMenu } = useDashboardExtension()

  const routes = useSettingRoutes()
  const myAccountRoutes = useMyAccountRoutes()
  const extensionRoutes = getMenu("settingsExtensions")

  const { t } = useTranslation()

  return (
    <aside className="relative flex flex-1 flex-col justify-between overflow-y-auto">
      <div className="bg-ui-bg-subtle sticky top-0">
        <Header />
        <div className="flex items-center justify-center px-3">
          <Divider variant="dashed" />
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col overflow-y-auto">
          <RadixCollapsibleSection
            label={t("app.nav.settings.general")}
            items={routes}
          />
          <div className="flex items-center justify-center px-3">
            <Divider variant="dashed" />
          </div>
          {/* TODO: Secret API Keys logic on Mercur API
            <RadixCollapsibleSection
              label={t("app.nav.settings.developer")}
              items={developerRoutes}
            /> */}
          <div className="flex items-center justify-center px-3">
            <Divider variant="dashed" />
          </div>
          <RadixCollapsibleSection
            label={t("app.nav.settings.myAccount")}
            items={myAccountRoutes}
          />
          {extensionRoutes.length > 0 && (
            <Fragment>
              <div className="flex items-center justify-center px-3">
                <Divider variant="dashed" />
              </div>
              <RadixCollapsibleSection
                label={t("app.nav.common.extensions")}
                items={extensionRoutes}
              />
            </Fragment>
          )}
        </div>
        <div className="bg-ui-bg-subtle sticky bottom-0">
          <UserSection />
        </div>
      </div>
    </aside>
  )
}

// Resolve where the back arrow goes and what it's labeled, from the
// originating route (the page the user was on, recorded by the main-nav
// gear in location.state.from). The arrow returns the user to the exact
// page they came from and the label names that page's section (e.g.
// "← Orders"), so the two always agree — unlike the old static "Settings"
// label, which read as if it pointed at Settings. A settings-internal
// origin (loop) or a missing/unknown origin (e.g. a direct page load)
// falls back to the dashboard, the portal home that "/" also redirects to.
const useBackTarget = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const from = location.state?.from as string | undefined

  if (!from || from.startsWith("/settings")) {
    return { to: "/dashboard", label: t("app.nav.settings.backToDashboard") }
  }

  // Mirrors the main-nav sections. Ordered so more specific prefixes win
  // (e.g. /customer-groups before /customers). Sections the main nav labels
  // with a plain string keep that literal; the rest reuse domain keys.
  const sections: Array<{ prefix: string; label: string }> = [
    { prefix: "/dashboard", label: t("app.nav.settings.backToDashboard") },
    { prefix: "/orders", label: t("orders.domain") },
    { prefix: "/products", label: t("products.domain") },
    { prefix: "/inventory", label: t("inventory.domain") },
    { prefix: "/customer-groups", label: t("customerGroups.domain") },
    { prefix: "/customers", label: t("customers.domain") },
    { prefix: "/promotions", label: t("promotions.domain") },
    { prefix: "/campaigns", label: t("campaigns.domain") },
    { prefix: "/price-lists", label: t("priceLists.domain") },
    { prefix: "/reviews", label: "Reviews" },
    { prefix: "/messages", label: "Messages" },
    { prefix: "/requests", label: "Requests" },
    { prefix: "/payouts", label: "Payouts" },
  ]

  const match = sections.find((s) => from.startsWith(s.prefix))
  return { to: from, label: match ? match.label : t("actions.back") }
}

const Header = () => {
  const { to, label } = useBackTarget()

  return (
    <div className="bg-ui-bg-subtle p-3">
      <Link
        to={to}
        replace
        className={clx(
          "bg-ui-bg-subtle transition-fg flex items-center rounded-md outline-none",
          "hover:bg-ui-bg-subtle-hover",
          "focus-visible:shadow-borders-focus"
        )}
      >
        <div className="flex items-center gap-x-2.5 px-2 py-1">
          <div className="flex items-center justify-center">
            <ArrowUturnLeft className="text-ui-fg-subtle" />
          </div>
          <Text leading="compact" weight="plus" size="small">
            {label}
          </Text>
        </div>
      </Link>
    </div>
  )
}

const RadixCollapsibleSection = ({
  label,
  items,
}: {
  label: string
  items: INavItem[]
}) => {
  return (
    <RadixCollapsible.Root defaultOpen className="py-3">
      <div className="px-3">
        <div className="text-ui-fg-muted flex h-7 items-center justify-between px-2">
          <Text size="small" leading="compact">
            {label}
          </Text>
          <RadixCollapsible.Trigger asChild>
            <IconButton size="2xsmall" variant="transparent" className="static">
              <MinusMini className="text-ui-fg-muted" />
            </IconButton>
          </RadixCollapsible.Trigger>
        </div>
      </div>
      <RadixCollapsible.Content>
        <div className="pt-0.5">
          <nav className="flex flex-col gap-y-0.5">
            {items.map((setting) => (
              <NavItem key={setting.to} type="setting" {...setting} />
            ))}
          </nav>
        </div>
      </RadixCollapsible.Content>
    </RadixCollapsible.Root>
  )
}

const UserSection = () => {
  return (
    <div>
      <div className="px-3">
        <Divider variant="dashed" />
      </div>
      <UserMenu />
    </div>
  )
}
