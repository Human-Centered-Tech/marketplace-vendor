import { Spinner } from "@medusajs/icons"
import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

const STOREFRONT_LOGIN_URL = `${__STOREFRONT_URL__}/us/user?return_to=${encodeURIComponent(
  "/api/vendor-handoff"
)}`

export const Login = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const reason = searchParams.get("reason") || ""

  const [isHandoff] = useState(
    () => typeof window !== "undefined" && window.location.hash.startsWith("#handoff=")
  )

  useEffect(() => {
    if (typeof window === "undefined") return

    const hash = window.location.hash
    if (hash.startsWith("#handoff=")) {
      const token = decodeURIComponent(hash.slice("#handoff=".length))
      if (token) {
        window.localStorage.setItem("medusa_auth_token", token)
        window.history.replaceState(null, "", window.location.pathname)
        navigate("/dashboard", { replace: true })
      }
      return
    }

    const target = reason
      ? `${STOREFRONT_LOGIN_URL}&reason=${encodeURIComponent(reason)}`
      : STOREFRONT_LOGIN_URL
    window.location.replace(target)
  }, [navigate, reason])

  return (
    <div className="co-auth-page">
      <div className="co-auth-card flex flex-col items-center justify-center py-16">
        <Spinner className="text-ui-fg-interactive animate-spin" />
        <p className="font-poppins text-sm text-co-text-secondary mt-4">
          {isHandoff ? "Signing you in..." : "Redirecting to sign in..."}
        </p>
      </div>
    </div>
  )
}
