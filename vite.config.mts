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

  /**
   * Add this to your .env file to specify the project to load admin extensions from.
   */
  const MEDUSA_PROJECT = env.VITE_MEDUSA_PROJECT || null
  const sources = MEDUSA_PROJECT ? [MEDUSA_PROJECT] : []

  /**
   * Security headers, applied to BOTH the dev server and `vite preview` — the
   * latter is what serves production traffic (scripts/launch-vendor.js), so the
   * deployed vendor portal previously sent none of these at all.
   *
   * This matters more here than on most SPAs: the seller session token lives in
   * localStorage, so it is readable by any script that executes on this origin.
   * CSP is the compensating control for that, which is why it is being added
   * even in report-only form.
   *
   * CSP is deliberately REPORT-ONLY: it blocks nothing yet, it only reports.
   * Promote it to the enforcing `Content-Security-Policy` header in a follow-up,
   * after watching the console for violations against the real app.
   *
   * `connect-src` can only list the BUILD-TIME backend. The deployed backend is
   * injected at container start into dist/runtime-config.js, so it may differ;
   * add that origin before enforcing.
   */
  const CSP_REPORT_ONLY = [
    "default-src 'self'",
    "script-src 'self'",
    // Vite and Tailwind both inject inline <style> blocks.
    "style-src 'self' 'unsafe-inline'",
    // Product, seller, and directory media come from arbitrary CDNs.
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${BACKEND_URL} ${STOREFRONT_URL}`,
    // Shopify-import walkthrough video (src/routes/imports/imports.tsx).
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ")

  const SECURITY_HEADERS = {
    // Enforcing. The vendor portal is never meant to be framed; this is the real
    // clickjacking control (CSP frame-ancestors above is report-only for now).
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    // Ignored by browsers over plain HTTP, so local dev is unaffected.
    // No `preload` — that is a one-way door and belongs to whoever owns the domain.
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy-Report-Only": CSP_REPORT_ONLY,
  }

  return {
    plugins: [
      inspect(),
      react(),
      inject({
        sources,
      }),
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
    },
    server: {
      host: true,
      port: parseInt(process.env.PORT || '5173'),
      open: false,
      headers: SECURITY_HEADERS,
      allowedHosts: PUBLIC_BASE_URL ? [PUBLIC_BASE_URL.replace('https://', '').replace('http://', '').split('/')[0]] : [],
    },
    preview: {
      host: true,
      port: parseInt(process.env.PORT || '4173'),
      headers: SECURITY_HEADERS,
      allowedHosts: PUBLIC_BASE_URL ? [PUBLIC_BASE_URL.replace('https://', '').replace('http://', '').split('/')[0]] : [],
    },
    optimizeDeps: {
      entries: [],
      include: ["recharts"],
    },
  }
})
