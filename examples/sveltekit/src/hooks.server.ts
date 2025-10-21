import { userModel } from '@examples/shared'
import type { Handle } from '@sveltejs/kit'
import { decode } from 'hono/jwt'

/** @type {import('@sveltejs/kit').Handle} */

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('jwt')

  if (token) {
    const userParseResult = userModel.safeParse(decode(token).payload)

    if (userParseResult.success)
      event.locals.user = { token, user: userParseResult.data }
  }

  if (!event.locals.user) {
    event.cookies.delete('token', { path: '/' })
  }

  const response = await resolve(event)
  return response
}
