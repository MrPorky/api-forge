import z from 'zod'

export const httpMethodSchema = z.enum([
  'get',
  'post',
  'patch',
  'put',
  'delete',
])
export type HttpMethod = z.infer<typeof httpMethodSchema>

type ZodStringValues =
  | z.ZodCoercedBigInt
  | z.ZodCoercedBoolean
  | z.ZodCoercedDate
  | z.ZodCoercedNumber
  | z.ZodStringFormat
  | z.ZodString
type ZodFormValue =
  | (ZodStringValues | z.ZodFile)
  | z.ZodOptional<ZodStringValues | z.ZodFile>

type PathParamToObject<
  V,
  R extends string,
  K extends string = never,
> = R extends `${string}:${infer P}`
  ? P extends `${infer PARAM}/${infer TR}`
    ? PathParamToObject<V, TR, K | PARAM>
    : { [Key in K | P]: V }
  : never

type Query = Record<string, ZodStringValues>
type Json = z.ZodType
type Form = Record<string, ZodFormValue | z.ZodArray<ZodFormValue>>
type Input = {
  query?: Query
  param?: Query
  json?: Json
  form?: Form
}

type EndpointInputSlim<PATH extends string> = PathParamToObject<
  ZodStringValues,
  PATH
> extends never
  ? {
      query?: Query
    }
  : {
      query?: Query
      param?: Partial<PathParamToObject<ZodStringValues, PATH>>
    }

export type EndpointInput<
  METHOD extends HttpMethod = HttpMethod,
  PATH extends string = string,
> = METHOD extends 'get' | 'delete'
  ? EndpointInputSlim<PATH>
  : EndpointInputSlim<PATH> & {
      json?: Json
      form?: Form
    }

type InferParam<P extends string, I extends Input> = PathParamToObject<
  string,
  P
> extends object
  ? {
      [Key in keyof PathParamToObject<string, P>]: I['param'] extends Record<
        Key,
        ZodStringValues
      >
        ? z.infer<I['param'][Key]>
        : string
    }
  : never

export type InferInput<P extends string, I extends Input> = {
  query: I['query'] extends object ? z.infer<z.ZodObject<I['query']>> : never
  param: InferParam<P, I>
  json: I['json'] extends z.ZodType ? z.infer<I['json']> : never
  form: I['form'] extends object ? z.infer<z.ZodObject<I['form']>> : never
}
