import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import z from 'zod'
import { type HttpEndpoint, isRestEndpoint } from '../schema/http-endpoint'
import type { HttpInput } from '../schema/http-input'
import { buildEndpointPath } from '../utils/buildEndpointPath'
import { MockError } from '../utils/errors'

type FakeFn = <T extends z.ZodType>(schema: T) => z.infer<T>

interface MockGenerationOptions {
  readonly base?: string
  readonly addMiddleware?: (app: Hono) => void
}

// interface MockContext extends Map<string, unknown> {
//   set: <T>(key: string, value: T) => this
//   get: <T = unknown>(key: string) => T | undefined
// }

export function createMockServer<T extends Record<string, unknown>>(
  apiSchema: T,
  fake: FakeFn,
  options: MockGenerationOptions = {},
) {
  const mockContext = new Map<string, unknown>()
  const app = new Hono().basePath(options.base ?? '')

  options.addMiddleware?.(app)

  function processEndpoint(
    endpoint: HttpEndpoint,
    // mock?: IMock<HttpMethodPath, z.ZodType | ZodArray<z.ZodType>, any>,
  ) {
    const path = buildEndpointPath(endpoint.path, endpoint.options.prefix)

    const inputValidators = endpoint.input
      ? Object.entries(endpoint.input).map(([target, zodType]) =>
          zValidator(
            target as keyof HttpInput,
            zodType instanceof z.ZodType ? zodType : z.object(zodType),
          ),
        )
      : []

    app[endpoint.method](path, ...inputValidators, async (c) => {
      //   const inputs = {
      //     query: c.req.query(),
      //     json: await c.req.json().catch(() => ({})),
      //     form: await c.req.parseBody().catch(() => ({})),
      //     param: c.req.param(),
      //   }

      let mockData: unknown
      const customFaker = false // mock?.mockFn

      try {
        if (!customFaker) {
          mockData = fake(endpoint.response)
        }
        // else {
        //   const fakerContext = {
        //     mockContext,
        //     inputs,
        //     honoContext: c,
        //   } satisfies EndpointInputContext<HttpMethodPath, any>

        //   if (typeof customFaker === 'function') {
        //     mockData = await Promise.resolve(customFaker(fakerContext))
        //   } else {
        //     const { length, min, max, faker: itemFaker } = customFaker

        //     if (length !== undefined) {
        //       mockData = await Promise.all(
        //         Array.from(
        //           { length },
        //           async (_, i) =>
        //             await Promise.resolve(itemFaker(fakerContext, i)),
        //         ),
        //       )
        //     } else if (min !== undefined || max !== undefined) {
        //       const actualMin = min ?? 0
        //       const actualMax = max ?? actualMin + 10
        //       const randomLength =
        //         Math.floor(Math.random() * (actualMax - actualMin + 1)) +
        //         actualMin
        //       mockData = await Promise.all(
        //         Array.from(
        //           { length: randomLength },
        //           async (_, i) =>
        //             await Promise.resolve(itemFaker(fakerContext, i)),
        //         ),
        //       )
        //     }
        //   }
        // }
      } catch (error) {
        if (error instanceof MockError) {
          return c.json({ message: error.message }, error.status)
        }

        console.error('Mock generation error:', error)
        throw error
      }

      if (mockData instanceof Response) {
        return mockData
      } else {
        if (
          endpoint.response instanceof z.ZodString ||
          endpoint.response instanceof z.ZodStringFormat
        ) {
          if (typeof mockData !== 'string') {
            return c.json({ message: 'a string is expected' }, 400)
          }

          return c.text(mockData)
        } else if (endpoint.response instanceof z.ZodVoid) {
          return c.body(null)
        }

        return c.json(mockData)
      }
    })
  }

  for (const apiDefinition of Object.values(apiSchema)) {
    //   if (apiDefinition instanceof Collection) {
    //     apiDefinition.initialize(fake)
    //     continue
    //   }

    // Handle individual Endpoint instances
    if (isRestEndpoint(apiDefinition)) {
      processEndpoint(apiDefinition)
    }
  }

  return { app, mockContext }
}
