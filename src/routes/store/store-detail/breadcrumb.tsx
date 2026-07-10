import { useTranslation } from "react-i18next"

import { useSetup } from "../../../hooks/api/setup"

// Service businesses have no storefront, so the /settings/store surface is
// presented to them as "Business" (matches the settings-nav label).
export const StoreSettingsBreadcrumb = () => {
  const { t } = useTranslation()
  const { data: setup } = useSetup()

  return <>{setup?.is_service === true ? "Business" : t("store.domain")}</>
}
