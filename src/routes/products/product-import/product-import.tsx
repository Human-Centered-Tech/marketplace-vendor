import { Button, Heading, Tabs } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { RouteDrawer } from "../../../components/modals"
import { EtsyImportTab } from "./components/etsy-import-tab"
import { MercurImportTab } from "./components/mercur-import-tab"

export const ProductImport = () => {
  const { t } = useTranslation()

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("products.import.header")}</Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description className="sr-only">
          {t("products.import.description")}
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      <RouteDrawer.Body className="overflow-y-auto">
        <Tabs defaultValue="mercur" className="flex h-full flex-col">
          <Tabs.List className="mb-4">
            <Tabs.Trigger value="mercur">
              {t("products.import.tabs.mercur")}
            </Tabs.Trigger>
            <Tabs.Trigger value="etsy">
              {t("products.import.tabs.etsy")}
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="mercur">
            <MercurImportTab />
          </Tabs.Content>
          <Tabs.Content value="etsy">
            <EtsyImportTab />
          </Tabs.Content>
        </Tabs>
      </RouteDrawer.Body>
      <RouteDrawer.Footer>
        <div className="flex items-center gap-x-2">
          <RouteDrawer.Close asChild>
            <Button size="small" variant="secondary">
              {t("actions.cancel")}
            </Button>
          </RouteDrawer.Close>
        </div>
      </RouteDrawer.Footer>
    </RouteDrawer>
  )
}
