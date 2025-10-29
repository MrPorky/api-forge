import type z from 'zod'
import type { EndpointInput, InferInput } from './input'

export type Mock<
  P extends string,
  I extends EndpointInput,
  R extends z.ZodType,
> = (i: InferInput<P, I>) => z.infer<R>
