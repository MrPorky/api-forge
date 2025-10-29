import type z from 'zod'
import type { EndpointInput, Param } from './input'
import type { RestConfig } from './rest-endpoint'
import { RestEndpoint } from './rest-endpoint'

export const defineGet = <
  I extends EndpointInput<'get'>,
  R extends z.ZodType,
  P extends string,
  T extends Param<P>,
>(
  path: P,
  { input, response, options = {} }: RestConfig<R, I, P, T>,
) => {
  return new RestEndpoint('get', path, response, input, options)
}

export const defineDelete = <
  I extends EndpointInput<'delete'>,
  R extends z.ZodType,
  P extends string,
  T extends Param<P>,
>(
  path: P,
  { input, response, options = {} }: RestConfig<R, I, P, T>,
) => {
  return new RestEndpoint('delete', path, response, input, options)
}

export const definePost = <
  I extends EndpointInput<'post'>,
  R extends z.ZodType,
  P extends string,
  T extends Param<P>,
>(
  path: P,
  { input, response, options = {} }: RestConfig<R, I, P, T>,
) => {
  return new RestEndpoint('post', path, response, input, options)
}

export const definePut = <
  I extends EndpointInput<'put'>,
  R extends z.ZodType,
  P extends string,
  T extends Param<P>,
>(
  path: P,
  { input, response, options = {} }: RestConfig<R, I, P, T>,
) => {
  return new RestEndpoint('put', path, response, input, options)
}

export const definePatch = <
  I extends EndpointInput<'patch'>,
  R extends z.ZodType,
  P extends string,
  T extends Param<P>,
>(
  path: P,
  { input, response, options = {} }: RestConfig<R, I, P, T>,
) => {
  return new RestEndpoint('patch', path, response, input, options)
}
