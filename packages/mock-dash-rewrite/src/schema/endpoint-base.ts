import type { EndpointInput, Input } from './input'

export type BaseEndpointOptions = {
  prefix?: string
}

export abstract class EndpointBase<
  R,
  P extends string = string,
  I extends EndpointInput = Input,
  O extends BaseEndpointOptions = BaseEndpointOptions,
> {
  public readonly path: P
  public readonly response: R
  public readonly input: I | undefined
  public readonly options: O | undefined

  constructor(path: P, response: R, input?: I, options?: O) {
    this.path = path
    this.response = response
    this.input = input
    this.options = options
  }
}
