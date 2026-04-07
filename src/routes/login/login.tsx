import { zodResolver } from "@hookform/resolvers/zod"
import { Alert, Hint, Input } from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import * as z from "zod"

import { Form } from "../../components/common/form"
import { useDashboardExtension } from "../../extensions"
import { useSignInWithEmailPass } from "../../hooks/api"
import { isFetchError } from "../../lib/is-fetch-error"

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export const Login = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const reason = searchParams.get("reason") || ""

  const { getWidgets } = useDashboardExtension()

  const from = "/dashboard"

  const form = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const { mutateAsync, isPending } = useSignInWithEmailPass()

  const handleSubmit = form.handleSubmit(async ({ email, password }) => {
    await mutateAsync(
      {
        email,
        password,
      },
      {
        onError: (error) => {
          if (isFetchError(error)) {
            if (error.status === 401) {
              form.setError("email", {
                type: "manual",
                message: error.message,
              })

              return
            }
          }

          form.setError("root.serverError", {
            type: "manual",
            message: error.message,
          })
        },
        onSuccess: () => {
          setTimeout(() => {
            navigate(from, { replace: true })
          }, 1000)
        },
      }
    )
  })

  const serverError =
    form.formState.errors?.root?.serverError?.message || reason
  const validationError =
    form.formState.errors.email?.message ||
    form.formState.errors.password?.message

  return (
    <div className="co-auth-page">
      <div className="co-auth-card">
        {/* Brand Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <img
            src="/Logo.png"
            alt="Catholic Owned"
            className="h-16 w-auto object-contain"
          />
          <p className="font-poppins text-xs font-medium uppercase tracking-[0.2em] text-co-gold-dark mt-2">
            Vendor Portal
          </p>
          <div className="co-gold-rule mt-4 w-16" />
        </div>

        {/* Welcome text */}
        <div className="mb-6 text-center">
          <h2 className="font-garamond text-xl font-medium text-co-text">
            {t("login.title")}
          </h2>
          <p className="font-poppins text-sm text-co-text-secondary mt-1">
            {t("login.hint")}
          </p>
        </div>

        <div className="flex w-full flex-col gap-y-3">
          {getWidgets("login.before").map((Component, i) => {
            return <Component key={i} />
          })}
          <Form {...form}>
            <form
              onSubmit={handleSubmit}
              className="flex w-full flex-col gap-y-5"
            >
              <div className="flex flex-col gap-y-3">
                <Form.Field
                  control={form.control}
                  name="email"
                  render={({ field }) => {
                    return (
                      <Form.Item>
                        <Form.Control>
                          <Input
                            autoComplete="email"
                            {...field}
                            className="co-input"
                            placeholder={t("fields.email")}
                          />
                        </Form.Control>
                      </Form.Item>
                    )
                  }}
                />
                <Form.Field
                  control={form.control}
                  name="password"
                  render={({ field }) => {
                    return (
                      <Form.Item>
                        <Form.Label>{}</Form.Label>
                        <Form.Control>
                          <Input
                            type="password"
                            autoComplete="current-password"
                            {...field}
                            className="co-input"
                            placeholder={t("fields.password")}
                          />
                        </Form.Control>
                      </Form.Item>
                    )
                  }}
                />
              </div>
              {validationError && (
                <div className="text-center">
                  <Hint className="inline-flex" variant={"error"}>
                    {validationError}
                  </Hint>
                </div>
              )}
              {serverError && (
                <Alert
                  className="items-center rounded-lg p-3"
                  dismissible
                  variant="error"
                >
                  {serverError}
                </Alert>
              )}
              <button
                className="co-btn-primary"
                type="submit"
                disabled={isPending}
              >
                {isPending ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </Form>
          {getWidgets("login.after").map((Component, i) => {
            return <Component key={i} />
          })}
        </div>

        <div className="co-gold-rule mt-6 mb-4" />

        <div className="flex flex-col items-center gap-2 text-center">
          <span className="font-poppins text-sm text-co-text-secondary">
            <Trans
              i18nKey="login.forgotPassword"
              components={[
                <Link
                  key="reset-password-link"
                  to="/reset-password"
                  className="font-medium text-co-navy transition-colors hover:text-co-gold-dark"
                />,
              ]}
            />
          </span>
          {__DISABLE_SELLERS_REGISTRATION__ === "false" && (
            <span className="font-poppins text-sm text-co-text-secondary">
              <Trans
                i18nKey="login.notSellerYet"
                components={[
                  <Link
                    to="/register"
                    className="font-medium text-co-navy transition-colors hover:text-co-gold-dark"
                  />,
                ]}
              />
            </span>
          )}
          {__STOREFRONT_URL__ && (
            <span className="font-poppins text-xs text-co-text-secondary mt-2">
              You can also access your vendor dashboard by logging in at{" "}
              <a
                href={__STOREFRONT_URL__}
                className="font-medium text-co-navy transition-colors hover:text-co-gold-dark"
              >
                the main site
              </a>
              .
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
