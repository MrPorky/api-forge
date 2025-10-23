import z from 'zod'
import type { EndpointInput } from './endpoints'
import type { EmptyObjectIsNever, Merge, RemoveNever } from './type-utils'

/** Internal enum schema for supported HTTP methods */
export const httpMethodSchema = z.enum([
  'get',
  'post',
  'patch',
  'put',
  'delete',
])
/** Union type of supported lowercase HTTP methods */
export type HttpMethod = z.infer<typeof httpMethodSchema>

export type HttpMethodPath = `@${HttpMethod}/${string}`

type PathParamToObject<
  R extends string,
  K extends string = never,
> = R extends `${string}:${infer P}`
  ? P extends `${infer PARAM}/${infer TR}`
    ? PathParamToObject<TR, K | PARAM>
    : Record<K | P, string>
  : K extends never
    ? never
    : Record<K, string>

export type ParamKeysFromKey<K extends HttpMethodPath> = EmptyObjectIsNever<
  PathParamToObject<K>
> extends never
  ? never
  : keyof PathParamToObject<K>

type InferZodType<T extends object> = T extends z.ZodType
  ? z.infer<T>
  : { [K in keyof T]: T[K] extends z.ZodType ? z.infer<T[K]> : never }

type Inputs<
  K extends HttpMethodPath,
  I extends EndpointInput<K> | undefined,
> = {
  [Key in keyof I]: I[Key] extends z.ZodType
    ? z.infer<I[Key]>
    : I[Key] extends object
      ? InferZodType<I[Key]>
      : never
}

export type InputsWithParams<
  K extends HttpMethodPath,
  I extends EndpointInput<K> | undefined,
> = RemoveNever<{
  [Key in keyof Inputs<K, I> | 'param']: Key extends 'param'
    ? 'param' extends keyof Inputs<K, I>
      ? Inputs<K, I>['param'] extends object
        ? Merge<PathParamToObject<K>, Inputs<K, I>['param']>
        : PathParamToObject<K>
      : PathParamToObject<K>
    : Key extends keyof Inputs<K, I>
      ? Inputs<K, I>[Key]
      : never
}>
