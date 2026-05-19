import { useEffect, useState } from "react"
import { Link, useLocation, useSearchParams } from "react-router-dom"

// When a vendor clicks a CTA on the dashboard setup checklist, the link
// carries `?from=dashboard`. We mirror that to sessionStorage on entry so
// the bar survives refresh and intra-task navigation (e.g. creating then
// editing a location), then strip the param from the URL. The flag is
// cleared the moment the vendor lands on /dashboard so it doesn't follow
// them around the rest of the app once they're done.
const STORAGE_KEY = "vendor:returnToDashboard"

export const BackToDashboardBar = () => {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [active, setActive] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return window.sessionStorage.getItem(STORAGE_KEY) === "1"
  })

  useEffect(() => {
    if (typeof window === "undefined") return

    if (searchParams.get("from") === "dashboard") {
      window.sessionStorage.setItem(STORAGE_KEY, "1")
      setActive(true)
      const next = new URLSearchParams(searchParams)
      next.delete("from")
      setSearchParams(next, { replace: true })
      return
    }

    if (location.pathname === "/dashboard" || location.pathname === "/") {
      window.sessionStorage.removeItem(STORAGE_KEY)
      setActive(false)
    }
  }, [location.pathname, searchParams, setSearchParams])

  if (!active) return null

  return (
    <div className="flex items-center justify-between rounded-lg border border-co-navy/15 bg-co-cream/40 px-4 py-2">
      <span className="font-poppins text-sm text-co-text-secondary">
        Continuing setup from your dashboard.
      </span>
      <Link
        to="/dashboard"
        className="font-poppins inline-flex items-center gap-1 text-sm font-medium text-co-navy hover:underline"
      >
        ← Back to dashboard
      </Link>
    </div>
  )
}
