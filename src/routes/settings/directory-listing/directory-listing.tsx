import { Button, Container, Heading, Text } from "@medusajs/ui"

import { backendUrl, publishableApiKey } from "../../../lib/client"
import { MEDUSA_STOREFRONT_URL } from "../../../lib/storefront"

// Directory-listing management lives on the storefront (/user/directory).
// From the vendor portal we reverse-SSO hand off so the merchant lands on
// the edit form already logged in. Mirrors the handoff used by the
// dashboard setup checklist: mint a short-lived customer token, then bounce
// to the storefront's /customer-handoff with the token in the URL fragment
// (kept out of logs/Referer); the storefront exchanges it for a session and
// forwards to return_to. Falls back to a plain redirect if the token mint
// fails — the vendor still lands on the page, just not auto-logged-in.
const editDirectoryListing = async () => {
  const returnTo = "/user/directory/edit"

  try {
    const bearer = window.localStorage.getItem("medusa_auth_token") || ""
    const res = await fetch(
      `${backendUrl.replace(/\/$/, "")}/store/account/customer-token`,
      {
        headers: {
          authorization: `Bearer ${bearer}`,
          "x-publishable-api-key": publishableApiKey,
        },
      }
    )

    if (res.ok) {
      const { token } = (await res.json()) as { token: string }
      const params = new URLSearchParams({
        handoff: token,
        return_to: returnTo,
      })
      window.location.href = `${MEDUSA_STOREFRONT_URL}/customer-handoff#${params.toString()}`
      return
    }
  } catch {
    // fall through to the plain redirect
  }

  window.location.href = `${MEDUSA_STOREFRONT_URL}${returnTo}`
}

export const DirectoryListing = () => {
  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading>Directory Listing</Heading>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          Your business's public profile in the Catholic Owned directory.
        </Text>
      </div>
      <div className="px-6 py-4">
        <Text size="small" className="text-ui-fg-subtle">
          Business details, description, owner interview, and parish
          affiliation are edited on the storefront. We&apos;ll take you there
          signed in.
        </Text>
        <Button
          className="mt-4"
          variant="secondary"
          onClick={editDirectoryListing}
        >
          Edit listing
        </Button>
      </div>
    </Container>
  )
}
