import { ExclamationCircle, Spinner } from "@medusajs/icons"
import { Text } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Navigate, useLocation, useRouteError } from "react-router-dom"
import * as Sentry from "@sentry/react"

import { isFetchError } from "../../../lib/is-fetch-error"
import { isSessionDead } from "../../../lib/session-probe"

/**
 * 401 gate ("signing you in" loop, Brooke 8/11): a route-thrown 401 used to
 * redirect straight to /login, which runs the storefront SSO handoff — but an
 * endpoint-specific 401 arrives with the session still perfectly valid, so
 * the handoff restored the same token and the user saw "Signing you in..."
 * on every navigation into the affected section. Probe /vendor/sellers/me
 * first: dead session -> /login as before; live session -> render the normal
 * error screen so the actual failing endpoint is visible (and now reaches
 * Sentry) instead of being laundered into a logout.
 */
const UnauthorizedGate = ({ error }: { error: unknown }) => {
  const location = useLocation()
  const [dead, setDead] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    isSessionDead().then((d) => {
      if (!cancelled) setDead(d)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (dead === false) {
      // Session alive — this 401 is a real endpoint defect worth reporting.
      Sentry.captureException(error)
    }
  }, [dead, error])

  if (dead === null) {
    return (
      <div className="flex size-full min-h-[calc(100vh-57px-24px)] items-center justify-center">
        <Spinner className="text-ui-fg-interactive animate-spin" />
      </div>
    )
  }

  if (dead) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <ErrorFallback code={401} />
}

export const ErrorBoundary = () => {
  const error = useRouteError()

  const is401 = isFetchError(error) && error.status === 401

  // react-router renders this element instead of rethrowing, so Sentry's global
  // handlers never see route/render errors — report them here. Skip 401s: the
  // UnauthorizedGate reports only the ones that turn out NOT to be a lapsed
  // session (a lapsed session is expected and handled).
  useEffect(() => {
    if (is401) {
      return
    }
    Sentry.captureException(error)
  }, [error, is401])

  let code: number | null = null

  if (isFetchError(error)) {
    if (error.status === 401) {
      return <UnauthorizedGate error={error} />
    }

    code = error.status ?? null
  }

  /**
   * Log error in development mode.
   *
   * react-router-dom will sometimes swallow the error,
   * so this ensures that we always log it.
   */
  if (process.env.NODE_ENV === "development") {
    console.error(error)
  }

  return <ErrorFallback code={code} />
}

const ErrorFallback = ({ code }: { code: number | null }) => {
  const { t } = useTranslation()

  let title: string
  let message: string

  switch (code) {
    case 400:
      title = t("errorBoundary.badRequestTitle")
      message = t("errorBoundary.badRequestMessage")
      break
    case 404:
      title = t("errorBoundary.notFoundTitle")
      message = t("errorBoundary.notFoundMessage")
      break
    case 500:
      title = t("errorBoundary.internalServerErrorTitle")
      message = t("errorBoundary.internalServerErrorMessage")
      break
    default:
      title = t("errorBoundary.defaultTitle")
      message = t("errorBoundary.defaultMessage")
      break
  }

  return (
    <div className="flex size-full min-h-[calc(100vh-57px-24px)] items-center justify-center">
      <div className="flex flex-col gap-y-6">
        <div className="text-ui-fg-subtle flex flex-col items-center gap-y-3">
          <ExclamationCircle />
          <div className="flex flex-col items-center justify-center gap-y-1">
            <Text size="small" leading="compact" weight="plus">
              {title}
            </Text>
            <Text
              size="small"
              className="text-ui-fg-muted text-balance text-center"
            >
              {message}
            </Text>
          </div>
        </div>
      </div>
    </div>
  )
}
