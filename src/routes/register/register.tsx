import { zodResolver } from "@hookform/resolvers/zod"
import { Alert, Hint, Input } from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import * as z from "zod"

import { Form } from "../../components/common/form"
import { useSignUpWithEmailPass } from "../../hooks/api"
import { isFetchError } from "../../lib/is-fetch-error"
import { useState } from "react"

const RegisterSchema = z.object({
  name: z.string().min(2, { message: "Name should be a string" }),
  email: z.string().email({ message: "Invalid email" }),
  password: z.string().min(2, { message: "Password should be a string" }),
  confirmPassword: z.string().min(2, {
    message: "Confirm Password should be a string",
  }),
})

export const Register = () => {
  const [success, setSuccess] = useState(false)
  const { t } = useTranslation()

  const form = useForm<z.infer<typeof RegisterSchema>>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  const { mutateAsync, isPending } = useSignUpWithEmailPass()

  const handleSubmit = form.handleSubmit(
    async ({ name, email, password, confirmPassword }) => {
      if (password !== confirmPassword) {
        form.setError("password", {
          type: "manual",
          message: "Password and Confirm Password not matched",
        })
        form.setError("confirmPassword", {
          type: "manual",
          message: "Password and Confirm Password not matched",
        })

        return null
      }

      await mutateAsync(
        {
          name,
          email,
          password,
          confirmPassword,
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
            setSuccess(true)
          },
        }
      )
    }
  )

  const serverError = form.formState.errors?.root?.serverError?.message
  const validationError =
    form.formState.errors.email?.message ||
    form.formState.errors.password?.message ||
    form.formState.errors.name?.message ||
    form.formState.errors.confirmPassword?.message

  if (success)
    return (
      <div className="co-auth-page">
        <div className="co-auth-card text-center">
          {/* Success icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-co-success bg-co-success/10">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5 13l4 4L19 7"
                stroke="#3D7A4A"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <img
            src="/Logo.png"
            alt="Catholic Owned"
            className="h-14 w-auto object-contain"
          />
          <div className="co-gold-rule mx-auto mt-3 mb-4 w-16" />
          <p className="font-garamond mx-auto max-w-[320px] text-lg leading-relaxed text-co-text-secondary">
            Thank you for registering! Your account is pending admin
            authorization. You'll receive a confirmation email shortly.
          </p>

          <Link to="/login">
            <button className="co-btn-primary mt-8">Back to Sign In</button>
          </Link>
        </div>
      </div>
    )

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
          <p className="font-poppins mt-2 text-xs font-medium uppercase tracking-[0.2em] text-co-gold-dark">
            Vendor Portal
          </p>
          <div className="co-gold-rule mt-4 w-16" />
        </div>

        {/* Welcome text */}
        <div className="mb-6 text-center">
          <h2 className="font-garamond text-xl font-medium text-co-text">
            {t("register.title")}
          </h2>
          <p className="font-poppins mt-1 text-sm text-co-text-secondary">
            {t("register.hint")}
          </p>
        </div>

        <div className="flex w-full flex-col gap-y-3">
          <Form {...form}>
            <form
              onSubmit={handleSubmit}
              className="flex w-full flex-col gap-y-5"
            >
              <div className="flex flex-col gap-y-3">
                <Form.Field
                  control={form.control}
                  name="name"
                  render={({ field }) => {
                    return (
                      <Form.Item>
                        <Form.Control>
                          <Input
                            {...field}
                            className="co-input"
                            placeholder="Company name"
                          />
                        </Form.Control>
                      </Form.Item>
                    )
                  }}
                />
                <Form.Field
                  control={form.control}
                  name="email"
                  render={({ field }) => {
                    return (
                      <Form.Item>
                        <Form.Control>
                          <Input
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
                            {...field}
                            className="co-input"
                            placeholder={t("fields.password")}
                          />
                        </Form.Control>
                      </Form.Item>
                    )
                  }}
                />
                <Form.Field
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => {
                    return (
                      <Form.Item>
                        <Form.Label>{}</Form.Label>
                        <Form.Control>
                          <Input
                            type="password"
                            {...field}
                            className="co-input"
                            placeholder="Confirm Password"
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
                {isPending ? "Creating account..." : "Create Vendor Account"}
              </button>
            </form>
          </Form>
        </div>

        <div className="co-gold-rule mt-6 mb-4" />

        <div className="text-center">
          <span className="font-poppins text-sm text-co-text-secondary">
            <Trans
              i18nKey="register.alreadySeller"
              components={[
                <Link
                  to="/login"
                  className="font-medium text-co-navy transition-colors hover:text-co-gold-dark"
                />,
              ]}
            />
          </span>
        </div>
      </div>
    </div>
  )
}
