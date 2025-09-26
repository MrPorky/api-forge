import type { Context } from 'hono'
import type { Session } from '@/models/session'
import type { User } from '@/models/user'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { sign } from 'hono/jwt'
import { defineApiMock, defineApiSchema, MockError } from 'mock-dash'
import z from 'zod'
import { sessionModel } from '@/models/session'
import { userModel } from '@/models/user'

export const authApiSchema = defineApiSchema({
  '@post/auth/sign-up/email': {
    input: {
      json: z.object({
        name: z.string(), // required
        email: z.email(), // required
        password: z.string(), // required
        image: z.url().optional(), // optional
        callbackURL: z.string().optional(), // optional
      }),
    },
    response: z.object({
      token: z.string(),
      user: userModel,
    }),
  },
  '@post/auth/sign-in/email': {
    input: {
      json: z.object({
        email: z.email(), // required
        password: z.string(), // required
        rememberMe: z.boolean().optional(), // optional
        callbackURL: z.string().optional(), // optional
      }),
    },
    response: z.object({
      redirect: z.boolean(),
      token: z.string(),
      user: userModel,
    }),
  },
  '@post/auth/sign-out': {
    response: z.object({ success: z.boolean() }),
  },
  '@get/get-session': {
    response: sessionModel,
  },
})

export const authApiMock = defineApiMock(authApiSchema, {
  '@post/auth/sign-up/email': async ({ honoContext, inputs, mockContext }) => {
    const user = mockContext.get(`user.${inputs.json.email}`)

    if (user) {
      throw new MockError('Email already exists', 400)
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      email: inputs.json.email,
      name: inputs.json.name,
      image: inputs.json.image,
      createdAt: new Date().toISOString(),
      emailVerified: false,
      updatedAt: new Date().toISOString(),
    }

    mockContext.set(`user.${inputs.json.email}.pass`, inputs.json.password)
    mockContext.set(`user.${inputs.json.email}`, newUser)

    const jwt = await createNewSession(honoContext, mockContext, newUser)
    setCookie(honoContext, 'jwt', jwt)

    return {
      token: jwt,
      user: newUser,
    }
  },
  '@post/auth/sign-in/email': async ({ honoContext, inputs, mockContext }) => {
    const password = mockContext.get(`user.${inputs.json.email}.pass`)

    if (password === undefined || inputs.json.password === password) {
      throw new MockError('Incorrect password', 400)
    }

    const user = userModel.parse(mockContext.get(`user.${inputs.json.email}`))
    const jwt = await createNewSession(honoContext, mockContext, user)
    setCookie(honoContext, 'jwt', jwt)

    return {
      redirect: false,
      token: jwt,
      user,
    }
  },
  '@post/auth/sign-out': ({ honoContext, mockContext }) => {
    const userParseResult = userModel.safeParse(honoContext.get('jwtPayload'))
    const jwt = getCookie(honoContext, 'jwt')
    deleteCookie(honoContext, 'jwt')

    const user = userParseResult.data
    if (!user) {
      return { success: true }
    }

    const sessionParseResult = z.array(sessionModel.shape.session).safeParse(mockContext.get(`session.${user.id}`))
    const sessions = sessionParseResult.data
    if (!sessions) {
      return { success: true }
    }

    if (jwt) {
      mockContext.set(`session.${user.id}`, sessions.filter(s => jwt.includes(s.token)))
    }

    return { success: true }
  },
  '@get/get-session': ({ honoContext, mockContext }) => {
    const userParseResult = userModel.safeParse(honoContext.get('jwtPayload'))

    if (!userParseResult.success) {
      throw new MockError('Could not get session', 401)
    }

    const user = userParseResult.data
    const sessionParseResult = z.array(sessionModel.shape.session).safeParse(mockContext.get(`session.${user.id}`))

    if (!sessionParseResult.success) {
      throw new MockError('Could not get session', 401)
    }

    const session = sessionParseResult.data?.find(x => x.userId === user.id)

    if (!session) {
      throw new MockError('Could not get session', 401)
    }

    return {
      session,
      user,
    }
  },
})

async function createNewSession(honoContext: Context, mockContext: Map<string, unknown>, user: User) {
  const userAgent = honoContext.req.header('User-Agent') ?? ''

  const jwt = await sign(user, 'mockJwtSecret')
  const now = new Date()

  const parseResult = z.array(sessionModel.shape.session).safeParse(mockContext.get(`session.${user.id}`))

  const newSession: Session['session'] = {
    createdAt: now.toISOString(),
    expiersAt: (new Date(now.getDate() + 1)).toISOString(),
    id: crypto.randomUUID(),
    ipAddress: '127.0.0.1',
    token: jwt,
    updatedAt: now.toISOString(),
    userAgent,
    userId: user.id,
  }
  mockContext.set(`session.${user.id}`, [
    newSession,
    ...(parseResult.data ?? []),
  ])

  return jwt
}
