import type { ValidationTargets } from 'hono'
import type { ApiResponseGenerator } from './mock-types'
import type { RemoveNever } from './type-utils'
import z from 'zod'

/** Internal enum schema for supported HTTP methods */
export const httpMethodSchema = z.enum(['get', 'post', 'patch', 'put', 'delete'])
/** Union type of supported lowercase HTTP methods */
export type HttpMethod = z.infer<typeof httpMethodSchema>

type ZodParsedFormValue = z.ZodString | z.ZodFile
type ZodFormValue = ZodParsedFormValue | z.ZodOptional<ZodParsedFormValue>

/**
 * Describes a single API endpoint contract: optional validated inputs and required response schema.
 */
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

/** Pattern for endpoint keys: e.g. '@get/users/:id' */
export type ApiMethodRoute = `@${HttpMethod}/${string}`

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
export function defineApiSchema<T extends EndpointMapType>(schema: T) {
  return new EndpointMap(schema)
}

type EndpointMapType = Record<ApiMethodRoute, Endpoint>

/**
 * Holds endpoint definitions and associated mock (faker) functions.
 */
export class EndpointMap<T extends EndpointMapType> {
  private readonly schema: T
  private fakerMap: FakerMap<T>

  public $inferInputJson: {
    [K in keyof T]: T[K] extends { input: { json: z.ZodType } } ? z.infer<T[K]['input']['json']> : never
  } = {} as any

  constructor(schema: T) {
    this.schema = schema
    this.fakerMap = new FakerMap({})
  }

  getAllEndpoints(): T {
    return this.schema
  }

  getEndpoint(route: keyof T): T[keyof T] {
    return this.schema[route]
  }

  /** Attach custom faker implementations per endpoint */
  defineMock(faker: FakerMapType<T>) {
    this.fakerMap = new FakerMap(faker)
  }

  /** Retrieve a faker for a specific route key */
  getFaker(route: string) {
    return this.fakerMap.getFaker(route)
  }
}

type FakerMapType<T extends EndpointMapType> = {
  [K in keyof T]?: T[K] extends Endpoint ? ApiResponseGenerator<T[K]['input'], T[K]['response']> : never
}

/** Lightweight wrapper around the raw faker map */
export class FakerMap<T extends EndpointMapType> {
  private readonly fakerMap: FakerMapType<T>

  constructor(fakerMap: FakerMapType<T>) {
    this.fakerMap = fakerMap
  }

  /** Lookup faker by route */
  getFaker(route: string) {
    return route in this.fakerMap ? this.fakerMap[route as keyof T] : undefined
  }

  /** Return entire underlying faker map */
  getAllFakers() {
    return this.fakerMap
  }
}
