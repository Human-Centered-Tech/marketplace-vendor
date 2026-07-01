import { z } from "zod"

// Carriers the vendor can pick at ship time. The backend mirrors this short
// list in marketplace-backend/src/lib/carriers.ts (it owns the carrier →
// tracking-URL map used to build the "Track package" deep-link in the buyer
// shipped email). Keep the two `value`s in sync. Separate builds, so this is
// duplicated rather than imported across repos.
export const SHIPMENT_CARRIERS = [
  { value: "usps", label: "USPS" },
  { value: "ups", label: "UPS" },
  { value: "fedex", label: "FedEx" },
  { value: "dhl", label: "DHL" },
  { value: "other", label: "Other" },
] as const

// Build the carrier tracking-page URL so we can store it as the fulfillment's
// tracking_url (instead of "#") — that's what makes the buyer's on-page "Track
// package" link work, not just the shipped email. Mirrors the backend +
// storefront builders; returns null for "other"/unknown or an empty number.
export function buildTrackingUrl(
  carrier: string | null | undefined,
  trackingNumber: string | null | undefined
): string | null {
  const number = (trackingNumber || "").trim().replace(/\s+/g, "")
  if (!number) return null
  const n = encodeURIComponent(number)
  switch ((carrier || "").trim().toLowerCase()) {
    case "usps":
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`
    case "ups":
      return `https://www.ups.com/track?tracknum=${n}`
    case "fedex":
      return `https://www.fedex.com/fedextrack/?trknbr=${n}`
    case "dhl":
      return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${n}`
    default:
      return null
  }
}

export const CreateShipmentSchema = z.object({
  labels: z.array(
    z.object({
      tracking_number: z.string(),
      // TODO: this 2 are not optional in the API
      tracking_url: z.string().optional(),
      label_url: z.string().optional(),
    })
  ),
  // Carrier value (usps/ups/fedex/dhl/other). Stored on order.metadata.carrier
  // via the shipping-note endpoint; the backend turns it into the "Carrier: …"
  // line and the carrier "Track package" deep-link in the buyer email. Optional.
  carrier: z.string().optional(),
  // Free-text note shown to the buyer in the shipped email (e.g.
  // "Mailed via USPS First Class — no tracking"). Stored on the order,
  // separate from tracking. Optional.
  shipping_note: z.string().optional(),
})
