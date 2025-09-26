import type { AriaAttributes, FormEventHandler } from 'react'
import type { authApiSchema } from '@/api/schemas/auth-schema'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { isValidationError } from 'mock-dash'
import { useState } from 'react'
import z from 'zod'
import { apiClient } from '@/api/api-client'
import { CenterLayout } from '@/components/center-layout/center-layout'
import { ErrorParagraph } from '@/components/error-paragraph/error-paragraph'

export const Route = createFileRoute('/signin')({
  component: RouteComponent,
  validateSearch: z.object({
    redirect: z.string(),
  }),
})

type JSON = z.infer<
  (typeof authApiSchema)['@post/auth/sign-in/email']['input']['json']
>

function RouteComponent() {
  const navigate = useNavigate()
  const { redirect } = Route.useSearch()

  const [errors, setErrors] = useState<ReturnType<typeof z.treeifyError<JSON>>>({
    errors: [],
    properties: {},
  })

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (
    event,
  ) => {
    setErrors({ errors: [], properties: {} })

    event.preventDefault()
    const formData = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter)
    const data: JSON = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      rememberMe: formData.get('remember') !== undefined,
    }

    try {
      await apiClient('@post/auth/sign-in/email', { json: data })

      navigate({
        to: redirect,
      })
    }
    catch (error) {
      if (isValidationError(error)) {
        setErrors(z.treeifyError(error.validationErrors as z.ZodError<JSON>))
      }
      else {
        setErrors({
          errors: ['Could not signin'],
          properties: {},
        })
      }
    }
  }

  function addFieldErrors(key: keyof JSON) {
    const err = errors.properties?.[key]
    if (err) {
      return {
        'aria-invalid': 'true',
        'aria-describedby': `${key}-helper`,
      } satisfies AriaAttributes
    }

    return {}
  }

  return (
    <CenterLayout>
      <article>
        <header>Signin</header>
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              placeholder="Email"
              aria-label="Email"
              autoComplete="email"
              required
              type="text"
              name="email"
              {...addFieldErrors('email')}
            />
            {(errors.properties?.email?.errors ?? []).map(error => (
              <small id="email-helper">{error}</small>
            ))}

          </label>
          <label>
            Password
            <input
              placeholder="Password"
              aria-label="Password"
              autoComplete="current-password"
              required
              type="password"
              name="password"
              {...addFieldErrors('password')}

            />
            {(errors.properties?.password?.errors ?? []).map(error => (
              <small id="password-helper">{error}</small>
            ))}
          </label>
          <fieldset>
            <label htmlFor="remember">
              <input
                role="switch"
                id="remember"
                type="checkbox"
                name="remember"
              />
              Remember me
            </label
            >
          </fieldset>
          <button type="submit">Signin</button>

          {(errors.errors).map(error => (
            <ErrorParagraph>{error}</ErrorParagraph>
          ))}
          <small>
            Don't have an account?
            <Link to="/signup" search={{ redirect }}>signup</Link>
          </small>
        </form>
      </article>
    </CenterLayout>
  )
}
