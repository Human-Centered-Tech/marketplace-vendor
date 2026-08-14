import { backendUrl, publishableApiKey } from "./client/client"

const AUTH_TOKEN_KEY = "medusa_auth_token"

/**
 * "Is the vendor session actually dead?" — asked before treating a 401 as a
 * logout ("signing you in" loop, Brooke 8/11).
 *
 * A 401 from one endpoint does not mean the session lapsed: an endpoint with
 * its own authorization quirk can 401 while every other request on the page
 * succeeds. The old behavior treated any 401 as session death, deleted a
 * perfectly valid token, and bounced through the storefront SSO handoff —
 * which silently restored the SAME token. Net effect: the user stayed signed
 * in but saw the "Signing you in..." handoff flash on every dashboard
 * navigation that touched the quirky endpoint.
 *
 * This probe hits /vendor/sellers/me — the same call ProtectedRoute gates on,
 * so it is authoritative for "can this token drive the dashboard". Only a 401
 * from the probe itself counts as dead; a network failure is NOT death (a
 * flaky connection shouldn't log anyone out).
 *
 * Concurrent callers share one in-flight probe (a section load can fail many
 * queries at once), and the verdict is cached briefly so a burst of 401s
 * doesn't stampede the backend.
 */
const PROBE_CACHE_MS = 5_000

let inflight: Promise<boolean> | null = null
let lastVerdict: { at: number; dead: boolean } | null = null

export const isSessionDead = (): Promise<boolean> => {
  if (lastVerdict && Date.now() - lastVerdict.at < PROBE_CACHE_MS) {
    return Promise.resolve(lastVerdict.dead)
  }
  if (inflight) {
    return inflight
  }

  inflight = (async () => {
    try {
      const bearer = window.localStorage.getItem(AUTH_TOKEN_KEY) || ""
      if (!bearer) return true
      const res = await fetch(`${backendUrl}/vendor/sellers/me?fields=id`, {
        method: "GET",
        headers: {
          authorization: `Bearer ${bearer}`,
          "x-publishable-api-key": publishableApiKey,
        },
      })
      return res.status === 401
    } catch {
      return false
    } finally {
      // The verdict is recorded by the caller below; just release the slot.
    }
  })()

  return inflight
    .then((dead) => {
      lastVerdict = { at: Date.now(), dead }
      return dead
    })
    .finally(() => {
      inflight = null
    })
}
