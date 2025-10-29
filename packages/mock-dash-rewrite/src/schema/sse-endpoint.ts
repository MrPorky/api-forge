import type z from 'zod'
import type { DeepStrict } from '../utils/types'
import { type BaseEndpointOptions, EndpointBase } from './endpoint-base'
import type { EndpointInput, Input, Param } from './input'

export type SSEConfig<
  R extends Record<string, z.ZodType>,
  I extends EndpointInput,
  P extends string,
  T extends Param<P>,
> = {
  input: I & {
    param?: DeepStrict<Param<P>, T>
  }
  response: R
  options?: SSEOptions
}

type SSEOptions = BaseEndpointOptions

export function isSSEEndpoint(
  value: unknown,
): value is SSEConfig<
  Record<string, z.ZodType>,
  EndpointInput,
  string,
  Param<string>
> {
  return value instanceof SSEEndpoint
}

export class SSEEndpoint<
  R extends Record<string, z.ZodType> = Record<string, z.ZodType>,
  P extends string = string,
  I extends EndpointInput = Input,
> extends EndpointBase<R, P, I, SSEOptions> {}
