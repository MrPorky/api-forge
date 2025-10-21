import type { Context, Env, ValidationTargets } from 'hono'
import type z from 'zod'
import type { HttpMethodPath, InputsWithParams } from './common-types'
import type { EndpointInput } from './endpoints'
import type { MaybePromise } from './type-utils'

export interface EndpointInputContext<
  K extends HttpMethodPath,
  I extends EndpointInput<K> | undefined,
> {
  inputs: InputsWithParams<K, I>
  mockContext: Map<string, unknown>
  honoContext: Context<
    Env,
    `${string}/${string}`,
    {
      in: ValidationTargets
      out: ValidationTargets
    }
  >
}

interface MockArraySpec<
  K extends HttpMethodPath,
  R extends z.ZodArray<z.ZodType>,
  I extends EndpointInput<K> | undefined,
> {
  length?: number
  min?: number
  max?: number
  faker: (
    c: EndpointInputContext<K, I>,
    index: number,
  ) => MaybePromise<z.infer<R['element']>>
}

export type MockFn<
  K extends HttpMethodPath,
  R extends z.ZodType,
  I extends EndpointInput<K> | undefined,
> = (c: EndpointInputContext<K, I>) => MaybePromise<z.infer<R> | Response>

export type ApiResponseGenerator<
  K extends HttpMethodPath,
  R extends z.ZodType,
  I extends EndpointInput<K> | undefined,
> = R extends z.ZodArray<z.ZodType>
  ? MockArraySpec<K, R, I> | MockFn<K, R, I>
  : MockFn<K, R, I>

export interface IMock<
  K extends HttpMethodPath,
  R extends z.ZodType,
  I extends EndpointInput<K> | undefined,
> {
  mockFn: ApiResponseGenerator<K, R, I>
}

// export class Mock<K extends HttpMethodPath, R extends z.ZodType, I extends EndpointInput<K> | undefined> {
//   private readonly mock: IMock<K, R, I>

//   constructor(mock: IMock<K, R, I>) {
//     this.mock = mock
//   }

//   getFaker() {
//     return this.mock
//   }
// }
