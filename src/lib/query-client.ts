import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"

import { isFetchError } from "./is-fetch-error"

export const MEDUSA_BACKEND_URL = __BACKEND_URL__ ?? "/"

const AUTH_TOKEN_KEY = "medusa_auth_token"

/**
 * Vendor sessions are short-lived SSO-handoff tokens, so a request coming back
 * 401 means the session lapsed (often mid-use, with the tab still open). When
 * that happens, drop the dead token so the next load runs the login/handoff
 * cleanly instead of re-presenting an invalid one.
 *
 * Redirect handling differs by source:
 *  - Query errors are rethrown into the route ErrorBoundary, which already
 *    redirects 401 -> /login, so we only clear the token here.
 *  - Mutation errors never reach the ErrorBoundary (they surface as a toast),
 *    so we redirect here as a fallback rather than stranding a logged-out user
 *    on an "unauthorized" toast.
 */
const handleUnauthorized = (error: unknown, redirect: boolean) => {
  if (!isFetchError(error) || error.status !== 401) {
    return
  }

  try {
    window.localStorage.removeItem(AUTH_TOKEN_KEY)
  } catch {
    // localStorage can be unavailable (e.g. blocked cookies); ignore.
  }

  if (
    redirect &&
    typeof window !== "undefined" &&
    !window.location.pathname.startsWith("/login")
  ) {
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
