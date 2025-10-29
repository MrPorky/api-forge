import type z from 'zod'
import type { DeepStrict } from '../utils/types'
import type { HttpMethod } from './common'
import { type BaseEndpointOptions, EndpointBase } from './endpoint-base'
import type { EndpointInput, Input, Param } from './input'

export type RestConfig<
  R extends z.ZodType,
  I extends EndpointInput,
  P extends string,
  T extends Param<P>,
> = {
  input?: I & {
    param?: DeepStrict<Param<P>, T>
  }
  response: R
  options?: RestOptions
}

type RestOptions = BaseEndpointOptions

export function isRestEndpoint(
  value: unknown,
): value is RestEndpoint<z.ZodType, HttpMethod, string, Input> {
  return value instanceof RestEndpoint
}

export class RestEndpoint<
  R extends z.ZodType = z.ZodType,
  M extends HttpMethod = HttpMethod,
  P extends string = string,
  I extends EndpointInput = Input,
> extends EndpointBase<R, P, I, RestOptions> {
  public readonly method: M

  constructor(
    method: M,
    path: P,
    response: R,
    input?: I,
    options?: RestOptions,
  ) {
    super(path, response, input, options)
    this.method = method
  }
}
