import {
  CreatePromotionRuleDTO,
  HttpTypes,
  PromotionRuleDTO,
  PromotionRuleOperatorValues,
} from "@medusajs/types"
import { useRouteModal } from "../../../../../../components/modals"
import {
  usePromotionAddRules,
  usePromotionRemoveRules,
  usePromotionUpdateRules,
  useUpdatePromotion,
} from "../../../../../../hooks/api/promotions"
import { ExtendedPromotionRule } from "../../../../../../types/promotion"
import { RuleTypeValues } from "../../edit-rules"
import { EditRulesForm } from "../edit-rules-form"
import { getRuleValue } from "./utils"

type EditPromotionFormProps = {
  promotion: HttpTypes.AdminPromotion
  rules: PromotionRuleDTO[]
  ruleType: RuleTypeValues
}

export const EditRulesWrapper = ({
  promotion,
  rules,
  ruleType,
}: EditPromotionFormProps) => {
  const { handleSuccess } = useRouteModal()
  const { mutateAsync: updatePromotion } = useUpdatePromotion(promotion.id)
  const { mutateAsync: addPromotionRules } = usePromotionAddRules(
    promotion.id,
    ruleType
  )

  const { mutateAsync: removePromotionRules } = usePromotionRemoveRules(
    promotion.id,
    ruleType
  )

  const { mutateAsync: updatePromotionRules, isPending } =
    usePromotionUpdateRules(promotion.id, ruleType)

  const handleSubmit = (
    rulesToRemove?: { id: string; disguised?: boolean; attribute: string }[]
  ) => {
    return async function (data: { rules: ExtendedPromotionRule[] }) {
      const applicationMethodData: Record<string, string | number | null> = {}
      const { rules: allRules = [] } = data
      const disguisedRules = allRules.filter((rule) => rule.disguised)
      const disguisedRulesToRemove =
        rulesToRemove?.filter((r) => r.disguised) || []

      // For all the rules that were disguised, convert them to actual values in the
      // database, they are currently all under application_method. If more of these are coming
      // up, abstract this away.
      for (const rule of disguisedRules) {
        const ruleValue = getRuleValue(rule)
        applicationMethodData[rule.attribute!] = Array.isArray(ruleValue)
          ? ruleValue[0]?.value || null
          : ruleValue
      }

      for (const rule of disguisedRulesToRemove) {
        applicationMethodData[rule.attribute] = null
      }

      const rulesData = allRules.filter((rule) => !rule.disguised)

      const isEmptyRuleValue = (value: any) =>
        value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0)

      const rulesToCreate: CreatePromotionRuleDTO[] = []
      const rulesToUpdate: ExtendedPromotionRule[] = []
      // Existing rules whose values were cleared (e.g. an optional Customer
      // Group condition emptied out) are removed rather than saved empty.
      const emptiedRuleIds: string[] = []

      for (const rule of rulesData) {
        const isEmpty = !rule.required && isEmptyRuleValue(rule.values)

        if ("id" in rule && typeof rule.id === "string") {
          if (isEmpty) {
            emptiedRuleIds.push(rule.id)
          } else {
            rulesToUpdate.push(rule)
          }
        } else if (!isEmpty) {
          rulesToCreate.push({
            attribute: rule.attribute!,
            operator: rule.operator!,
            values: rule.values as unknown as string | string[],
          })
        }
      }

      const idsToRemove = [
        ...((rulesToRemove?.map((r) => r.id).filter(Boolean) as string[]) ||
          []),
        ...emptiedRuleIds,
      ]

      if (Object.keys(applicationMethodData).length) {
        await updatePromotion({
          application_method: applicationMethodData,
        } as any)
      }

      if (rulesToCreate.length) {
        await addPromotionRules({
          rules: rulesToCreate,
        })
      }

      if (idsToRemove.length) {
        await removePromotionRules({
          rules: idsToRemove,
        } as any)
      }

      if (rulesToUpdate.length) {
        await updatePromotionRules({
          rules: rulesToUpdate.map((rule) => ({
            id: rule.id,
            attribute: rule.attribute,
            operator: rule.operator as PromotionRuleOperatorValues,
            values: rule.values as unknown as string | string[],
          })),
        })
      }

      handleSuccess()
    }
  }

  return (
    <EditRulesForm
      promotion={promotion}
      rules={rules}
      ruleType={ruleType}
      handleSubmit={handleSubmit}
      isSubmitting={isPending}
    />
  )
}
