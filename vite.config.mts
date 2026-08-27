import inject from "@medusajs/admin-vite-plugin"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import inspect from "vite-plugin-inspect"

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  const BASE = env.VITE_MEDUSA_BASE || "/"
  const BACKEND_URL = env.VITE_MEDUSA_BACKEND_URL || "http://localhost:9000"
  const STOREFRONT_URL =
    env.VITE_MEDUSA_STOREFRONT_URL || "http://localhost:8000"
  const PUBLISHABLE_API_KEY = env.VITE_PUBLISHABLE_API_KEY || ""
  const TALK_JS_APP_ID = env.VITE_TALK_JS_APP_ID || ""
  const DISABLE_SELLERS_REGISTRATION =
    env.VITE_DISABLE_SELLERS_REGISTRATION || "false"
  const PAYMENTS_DISABLED = env.VITE_PAYMENTS_DISABLED || "false"
  const PUBLIC_BASE_URL = env.VITE_PUBLIC_BASE_URL || ""
  const SENTRY_DSN = env.VITE_SENTRY_DSN || ""
  const SENTRY_ENVIRONMENT = env.VITE_SENTRY_ENVIRONMENT || "development"

  // Hostnames the panel used to live on (comma-separated, no scheme). Any
  // request arriving on one of these is 301'd to the same path on
  // PUBLIC_BASE_URL, so links in old emails / bookmarks keep working after a
  // domain move (v3-vendor → members, 2026-08). Unset = no redirects.
  const hostOf = (url: string) =>
    url.replace(/^https?:\/\//, "").split("/")[0].toLowerCase()
  const PUBLIC_HOST = PUBLIC_BASE_URL ? hostOf(PUBLIC_BASE_URL) : ""
  const LEGACY_HOSTS = (env.VITE_LEGACY_HOSTS || "")
    .split(",")
    .map((h) => hostOf(h.trim()))
    .filter(Boolean)
  // `vite preview` (which serves prod on Railway) rejects requests whose Host
  // header isn't listed — the legacy hosts must be allowed or they 403 before
  // the redirect can fire.
  const allowedHosts = [PUBLIC_HOST, ...LEGACY_HOSTS].filter(Boolean)

  const legacyHostRedirect = () => ({
    name: "legacy-host-redirect",
    configurePreviewServer(server: any) {
      if (!PUBLIC_BASE_URL || LEGACY_HOSTS.length === 0) return
      const target = PUBLIC_BASE_URL.replace(/\/+$/, "")
      server.middlewares.use((req: any, res: any, next: any) => {
        const host = String(req.headers.host || "")
          .split(":")[0]
          .toLowerCase()
        if (!LEGACY_HOSTS.includes(host)) return next()
        // URL fragments (e.g. /login#handoff=<sso-token>) never reach the
        // server; browsers carry them across a 301 whose Location has none.
        res.statusCode = 301
        res.setHeader("Location", `${target}${req.url || "/"}`)
        res.setHeader("Cache-Control", "public, max-age=3600")
        res.end()
      })
    },
  })

  /**
   * Add this to your .env file to specify the project to load admin extensions from.
   */
  const MEDUSA_PROJECT = env.VITE_MEDUSA_PROJECT || null
  const sources = MEDUSA_PROJECT ? [MEDUSA_PROJECT] : []

  return {
    plugins: [
      inspect(),
      react(),
      inject({
        sources,
      }),
      legacyHostRedirect(),
    ],
    define: {
      __BASE__: JSON.stringify(BASE),
      __BACKEND_URL__: JSON.stringify(BACKEND_URL),
      __STOREFRONT_URL__: JSON.stringify(STOREFRONT_URL),
      __PUBLISHABLE_API_KEY__: JSON.stringify(PUBLISHABLE_API_KEY),
      __TALK_JS_APP_ID__: JSON.stringify(TALK_JS_APP_ID),
      __DISABLE_SELLERS_REGISTRATION__: JSON.stringify(
        DISABLE_SELLERS_REGISTRATION
      ),
      __PAYMENTS_DISABLED__: JSON.stringify(PAYMENTS_DISABLED),
      __SENTRY_DSN__: JSON.stringify(SENTRY_DSN),
      __SENTRY_ENVIRONMENT__: JSON.stringify(SENTRY_ENVIRONMENT),
    },
    server: {
      host: true,
      port: parseInt(process.env.PORT || '5173'),
      open: false,
      allowedHosts,
    },
    preview: {
      host: true,
      port: parseInt(process.env.PORT || '4173'),
      allowedHosts,
    },
    optimizeDeps: {
      entries: [],
      include: ["recharts"],
    },
  }
})
