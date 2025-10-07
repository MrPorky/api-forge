import type { AriaAttributes, FormEventHandler } from 'react'
import type { authApiSchema } from '@/api/schemas/auth-schema'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { isValidationError } from 'mock-dash'
import { useState } from 'react'
import z from 'zod'
import { apiClient } from '@/api/api-client'
import { CenterLayout } from '@/components/center-layout/center-layout'
import { ErrorParagraph } from '@/components/error-paragraph/error-paragraph'

export const Route = createFileRoute('/signup')({
  component: RouteComponent,
  validateSearch: z.object({
    redirect: z.string(),
  }),
})

type JSON = typeof authApiSchema.$inferInputJson['@post/auth/sign-up/email']

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
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    }

    try {
      await apiClient('@post/auth/sign-up/email', { json: data })

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
          errors: ['Could not signup'],
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
        <header>Signup</header>
        <form onSubmit={handleSubmit}>
          <label>
            Name
            <input
              placeholder="Name"
              aria-label="Name"
              autoComplete="name"
              required
              type="text"
              name="name"
              {...addFieldErrors('name')}
            />
            {(errors.properties?.name?.errors ?? []).map(error => (
              <small id="name-helper">{error}</small>
            ))}

          </label>
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
          <button type="submit">Signin</button>

          {(errors.errors).map(error => (
            <ErrorParagraph>{error}</ErrorParagraph>
          ))}
          <small>
            Already have an account?
            <Link to="/signin" search={{ redirect }}>signin</Link>
          </small>
        </form>
      </article>
    </CenterLayout>
  )
}
