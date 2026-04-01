import { OnboardingRow } from "./onboarding-row"
import { useUpdateOnboarding } from "../../../hooks/api"
import { useEffect } from "react"

type DashboardProps = {
  products: boolean
  locations_shipping: boolean
  store_information: boolean
  stripe_connect: boolean
}

export const DashboardOnboarding = ({
  products,
  locations_shipping,
  store_information,
  // stripe_connect,
}: DashboardProps) => {
  const { mutateAsync } = useUpdateOnboarding()

  useEffect(() => {
    mutateAsync()
  }, [])

  const completedCount = [store_information, locations_shipping, products].filter(Boolean).length
  const totalSteps = 3

  return (
    <div className="rounded-xl bg-white p-0 shadow-[0_4px_24px_rgba(23,41,74,0.08)]">
      {/* Header with navy background */}
      <div className="rounded-t-xl bg-co-navy px-8 py-6">
        <div className="mb-2 flex items-center gap-3">
          <img
            src="/Logo.png"
            alt="Catholic Owned"
            className="h-8 w-auto object-contain brightness-0 invert"
          />
        </div>
        <h1 className="font-poppins text-base font-medium text-co-text-on-dark/80">
          Welcome to the Vendor Portal
        </h1>
        <p className="font-poppins mt-1 text-sm text-co-text-on-dark/70">
          Complete these steps to start selling on the marketplace
        </p>
        {/* Progress bar */}
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
      </div>

      {/* Gold rule */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-co-gold to-transparent" />

      {/* Onboarding steps */}
      <div className="px-4 py-4 space-y-1">
        <OnboardingRow
          stepNumber={1}
          label="Complete your store information"
          description="Add your business name, description, and branding"
          state={store_information}
          link="/settings/store"
          buttonLabel="Manage"
        />
        <OnboardingRow
          stepNumber={2}
          label="Setup locations & shipping"
          description="Configure where you ship from and your shipping rates"
          state={locations_shipping}
          link="/settings/locations"
          buttonLabel="Setup"
        />
        <OnboardingRow
          stepNumber={3}
          label="Add your first product"
          description="List a product and start selling to the Catholic community"
          state={products}
          link="/products/create"
          buttonLabel="Add"
        />
      </div>
    </div>
  )
}
