const commonHiddenFields = [
  "type",
  "application_method.type",
  "application_method.allocation",
]

// Order-level templates (amount_off_order, percentage_off_order) are
// intentionally not exposed here. Mercur's /vendor/promotions validator
// rejects target_type: "order" because such a promo would discount every
// line in the cart — including items from other vendors — which violates
// the per-vendor scoping the platform enforces. The auto-injected
// seller-product rule also assumes target_type: "items". Leave order-level
// promos to platform-admin-created promotions only.
export const templates = [
  {
    id: "amount_off_products",
    type: "standard",
    title: "Amount off products",
    description: "Discount specific products or collection of products",
    hiddenFields: [...commonHiddenFields],
    defaults: {
      is_automatic: "false",
      type: "standard",
      application_method: {
        allocation: "each",
        target_type: "items",
        type: "fixed",
      },
    },
  },
  {
    id: "percentage_off_product",
    type: "standard",
    title: "Percentage off product",
    description: "Discounts a percentage off selected products",
    hiddenFields: [...commonHiddenFields],
    defaults: {
      is_automatic: "false",
      type: "standard",
      application_method: {
        allocation: "each",
        target_type: "items",
        type: "percentage",
      },
    },
  },
]
