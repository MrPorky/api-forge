import type z from 'zod'
import type { HttpEndpointInput, InferInput } from './http-input'

export type Mock<
  P extends string,
  I extends HttpEndpointInput,
  R extends z.ZodType,
> = (i: InferInput<P, I>) => z.infer<R>
