import type z from 'zod'
import type { DeepStrict } from '../utils/types'
import type { HttpMethod } from './common'
import { type BaseEndpointOptions, EndpointBase } from './endpoint-base'
import type { HttpEndpointInput, HttpInput, ParamFromPath } from './http-input'

export type HttpConfig<
  R extends z.ZodType,
  I extends HttpEndpointInput,
  P extends string,
  T extends ParamFromPath<P>,
> = {
  input?: I & {
    param?: DeepStrict<ParamFromPath<P>, T>
  }
  response: R
  options?: HttpOptions
}

type HttpOptions = BaseEndpointOptions

export function isRestEndpoint(
  value: unknown,
): value is HttpEndpoint<z.ZodType, HttpMethod, string, HttpInput> {
  return value instanceof HttpEndpoint
}

export class HttpEndpoint<
  R extends z.ZodType = z.ZodType,
  M extends HttpMethod = HttpMethod,
  P extends string = string,
  I extends HttpEndpointInput = HttpInput,
> extends EndpointBase<R, P, I, HttpOptions> {
  public readonly method: M

  constructor(
    method: M,
    path: P,
    response: R,
    input?: I,
    options?: HttpOptions,
  ) {
    super(path, response, input, options)
    this.method = method
  }
}
