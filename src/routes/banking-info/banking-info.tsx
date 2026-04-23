import { useState } from "react"
import {
  Container,
  Heading,
  Text,
  Input,
  Label,
  Button,
  Select,
  Badge,
  Checkbox,
  toast,
} from "@medusajs/ui"
import {
  useBankingInfo,
  useUpdateBankingInfo,
} from "../../hooks/api/banking-info"

export const BankingInfo = () => {
  const { data, isLoading } = useBankingInfo()
  const { mutateAsync, isPending } = useUpdateBankingInfo()

  const existing = data?.banking_info
  const currentTosVersion = data?.current_tos_version

  const tosAlreadyAccepted =
    !!existing?.tos_version &&
    existing?.tos_version === currentTosVersion &&
    !!existing?.tos_accepted_at

  const [accountHolderName, setAccountHolderName] = useState("")
  const [routingNumber, setRoutingNumber] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountType, setAccountType] = useState<"checking" | "savings">(
    "checking"
  )
  const [agreedToTos, setAgreedToTos] = useState(tosAlreadyAccepted)

  const onSubmit = async () => {
    try {
      await mutateAsync({
        account_holder_name: accountHolderName,
        routing_number: routingNumber,
        account_number: accountNumber,
        account_type: accountType,
        agreed_to_tos: agreedToTos,
      })
      toast.success("Banking information saved")
      setRoutingNumber("")
      setAccountNumber("")
    } catch (err: any) {
      toast.error(err?.message || "Failed to save banking information")
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-start justify-between px-6 py-4 gap-4">
        <div>
          <Heading>Banking Information</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Where Catholic Owned sends your payouts via ACH. The marketplace
            goes live at the end of June; until then, orders accrue in your
            Payouts tab and are paid out in batches after launch.
          </Text>
        </div>
        <div>
          {existing ? (
            <Badge color={existing.verified ? "green" : "orange"}>
              {existing.verified ? "Verified" : "On file"}
            </Badge>
          ) : (
            <Badge color="red">Not set up</Badge>
          )}
        </div>
      </div>

      {existing && (
        <div className="px-6 py-4 bg-ui-bg-subtle">
          <Text size="small" className="text-ui-fg-subtle">
            Current account on file:
          </Text>
          <Text weight="plus">
            {existing.account_holder_name} — {existing.account_type} ••••
            {existing.account_number_last4}
          </Text>
          <Text size="xsmall" className="text-ui-fg-subtle mt-1">
            Submitting the form below replaces this record.
          </Text>
        </div>
      )}

      <div className="px-6 py-4 flex flex-col gap-4 max-w-md">
        <div>
          <Label htmlFor="account_holder_name">Account holder name</Label>
          <Input
            id="account_holder_name"
            placeholder="As shown on your bank statement"
            value={accountHolderName}
            onChange={(e) => setAccountHolderName(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="account_type">Account type</Label>
          <Select
            value={accountType}
            onValueChange={(v) =>
              setAccountType(v as "checking" | "savings")
            }
          >
            <Select.Trigger id="account_type">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="checking">Checking</Select.Item>
              <Select.Item value="savings">Savings</Select.Item>
            </Select.Content>
          </Select>
        </div>

        <div>
          <Label htmlFor="routing_number">Routing number (9 digits)</Label>
          <Input
            id="routing_number"
            inputMode="numeric"
            placeholder="123456789"
            value={routingNumber}
            onChange={(e) =>
              setRoutingNumber(e.target.value.replace(/\D/g, "").slice(0, 9))
            }
          />
        </div>

        <div>
          <Label htmlFor="account_number">Account number</Label>
          <Input
            id="account_number"
            inputMode="numeric"
            placeholder="Account number"
            value={accountNumber}
            onChange={(e) =>
              setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 17))
            }
          />
          <Text size="xsmall" className="text-ui-fg-subtle mt-1">
            Stored encrypted. Only the last 4 digits are visible after
            saving.
          </Text>
        </div>

        <div className="flex items-start gap-2 pt-2">
          <Checkbox
            id="agreed_to_tos"
            checked={agreedToTos}
            onCheckedChange={(v) => setAgreedToTos(Boolean(v))}
          />
          <Label htmlFor="agreed_to_tos" className="text-sm">
            I agree to the{" "}
            <a
              href="/vendor-agreement.pdf"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Catholic Owned Vendor Agreement
            </a>
            , which governs listing, fulfillment, and payout terms.
          </Label>
        </div>

        <div className="pt-2">
          <Button
            disabled={
              isLoading ||
              isPending ||
              !accountHolderName ||
              routingNumber.length !== 9 ||
              accountNumber.length < 4 ||
              !agreedToTos
            }
            isLoading={isPending}
            onClick={onSubmit}
          >
            {existing ? "Update banking information" : "Save banking information"}
          </Button>
        </div>
      </div>
    </Container>
  )
}
