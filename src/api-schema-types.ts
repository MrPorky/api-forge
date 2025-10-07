import type { ValidationTargets } from 'hono'
import type { ApiResponseGenerator, FakerMap } from './mock-types'
import type { RemoveNever } from './type-utils'
import z from 'zod'

export const httpMethodSchema = z.enum(['get', 'post', 'patch', 'put', 'delete'])
export type HttpMethod = z.infer<typeof httpMethodSchema>

type ZodParsedFormValue = z.ZodString | z.ZodFile
type ZodFormValue = ZodParsedFormValue | z.ZodOptional<ZodParsedFormValue>

export interface Endpoint<T extends z.ZodType = z.ZodType | z.ZodArray<z.ZodType>> {
  input?: {
    [K in keyof ValidationTargets]?: ValidationTargets[K] extends Record<infer Keys, unknown>
      ? K extends 'form'
        ? z.ZodObject<Record<string, ZodFormValue | z.ZodArray<ZodFormValue>>>
        : z.ZodObject<Record<Keys & string, z.ZodType>>
      : z.ZodType
  }
  response: T
}

type ApiMethodRoute = `@${HttpMethod}/${string}`

export type EndpointMap = Record<ApiMethodRoute, Endpoint>
export type ApiSchema = Record<string, EndpointMap | FakerMap<EndpointMap>>

type UrlParamRecordWithKey<T extends string, K extends string>
  = T extends `${string}:${infer P}`
    ? P extends `${infer PARAM}/${infer TR}`
      ? UrlParamRecordWithKey<TR, K | PARAM>
      : Record<K | P, string>
    : Record<K, string>

type PathParamToObject<T extends string>
  = T extends `${string}:${infer P}`
    ? P extends `${infer PARAM}/${infer TR}`
      ? UrlParamRecordWithKey<TR, PARAM>
      : Record<P, string>
    : never

type ValidKeys<T extends Endpoint['input']> = {
  [K in keyof T]: T[K] extends z.ZodType ? K : never
}[keyof T]

type Inputs<T extends Endpoint['input']> = T extends undefined ? object : {
  [key in ValidKeys<T>]: key extends keyof T ? z.infer<T[key]> : never
}

export type InputsWithParam<T extends Endpoint['input'], K extends string>
  = RemoveNever<{ param: PathParamToObject<K> } & Inputs<T>>

/**
 * Defines a mock server schema by combining an API schema with custom mock data generators.
 * This function merges the base API schema with custom faker functions to create a complete
 * mock server configuration that can generate realistic test data.
 *
 * @template T - The API schema type extending ApiSchema
 * @template F - The faker configuration type extending Faker<T>
 *
 * @param schema - The base API schema defining endpoints, validation, and response types
 * @param overrideFaker - Custom faker functions to override default data generation for specific endpoints
 *
 * @returns A complete mock server schema with faker functions attached to each endpoint
 *
 * @example
 * ```typescript
 * import { z } from 'zod'
 * import { defineApiSchema, defineMockServerSchema } from 'mock-dash'
 *
 * const apiSchema = defineApiSchema({
 *   '@get/users/:id': {
 *     input: {
 *       param: z.object({ id: z.string() })
 *     },
 *     response: z.object({
 *       id: z.string(),
 *       name: z.string(),
 *       email: z.string().email()
 *     })
 *   }
 * })
 *
 * const mockSchema = defineMockServerSchema(apiSchema, {
 *   '@get/users/:id': ({ inputs }) => ({
 *     id: inputs.param.id,
 *     name: 'John Doe',
 *     email: 'john@example.com'
 *   })
 * })
 * ```
 */
// export function defineMockServerSchema<T extends ApiSchema, F extends Faker<T>>(schema: T, overrideFaker: F = {} as F) {
//   return Object.entries(schema).reduce((acc, [key, endpoint]) => {
//     const faker = overrideFaker[key as keyof F]
//     // @ts-expect-error TypeScript can't infer the type here, but we know it's correct
//     acc[key] = {
//       ...endpoint,
//       faker: faker || endpoint.faker,
//     }
//     return acc
//   }, {} as { [K in keyof T]: F[K] extends object ? T[K] & { faker?: F[K] } : T[K] })
// }

/**
 * Defines an API schema with type-safe endpoint definitions using Zod validation schemas.
 * This is the primary function for creating API contracts that serve as the single source
 * of truth for both client generation and mock server creation.
 *
 * @template T - The API schema type extending ApiSchema
 *
 * @param schema - Object defining API endpoints with HTTP method/path keys and endpoint configurations
 *
 * @returns A typed API schema that can be used with createApiClient and generateMockApi
 *
 * @example
 * ```typescript
 * import { z } from 'zod'
 * import { defineApiSchema } from 'mock-dash'
 *
 * const apiSchema = defineApiSchema({
 *   // GET endpoint with path parameter
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
 *
 *   // POST endpoint with JSON body
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
 *   },
 *
 *   // File upload endpoint
 *   '@post/upload': {
 *     input: {
 *       form: z.object({
 *         file: z.instanceof(File),
 *         description: z.string().optional()
 *       })
 *     },
 *     response: z.object({
 *       url: z.string(),
 *       filename: z.string()
 *     })
 *   }
 * })
 * ```
 */
export function defineApiSchema<T extends EndpointMap>(schema: T): T {
  return schema
}

export function apiSchemaToEndpointMap<T extends ApiSchema>(schema: T) {
  return Object.values(schema).reduce((acc, endpointMap) => {
    Object.entries(endpointMap).forEach(([key, endpoint]) => {
      acc[key as keyof EndpointMap] = endpoint
    })
    return acc
  }, {} as Record<string, EndpointMap[ApiMethodRoute] | FakerMap<EndpointMap>[ApiMethodRoute]>)
}

export function isEndpoint(obj: unknown): obj is Endpoint {
  return typeof obj === 'object' && obj !== null && 'response' in obj
}
