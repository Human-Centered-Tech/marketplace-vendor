import { useState } from "react"
import { Text } from "@medusajs/ui"

/**
 * Coaching for merchants choosing product categories.
 *
 * Categories drive browse and filtering, so a wrong or missing one makes a
 * product effectively invisible to anyone who doesn't already search for it by
 * name — 202 products were sitting uncategorized at the 7/30 review.
 *
 * The four rules below are NOT invented here. They are Brooke's own
 * disambiguations from that review ("judgment calls worth a rule-of-thumb"),
 * reproduced verbatim in substance. Keep them in sync with her guidance: if
 * this copy drifts from how products are actually reviewed, merchants get
 * coached toward one answer and corrected toward another, which is worse than
 * saying nothing.
 *
 * Deliberately does NOT promise that anyone checks the choice — listings and
 * vendors auto-approve (manual removal only), so "we'll review it" would be a
 * promise nothing keeps.
 */
export const CategoryCoaching = () => {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-2">
      <Text size="small" leading="compact" className="text-ui-fg-subtle">
        Categories are how shoppers find you — most browse by category before
        they search. Pick the most specific one that fits.
      </Text>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-ui-fg-interactive txt-small mt-1 hover:underline"
      >
        {open ? "Hide tips" : "Not sure which one?"}
      </button>
      {open && (
        <div className="border-ui-border-base bg-ui-bg-subtle mt-2 rounded-md border p-3">
          <ul className="flex flex-col gap-2">
            <li>
              <Text size="small" leading="compact">
                <strong>Religious Goods vs Catholic Gifts &amp; Home Goods</strong>{" "}
                — Strictly devotional items — rosaries, medals, statues,
                sacramentals — go in Religious Goods. Faith-themed gifts and
                things for the home go in Catholic Gifts &amp; Home Goods.
              </Text>
            </li>
            <li>
              <Text size="small" leading="compact">
                <strong>Wedding &amp; Sacraments</strong> — First Communion,
                Confirmation, Baptism and wedding items belong here, even when
                they&apos;re devotional too.
              </Text>
            </li>
            <li>
              <Text size="small" leading="compact">
                <strong>
                  Men&apos;s / Women&apos;s vs Clothing, Shoes &amp; Accessories
                </strong>{" "}
                — If it&apos;s cut for men or women, use Men&apos;s or
                Women&apos;s. Use Clothing for unisex or general apparel.
              </Text>
            </li>
            <li>
              <Text size="small" leading="compact">
                <strong>Wall art</strong> — An original piece goes in
                Collectibles &amp; Fine Art. A reproduction or print goes in
                Home Decor.
              </Text>
            </li>
          </ul>
          <Text
            size="small"
            leading="compact"
            className="text-ui-fg-subtle mt-2"
          >
            Still unsure? Pick the closest fit — you can change it any time.
          </Text>
        </div>
      )}
    </div>
  )
}
