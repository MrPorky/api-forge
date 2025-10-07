import type { Context, Env, ValidationTargets } from 'hono'
import type z from 'zod'
import type { Endpoint } from './api-schema-types'

type InferZodType<T extends z.ZodType> = T extends z.ZodObject ? Partial<z.infer<T>> : z.infer<T>

type MaybePromise<T> = T | Promise<T>

type ValidKeys<T extends Endpoint['input']> = {
  [K in keyof T]: T[K] extends z.ZodType ? K : never
}[keyof T]

type Inputs<T extends Endpoint['input']> = T extends undefined ? object : {
  [key in ValidKeys<T>]: key extends keyof T ? z.infer<T[key]> : never
}

export interface EndpointInputContext<I extends Endpoint['input']> {
  inputs: Inputs<I>
  mockContext: Map<string, unknown>
  honoContext: Context<Env, `${string}/${string}`, {
    in: ValidationTargets
    out: ValidationTargets
  }>
}

export interface MockArraySpec<I extends Endpoint['input'], R extends z.ZodArray<z.ZodType>> {
  length?: number
  min?: number
  max?: number
  faker: (c: EndpointInputContext<I>, index: number) => MaybePromise<InferZodType<R['element']>>
}

export type ApiResponseGenerator<I extends Endpoint['input'], R extends z.ZodType = z.ZodType | z.ZodArray<z.ZodType>>
  = R extends z.ZodArray<z.ZodType>
    ? (MockArraySpec<I, R> | ((c: EndpointInputContext<I>) => MaybePromise<z.infer<R>>))
    : (c: EndpointInputContext<I>) => MaybePromise<InferZodType<R>>
