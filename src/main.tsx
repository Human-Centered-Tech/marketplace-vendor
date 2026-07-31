import React from "react"
import ReactDOM from "react-dom/client"
import App from "./app.js"
import { initSentry } from "./lib/sentry"

// Must run before the app renders so the SDK's global handlers and route
// instrumentation are in place for the first navigation.
initSentry()

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
