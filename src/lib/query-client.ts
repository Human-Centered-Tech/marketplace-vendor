import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"

import { isFetchError } from "./is-fetch-error"
import { isSessionDead } from "./session-probe"

export const MEDUSA_BACKEND_URL = __BACKEND_URL__ ?? "/"

const AUTH_TOKEN_KEY = "medusa_auth_token"

/**
 * A request coming back 401 USUALLY means the session lapsed (often mid-use,
 * with the tab still open) — but not always: one endpoint with its own
 * authorization quirk can 401 while the session is fine. Treating every 401
 * as death deleted a valid token and sent the user through the storefront SSO
 * handoff, which restored the same token — the "Signing you in..." flash on
 * every dashboard navigation (Brooke, 8/11). So: confirm against
 * /vendor/sellers/me (see session-probe) before dropping the token; an
 * endpoint-specific 401 now surfaces as an ordinary request error instead of
 * a logout.
 *
 * Redirect handling differs by source:
 *  - Query errors are rethrown into the route ErrorBoundary, which runs the
 *    same probe before redirecting 401 -> /login, so we only clear the token
 *    here.
 *  - Mutation errors never reach the ErrorBoundary (they surface as a toast),
 *    so we redirect here as a fallback rather than stranding a logged-out user
 *    on an "unauthorized" toast.
 */
const handleUnauthorized = async (error: unknown, redirect: boolean) => {
  if (!isFetchError(error) || error.status !== 401) {
    return
  }

  if (
    typeof window === "undefined" ||
    window.location.pathname.startsWith("/login")
  ) {
    return
  }

  if (!(await isSessionDead())) {
    return
  }

  try {
    window.localStorage.removeItem(AUTH_TOKEN_KEY)
  } catch {
    // localStorage can be unavailable (e.g. blocked cookies); ignore.
  }

  if (redirect) {
    window.location.assign("/login")
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => handleUnauthorized(error, false),
  }),
  mutationCache: new MutationCache({
    onError: (error) => handleUnauthorized(error, true),
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 90000,
      retry: 1,
    },
  },
})
