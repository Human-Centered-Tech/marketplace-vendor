import * as Sentry from "@sentry/react"
import {
  RouterProvider as Provider,
  createBrowserRouter,
} from "react-router-dom"

import { RouteMap } from "./route-map"

// Wrap so route changes are traced under their route pattern. A no-op until
// Sentry.init runs (see lib/sentry.ts); when the DSN is unset it just proxies
// to the native createBrowserRouter.
const sentryCreateBrowserRouter =
  Sentry.wrapCreateBrowserRouterV6(createBrowserRouter)

const router = sentryCreateBrowserRouter(RouteMap, {
  basename: __BASE__ || "/",
})

export const RouterProvider = () => {
  return <Provider router={router} />
}
