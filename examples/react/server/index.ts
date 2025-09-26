import { deleteCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import { jwt } from 'hono/jwt'
import { defineMockServerSchema, generateMockApi } from 'mock-dash'
import { zocker } from 'zocker'
import { apiSchema } from '@/api/schemas'
import { authApiMock } from '@/api/schemas/auth-schema'

const mockServerSchema = defineMockServerSchema(apiSchema, {
  ...authApiMock,
})

const { app } = generateMockApi(mockServerSchema, s => zocker(s).generate(), {
  addMiddleware: (app) => {
    app.onError((err, c) => {
      if (err instanceof HTTPException && err.status === 401) {
        deleteCookie(c, 'jwt')

        return err.getResponse()
      }

      return c.text('Internal Server Error', 500)
    })

    app.use('*', async (c, next) => {
      if (c.req.path.startsWith('/api/auth/') && !c.req.path.endsWith('me')) {
        await next()
        return
      }

      const jwtMiddelware = jwt({
        secret: 'mockJwtSecret',
        cookie: 'jwt',
      })

      return jwtMiddelware(c, next)
    })
  },
  base: '/api',
})

export default app
