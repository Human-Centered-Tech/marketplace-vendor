import * as Sentry from "@sentry/react"

// DSN + environment are injected at container start by scripts/launch-vendor.js
// into /runtime-config.js (window.__RUNTIME_CONFIG__), with the build-time
// `define` values as a local-dev fallback — the same pattern used for the
// backend URL and publishable key in lib/client/client.ts.
//
// The DSN is a public client key (safe to embed). When it's unset, initSentry()
// is a no-op, so this stays dormant until an org admin creates the
// "vendor-dashboard" Sentry project and sets SENTRY_DSN on the Railway service.
const runtimeConfig =
  (typeof window !== "undefined" && window.__RUNTIME_CONFIG__) || {}

const dsn = runtimeConfig.sentryDsn || __SENTRY_DSN__ || ""
const environment =
  runtimeConfig.sentryEnvironment || __SENTRY_ENVIRONMENT__ || "production"

export const initSentry = () => {
  if (!dsn) {
    return
  }

  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: 0.05,
    // Session Replay: a sample of all sessions plus 100% of errored sessions,
    // so we can see what a merchant was actually doing when the panel broke.
    // Text and media are masked — this panel shows orders, payouts, and
    // customer PII.
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    ignoreErrors: [
      // Transient chunk-load failures when a merchant's already-open tab
      // predates a deploy — self-healing on reload, pure noise if reported.
      /Failed to fetch dynamically imported module/,
      /Importing a module script failed/,
      /ChunkLoadError/,
      /Loading chunk \d+ failed/,
    ],
  })
}
