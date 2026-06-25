import { XMarkMini } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Badge, Button, Heading, IconButton, Select, Text } from "@medusajs/ui"
import { forwardRef, Fragment, useEffect } from "react"
import {
  ControllerRenderProps,
  useFieldArray,
  UseFormReturn,
  useWatch,
} from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Form } from "../../../../../../components/common/form"
import {
  usePromotionRuleAttributes,
  usePromotionRules,
} from "../../../../../../hooks/api/promotions"
import { CreatePromotionSchemaType } from "../../../../promotion-create/components/create-promotion-form/form-schema"
import { generateRuleAttributes } from "../edit-rules-form/utils"
import { RuleValueFormField } from "../rule-value-form-field"
import { requiredProductRule } from "./constants"

type RulesFormFieldType = {
  promotion?: HttpTypes.AdminPromotion
  form: UseFormReturn<CreatePromotionSchemaType>
  ruleType: "rules" | "target-rules" | "buy-rules"
  setRulesToRemove?: any
  rulesToRemove?: any
  scope?:
    | "application_method.buy_rules"
    | "rules"
    | "application_method.target_rules"
}

export const RulesFormField = ({
  form,
  ruleType,
  setRulesToRemove,
  rulesToRemove,
  scope = "rules",
  promotion,
}: RulesFormFieldType) => {
  const { t } = useTranslation()
  const formData = form.getValues()
  const { attributes } = usePromotionRuleAttributes(ruleType, formData.type)

  const { fields, append, remove, update, replace } = useFieldArray({
    control: form.control,
    name: scope,
    keyName: scope,
  })

  // Each rule section exposes exactly one selectable attribute — Customer Group
  // for eligibility conditions ("rules"), Product for the "applies to" target/
  // buy rules (the customer_group/product filter below removes everything else).
  // Since there's only ever one choice, we auto-select it and render it as a
  // fixed label rather than making merchants pick it from a single-item
  // dropdown (the "select attribute" step that confused them).
  const selectableAttributes = (attributes || []).filter(
    ({ id }) => id === "customer_group" || id === "product"
  )
  const usedAttributeValues = fields?.map((f: any) => f.attribute) || []
  const nextAttribute = selectableAttributes.find(
    (attr) => !usedAttributeValues.includes(attr.value)
  )

  const promotionType = useWatch({
    control: form.control,
    name: "type",
    defaultValue: promotion?.type,
  })

  const applicationMethodType = useWatch({
    control: form.control,
    name: "application_method.type",
    defaultValue: promotion?.application_method?.type,
  })

  const query: Record<string, string> = promotionType
    ? {
        promotion_type: promotionType,
        application_method_type: applicationMethodType,
      }
    : {}

  const { rules, isLoading } = usePromotionRules(
    promotion?.id!,
    ruleType,
    query,
    {
      enabled: !!promotion?.id || (!!promotionType && !!applicationMethodType),
    }
  )

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (ruleType === "rules" && !fields.length) {
      form.resetField("rules")

      const formRules = generateRuleAttributes(rules)
      replace(formRules)
    }

    if (ruleType === "buy-rules" && !fields.length) {
      form.resetField("application_method.buy_rules")
      const apiRules =
        promotion?.id || promotionType === "standard"
          ? rules || []
          : [...(rules || []), requiredProductRule]

      const formRules = generateRuleAttributes(apiRules)
      replace(formRules)
    }

    if (ruleType === "target-rules" && !fields.length) {
      form.resetField("application_method.target_rules")
      const apiRules =
        promotion?.id || promotionType === "standard"
          ? rules || []
          : [...(rules || []), requiredProductRule]

      const formRules = generateRuleAttributes(apiRules)
      replace(formRules)
    }
  }, [
    promotionType,
    isLoading,
    ruleType,
    fields.length,
    form,
    replace,
    rules,
    promotion?.id,
  ])

  return (
    <div className="flex flex-col">
      <Heading level="h2" className="mb-2">
        {t(`promotions.fields.conditions.${ruleType}.title`)}
      </Heading>

      <Text className="text-ui-fg-subtle txt-small mb-6">
        {t(`promotions.fields.conditions.${ruleType}.description`)}
      </Text>

      {fields.map((fieldRule: any, index) => {
        const identifier = fieldRule.id

        return (
          <Fragment key={`${fieldRule.id}.${index}.${fieldRule.attribute}`}>
            <div className="bg-ui-bg-subtle border-ui-border-base flex flex-row gap-2 rounded-xl border px-2 py-2">
              <div className="grow">
                <Form.Field
                  name={`${scope}.${index}.attribute`}
                  render={({ field }) => {
                    const { onChange, ref, ...fieldProps } = field

                    const existingAttributes =
                      fields?.map((field: any) => field.attribute) || []
                    // "country" is intentionally excluded: this is a
                    // US-only marketplace, so country eligibility is
                    // meaningless, and the value list was effectively broken
                    // (the options endpoint returns only the first 100
                    // countries by ISO code with no search, so "United
                    // States" never appeared). Limiting promos by shopper
                    // country isn't supported here.
                    const attributeOptions =
                      attributes
                        ?.filter(
                          ({ id }) =>
                            id === "customer_group" || id === "product"
                        )
                        ?.filter((attr) => {
                          if (attr.value === fieldRule.attribute) {
                            return true
                          }

                          return !existingAttributes.includes(attr.value)
                        }) || []

                    // With only one possible attribute per section, show it as
                    // a fixed label (skipping the redundant dropdown) just like
                    // a required rule.
                    const disabled =
                      !!fieldRule.required || attributeOptions.length === 1
                    const onValueChange = (e: string) => {
                      const currentAttributeOption = attributeOptions.find(
                        (ao) => ao.id === e
                      )

                      update(index, {
                        ...fieldRule,
                        // Operator is fixed to "in" — we no longer expose the
                        // In/Equals/Not In choice to merchants.
                        operator: "in",
                        values: [],
                        disguised: currentAttributeOption?.disguised || false,
                      })
                      onChange(e)
                    }

                    return (
                      <Form.Item className="mb-2">
                        {fieldRule.required && (
                          <div className="flex items-center px-2">
                            <p className="text text-ui-fg-muted txt-small">
                              {t("promotions.form.required")}
                            </p>
                          </div>
                        )}

                        <Form.Control>
                          {!disabled ? (
                            <Select
                              {...fieldProps}
                              onValueChange={onValueChange}
                              disabled={fieldRule.required}
                            >
                              <Select.Trigger
                                ref={ref}
                                className="bg-ui-bg-base"
                              >
                                <Select.Value
                                  placeholder={t(
                                    "promotions.form.selectAttribute"
                                  )}
                                />
                              </Select.Trigger>

                              <Select.Content>
                                {attributeOptions?.map((c, i) => (
                                  <Select.Item
                                    key={`${identifier}-attribute-option-${i}`}
                                    value={c.value}
                                  >
                                    <span className="text-ui-fg-subtle">
                                      {c.label}
                                    </span>
                                  </Select.Item>
                                ))}
                              </Select.Content>
                            </Select>
                          ) : (
                            <DisabledField
                              label={
                                attributeOptions?.find(
                                  (ao) => ao.value === fieldRule.attribute
                                )?.label || ""
                              }
                              field={field}
                            />
                          )}
                        </Form.Control>
                        <Form.ErrorMessage />
                      </Form.Item>
                    )
                  }}
                />

                {/* The operator is fixed to "in" (set on add + on attribute
                    select), so we don't render the In/Equals/Not In dropdown.
                    It confused merchants — "In" and "Equals" behave the same
                    for a single value, and "Not In" silently inverts the
                    condition. The merchant just selects which values apply. */}
                <RuleValueFormField
                  form={form}
                  identifier={identifier}
                  scope={scope}
                  name={`${scope}.${index}.values`}
                  operator={`${scope}.${index}.operator`}
                  fieldRule={fieldRule}
                  attributes={attributes || []}
                  ruleType={ruleType}
                />
              </div>

              <div className="size-7 flex-none self-center">
                {!fieldRule.required && (
                  <IconButton
                    size="small"
                    variant="transparent"
                    className="text-ui-fg-muted"
                    type="button"
                    onClick={() => {
                      if (!fieldRule.required) {
                        setRulesToRemove &&
                          setRulesToRemove([...rulesToRemove, fieldRule])

                        remove(index)
                      }
                    }}
                  >
                    <XMarkMini />
                  </IconButton>
                )}
              </div>
            </div>

            {index < fields.length - 1 && (
              <div className="relative px-6 py-3">
                <div className="border-ui-border-strong absolute bottom-0 left-[40px] top-0 z-[-1] w-px bg-[linear-gradient(var(--border-strong)_33%,rgba(255,255,255,0)_0%)] bg-[length:1px_3px] bg-repeat-y"></div>

                <Badge size="2xsmall" className=" text-xs">
                  {t("promotions.form.and")}
                </Badge>
              </div>
            )}
          </Fragment>
        )
      })}

      <div className={fields.length ? "mt-6" : ""}>
        {/* Only show "Add" while there is still an unused attribute to add.
            Each section has a single attribute (Customer Group / Product), so
            once one row exists there is nothing more to add. */}
        {nextAttribute && (
          <Button
            type="button"
            variant="secondary"
            className="inline-block"
            onClick={() => {
              append({
                // Auto-select the lone attribute for this section so merchants
                // skip the single-item "select attribute" dropdown.
                attribute: nextAttribute.value,
                // Operator is fixed to "in"; the dropdown is no longer shown.
                operator: "in",
                values: [],
                required: false,
                disguised: nextAttribute.disguised || false,
              } as any)
            }}
          >
            {t("promotions.fields.addCondition")}
          </Button>
        )}

        {!!fields.length && (
          <Button
            type="button"
            variant="transparent"
            className="text-ui-fg-muted hover:text-ui-fg-subtle ml-2 inline-block"
            onClick={() => {
              const indicesToRemove = fields
                .map((field: any, index) => (field.required ? null : index))
                .filter((f) => f !== null)

              setRulesToRemove &&
                setRulesToRemove(fields.filter((field: any) => !field.required))
              remove(indicesToRemove)
            }}
          >
            {t("promotions.fields.clearAll")}
          </Button>
        )}
      </div>
    </div>
  )
}

type DisabledAttributeProps = {
  label: string
  field:
    | ControllerRenderProps<
        CreatePromotionSchemaType,
        `rules.${number}.attribute`
      >
    | ControllerRenderProps<
        CreatePromotionSchemaType,
        `rules.${number}.operator`
      >
    | ControllerRenderProps<
        CreatePromotionSchemaType,
        `application_method.buy_rules.${number}.attribute`
      >
    | ControllerRenderProps<
        CreatePromotionSchemaType,
        `application_method.buy_rules.${number}.operator`
      >
    | ControllerRenderProps<
        CreatePromotionSchemaType,
        `application_method.target_rules.${number}.attribute`
      >
    | ControllerRenderProps<
        CreatePromotionSchemaType,
        `application_method.target_rules.${number}.operator`
      >
}

/**
 * Render this if an attribute is disabled, or
 * if there is only one option available.
 */
const DisabledField = forwardRef<HTMLInputElement, DisabledAttributeProps>(
  ({ label, field }, ref) => {
    return (
      <div>
        <div className="txt-compact-small bg-ui-bg-component shadow-borders-base text-ui-fg-base h-8 rounded-md px-2 py-1.5">
          {label}
        </div>
        <input {...field} ref={ref} disabled hidden />
      </div>
    )
  }
)

DisabledField.displayName = "DisabledField"
