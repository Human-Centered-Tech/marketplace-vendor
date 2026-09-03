export const SEARCH_AREAS = [
  "all",
  "order",
  "product",
  "productVariant",
  "inventory",
  "customer",
  "customerGroup",
  "promotion",
  "campaign",
  "priceList",
  "user",
  "region",
  "taxRegion",
  "returnReason",
  "salesChannel",
  "productType",
  "productTag",
  // "location" / "shippingProfile" removed — sellers never see shipping
  // config (provisioned server-side); the pages are unregistered.
  "publishableApiKey",
  "secretApiKey",
  "command",
  "navigation",
] as const

export const DEFAULT_SEARCH_LIMIT = 3
export const SEARCH_LIMIT_INCREMENT = 20
