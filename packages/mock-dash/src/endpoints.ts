import type z from 'zod'
import type { HttpMethodPath, InputsWithParams, ParamKeysFromKey } from './common-types'
import type { IMock } from './mocks'
import type { EmptyObjectIsNever, RemoveNever } from './type-utils'

type ZodParsedFormValue = z.ZodString | z.ZodStringFormat | z.ZodFile
type ZodFormValue = ZodParsedFormValue | z.ZodOptional<ZodParsedFormValue>

type EndpointSlimInput<PARAMS extends keyof any> = {
  query?: Record<string, z.ZodType>
} & Partial<RemoveNever<{
  param: EmptyObjectIsNever<Record<PARAMS, z.ZodCoercedBigInt | z.ZodCoercedBoolean | z.ZodCoercedDate | z.ZodCoercedNumber | z.ZodStringFormat | z.ZodString>>
}>>

interface EndpointFormInput {
  form?: Record<string, ZodFormValue | z.ZodArray<ZodFormValue>>
  json?: never
}

interface EndpointJsonInput {
  form?: never
  json?: z.ZodType
}

type EndpointFullInput<PARAMS extends keyof any> = EndpointSlimInput<PARAMS> & (EndpointFormInput | EndpointJsonInput)

export type EndpointInput<K extends HttpMethodPath> = K extends `@get/${string}` | `@delete/${string}`
  ? EndpointSlimInput<ParamKeysFromKey<K>>
  : K extends `@post/${string}` | `@put/${string}` | `@patch/${string}`
    ? EndpointFullInput<ParamKeysFromKey<K>>
    : never

export interface IEndpoint<K extends HttpMethodPath, R extends z.ZodType> {
  input?: EndpointInput<K>
  response: R
}

export function defineEndpoint<K extends HttpMethodPath, E extends IEndpoint<K, z.ZodType>>(key: K, endpoint: E) {
  return new Endpoint(key, endpoint)
}

export class Endpoint<K extends HttpMethodPath, E extends IEndpoint<K, z.ZodType>> {
  private readonly key: K
  private readonly endpoint: E
  private mock?: IMock<K, E['response'], E['input']>

  public $inferInputJson: (InputsWithParams<K, E['input']> extends { json: infer J } ? J : never) = {} as any

  constructor(key: K, endpoint: E) {
    this.key = key
    this.endpoint = endpoint
  }

  getEntry() {
    return [this.key, this.endpoint, this.mock] as const
  }

  getEndpoint() {
    return this.endpoint
  }

  defineMock(mock: IMock<K, E['response'], E['input']>) {
    this.mock = mock
  }
}

export function isEndpoint(obj: unknown): obj is Endpoint<HttpMethodPath, IEndpoint<HttpMethodPath, z.ZodType | z.ZodArray>> {
  return obj instanceof Endpoint
}
