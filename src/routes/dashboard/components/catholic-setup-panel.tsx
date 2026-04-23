import { useQuery } from "@tanstack/react-query"
import { Container, Heading, Text, Badge } from "@medusajs/ui"
import { sdk, backendUrl } from "../../../lib/client"
import { useBankingInfo } from "../../../hooks/api/banking-info"

type CatholicOnboarding = {
  seller_id: string
  directory: {
    id?: string
    listing_exists: boolean
    listing_verified: boolean
    subscription_active: boolean
    subscription_tier: "verified" | "featured" | "enterprise" | null
    owner_interview_populated: boolean
    parish_affiliated: boolean
  }
}

const STOREFRONT_URL =
  // Grabbed at build time if set; otherwise linked relatively.
  (typeof window !== "undefined" &&
    ((window as any).__STOREFRONT_URL__ as string)) ||
  ""

/**
 * Catholic Owned-specific setup checklist. Complements Mercur's native
 * onboarding (store info, products, shipping) with platform-specific
 * steps: directory listing verification, owner interview, parish
 * affiliation.
 *
 * These steps are authored by the vendor on the customer-facing
 * storefront (because directory listings and SSO profiles live
 * there). Each row deep-links to the right storefront page.
 */
export const CatholicSetupPanel = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["catholic-onboarding"],
    queryFn: () =>
      sdk.client
        .fetch<CatholicOnboarding>("/vendor/catholic-onboarding")
        .catch(() => null),
  })
  const { data: bankingResp } = useBankingInfo()
  const bankingOnFile = Boolean(bankingResp?.banking_info)

  const buildStorefrontUrl = (path: string) => {
    // Use the reverse-SSO handoff endpoint so the vendor logs into
    // the storefront seamlessly. Falls back to a direct link.
    const base = STOREFRONT_URL
    if (!base) return path
    const returnTo = encodeURIComponent(path)
    return `${backendUrl.replace(/\/$/, "")}/store/account/customer-token?return_to=${returnTo}`
  }

  if (isLoading || !data) {
    return null
  }

  const d = data.directory
  const steps = [
    {
      done: d.listing_exists,
      label: "Directory listing created",
      hint: "Your directory listing is the public face of your business on Catholic Owned.",
      cta: d.listing_exists
        ? null
        : {
            label: "Create listing",
            to: buildStorefrontUrl("/user/directory/create"),
          },
    },
    {
      done: d.subscription_active,
      label: "Subscription active",
      hint: d.subscription_active
        ? `Current plan: ${d.subscription_tier}`
        : "A directory subscription is required to list products for sale.",
      cta: d.subscription_active
        ? null
        : {
            label: "Subscribe",
            to: buildStorefrontUrl("/user/directory/subscription"),
          },
    },
    {
      done: d.listing_verified,
      label: "Listing verified",
      hint: d.listing_verified
        ? "Your listing shows the verified business badge."
        : "Our team is reviewing your listing. You'll receive an email when it's approved.",
      cta: null,
    },
    {
      done: d.owner_interview_populated,
      label: "Owner interview added",
      hint: "Share a few words about yourself and your faith — customers love knowing the people behind the business.",
      cta: d.owner_interview_populated
        ? null
        : {
            label: "Add interview",
            to: buildStorefrontUrl("/user/directory/edit"),
          },
    },
    {
      done: d.parish_affiliated,
      label: "Parish affiliation",
      hint: "Connect your business to your parish community to appear in local searches.",
      cta: d.parish_affiliated
        ? null
        : {
            label: "Add parish",
            to: buildStorefrontUrl("/user/directory/edit"),
          },
    },
    {
      done: bankingOnFile,
      label: "Banking information",
      hint: bankingOnFile
        ? "Your ACH banking info is on file. Payouts begin end of June when the marketplace launches."
        : "Add your ACH account so you're ready when payouts start (end of June launch).",
      cta: bankingOnFile
        ? null
        : {
            label: "Add banking info",
            to: "/banking-info",
          },
    },
  ]

  const completed = steps.filter((s) => s.done).length

  return (
    <Container>
      <div className="flex items-center justify-between mb-4">
        <div>
          <Heading level="h2">Catholic Owned Setup</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Platform-specific steps to complete your vendor profile
          </Text>
        </div>
        <Badge color={completed === steps.length ? "green" : "orange"}>
          {completed}/{steps.length}
        </Badge>
      </div>

      <div className="divide-y">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start justify-between py-3 gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step.done
                    ? "bg-green-100 text-green-700"
                    : "bg-ui-bg-subtle text-ui-fg-subtle border"
                }`}
              >
                {step.done ? "✓" : i + 1}
              </div>
              <div>
                <Text weight="plus" className={step.done ? "line-through text-ui-fg-subtle" : ""}>
                  {step.label}
                </Text>
                <Text size="small" className="text-ui-fg-subtle">
                  {step.hint}
                </Text>
              </div>
            </div>
            {step.cta && (
              <a
                href={step.cta.to}
                className="shrink-0 text-sm text-ui-fg-interactive underline"
                target={step.cta.to.startsWith("http") ? "_blank" : undefined}
                rel={step.cta.to.startsWith("http") ? "noopener" : undefined}
              >
                {step.cta.label}
              </a>
            )}
          </div>
        ))}
      </div>
    </Container>
  )
}
