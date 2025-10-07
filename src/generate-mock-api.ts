import type { ValidationTargets } from 'hono'
import type z from 'zod'
import type { ApiSchema, EndpointMap } from './api-schema-types'
import type { FakerMap } from './mock-types'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { apiSchemaToEndpointMap, httpMethodSchema, isEndpoint } from './api-schema-types'
import { MockError } from './errors'

export type FakeFn = <T extends z.ZodType>(schema: T) => T['_zod']['output']

export interface MockGenerationOptions {
  readonly base?: string
  readonly addMiddleware?: (app: Hono) => void
}

export interface MockContext extends Map<string, unknown> {
  set: <T>(key: string, value: T) => this
  get: <T = unknown>(key: string) => T | undefined
}

/**
 * Generates a fully functional Hono-based mock API server from an API schema with automatic
 * data generation, request validation, and middleware support. The mock server provides
 * realistic endpoints for frontend development and testing without requiring a real backend.
 *
 * @template T - The API schema type extending ApiSchema
 *
 * @param apiSchema - The API schema defining endpoints, validation, and mock data generators
 * @param fake - Function to generate fake data from Zod schemas (e.g., from zocker or @anatine/zod-mock)
 * @param options - Configuration options for the mock server
 * @param options.base - Base path for all routes (e.g., '/api/v1')
 * @param options.addMiddleware - Function to add custom Hono middleware to the server
 *
 * @returns Object containing the configured Hono app and shared mock context with properties:
 *   - app: The Hono application ready to be served
 *   - mockContext: Shared state Map for stateful mocks across requests
 *
 * @throws {Error} When invalid HTTP methods are used in endpoint keys
 * @throws {MockError} When custom mock functions throw MockError for specific scenarios
 *
 * @example
 * ```typescript
 * import { z } from 'zod'
 * import { Hono } from 'hono'
 * import { cors } from 'hono/cors'
 * import { logger } from 'hono/logger'
 * import { generateMockApi, defineMockServerSchema } from 'mock-dash'
 * import { generateMock } from '@anatine/zod-mock'
 *
 * const apiSchema = defineMockServerSchema({
 *   '@get/users/:id': {
 *     input: {
 *       param: z.object({ id: z.string() }),
 *       query: z.object({ include: z.string().optional() })
 *     },
 *     response: z.object({
 *       id: z.string(),
 *       name: z.string(),
 *       email: z.string().email()
 *     })
 *   },
 *   '@post/users': {
 *     input: {
 *       json: z.object({
 *         name: z.string().min(1),
 *         email: z.string().email()
 *       })
 *     },
 *     response: z.object({
 *       id: z.string(),
 *       name: z.string(),
 *       email: z.string()
 *     })
 *   }
 * }, {
 *   '@get/users/:id': ({ inputs, mockContext }) => {
 *     // Custom mock with stateful behavior
 *     const users = mockContext.get('users') || []
 *     return users.find(u => u.id === inputs.param.id) || {
 *       id: inputs.param.id,
 *       name: 'John Doe',
 *       email: 'john@example.com'
 *     }
 *   }
 * })
 *
 * const { app, mockContext } = generateMockApi(apiSchema, generateMock, {
 *   base: '/api/v1',
 *   addMiddleware: (app) => {
 *     // Add CORS support
 *     app.use('*', cors({
 *       origin: ['http://localhost:3000', 'http://localhost:5173'],
 *       credentials: true
 *     }))
 *
 *     // Add request logging
 *     app.use('*', logger())
 *
 *     // Add authentication middleware
 *     app.use('/api/v1/protected/*', async (c, next) => {
 *       const auth = c.req.header('Authorization')
 *       if (!auth || !auth.startsWith('Bearer ')) {
 *         return c.json({ message: 'Unauthorized' }, 401)
 *       }
 *       await next()
 *     })
 *   }
 * })
 *
 * // Initialize shared state
 * mockContext.set('users', [
 *   { id: '1', name: 'Alice', email: 'alice@example.com' },
 *   { id: '2', name: 'Bob', email: 'bob@example.com' }
 * ])
 *
 * // Start the server
 * export default app
 *
 * // Or with Node.js
 * import { serve } from '@hono/node-server'
 * serve({ fetch: app.fetch, port: 3001 })
 * ```
 */
export function generateMockApi<T extends ApiSchema>(apiSchema: T, fake: FakeFn, options: MockGenerationOptions = {}) {
  const mockContext = new Map<string, unknown>()
  const app = new Hono().basePath(options.base ?? '')

  options.addMiddleware?.(app)
  const endpointMap = apiSchemaToEndpointMap(apiSchema)

  for (const [key, endpoint] of Object.entries(endpointMap)) {
    if (!endpoint)
      return

    if (!isEndpoint(endpoint))
      return

    if (key.startsWith('@')) {
      const parts = key.split('/')
      const httpMethodPart = parts[0].replace('@', '')
      const methodResult = httpMethodSchema.safeParse(httpMethodPart)
      if (!methodResult.success) {
        throw new Error(`${httpMethodPart} is not a valid HTTP method.`)
      }
      const method = methodResult.data
      const path = `/${parts.slice(1).join('/')}`

      const inputvalidators = endpoint.input
        ? Object.entries(endpoint.input)
            .map(([target, zodType]) =>
              zValidator(target as keyof ValidationTargets, zodType))
        : []

      app[method](path, ...inputvalidators, async (c) => {
        const inputs: ValidationTargets = {
          cookie: {},
          header: c.req.header(),
          query: c.req.query(),
          json: await c.req.json().catch(() => ({})),
          form: await c.req.parseBody().catch(() => ({})),
          param: c.req.param(),
        }

        let mockData = fake(endpoint.response)
        const customFaker = endpoint.faker

        try {
          if (customFaker) {
            const fakerContext = {
              mockContext,
              inputs,
              honoContext: c,
            }

            if (typeof customFaker === 'function') {
              const fakerData = await Promise.resolve(customFaker(fakerContext))

              if (Array.isArray(mockData) && Array.isArray(fakerData)) {
                mockData = [...(mockData as unknown[]), ...(fakerData as unknown[])]
              }
              else if (mockData && typeof mockData === 'object' && fakerData && typeof fakerData === 'object') {
                mockData = { ...(mockData as object), ...(fakerData as object) }
              }
              else {
                mockData = fakerData
              }
            }
            else {
              const { length, min, max, faker: itemFaker } = customFaker

              let fakerData: unknown[] = []

              if (length !== undefined) {
                fakerData = await Promise.all(
                  Array.from({ length }, async (_, i) => await Promise.resolve(itemFaker(fakerContext, i))),
                )
              }
              else if (min !== undefined || max !== undefined) {
                const actualMin = min ?? 0
                const actualMax = max ?? actualMin + 10
                const randomLength = Math.floor(Math.random() * (actualMax - actualMin + 1)) + actualMin
                fakerData = await Promise.all(
                  Array.from({ length: randomLength }, async (_, i) => await Promise.resolve(itemFaker(fakerContext, i))),
                )
              }

              mockData = fakerData
            }
          }
        }
        catch (error) {
          if (error instanceof MockError) {
            return c.json({ message: error.message }, error.status)
          }

          console.error('Mock generation error:', error)
          throw error
        }

        return c.json(mockData as Record<string, unknown>)
      })
    }
  }

  return { app, mockContext }
}

/**
 * Defines custom mock data generators for an existing API schema without modifying the original schema.
 * This function is useful when you want to create different mock configurations for the same API schema,
 * such as different test scenarios or development environments.
 *
 * @template T - The API schema type extending ApiSchema
 * @template F - The faker configuration type extending Faker<T>
 *
 * @param _schema - The API schema (used for type inference only)
 * @param overrideFaker - Custom faker functions for generating mock data for specific endpoints
 *
 * @returns The faker configuration that can be used with defineMockServerSchema
 *
 * @example
 * ```typescript
 * import { z } from 'zod'
 * import { defineApiSchema, defineApiMock, defineMockServerSchema } from 'mock-dash'
 *
 * const apiSchema = defineApiSchema({
 *   '@get/users/:id': {
 *     input: { param: z.object({ id: z.string() }) },
 *     response: z.object({ id: z.string(), name: z.string(), role: z.string() })
 *   }
 * })
 *
 * // Define different mock scenarios
 * const adminMocks = defineApiMock(apiSchema, {
 *   '@get/users/:id': () => ({
 *     id: '1',
 *     name: 'Admin User',
 *     role: 'admin'
 *   })
 * })
 *
 * const regularUserMocks = defineApiMock(apiSchema, {
 *   '@get/users/:id': () => ({
 *     id: '2',
 *     name: 'Regular User',
 *     role: 'user'
 *   })
 * })
 *
 * // Use with different configurations
 * const adminMockSchema = defineMockServerSchema(apiSchema, adminMocks)
 * const userMockSchema = defineMockServerSchema(apiSchema, regularUserMocks)
 * ```
 */
export function defineApiMock<T extends EndpointMap>(_schema: T, overrideFaker: FakerMap<T>) {
  return overrideFaker
}
