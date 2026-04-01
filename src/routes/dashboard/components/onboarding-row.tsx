import { Check } from "@medusajs/icons"
import { clx } from "@medusajs/ui"
import { Link } from "react-router-dom"

export const OnboardingRow = ({
  label,
  description,
  state,
  link,
  buttonLabel,
  stepNumber,
}: {
  label: string
  description?: string
  state: boolean
  link: string
  buttonLabel: string
  stepNumber: number
}) => {
  return (
    <div className="flex items-center justify-between rounded-lg px-4 py-4 transition-colors hover:bg-co-cream/50">
      <div className="flex items-center gap-4">
        <div
          className={clx(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-all",
            {
              "border-2 border-dashed border-co-navy/20 text-co-text-secondary font-poppins":
                !state,
              "border-2 border-co-success bg-co-success/10 text-co-success":
                state,
            }
          )}
        >
          {state ? <Check /> : stepNumber}
        </div>
        <div>
          <h4 className="font-poppins text-sm font-medium text-co-text">
            {label}
          </h4>
          {description && (
            <p className="font-poppins text-xs text-co-text-secondary mt-0.5">
              {description}
            </p>
          )}
        </div>
      </div>
      <Link to={link}>
        <button
          className={clx(
            "min-w-[80px] rounded-lg px-4 py-2 font-poppins text-sm font-medium transition-all",
            {
              "bg-co-navy text-co-text-on-dark hover:bg-co-navy-light": !state,
              "border border-co-success/30 bg-co-success/5 text-co-success":
                state,
            }
          )}
        >
          {state ? "Done" : buttonLabel}
        </button>
      </Link>
    </div>
  )
}
