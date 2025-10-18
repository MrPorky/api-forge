import type { HttpMethodPath, InputsWithParams, ParamKeysFromKey } from './common-types'
import type { IMock } from './mocks'
import type { EmptyObjectIsNever, RemoveNever } from './type-utils'
import z from 'zod'

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

export function defineEndpoint<K extends HttpMethodPath, R extends z.ZodType, E extends IEndpoint<K, R>>(key: K, endpoint: E): Endpoint<K, E['response'], E> {
  return new Endpoint(key, endpoint)
}

export class Endpoint<K extends HttpMethodPath, R extends z.ZodType, E extends IEndpoint<K, R>> {
  private readonly key: K
  private readonly endpoint: E
  private mock?: IMock<K, R, E['input']>

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

  defineMock(mock: IMock<K, R, E['input']>) {
    this.mock = mock
  }
}

export function isEndpoint(obj: unknown): obj is Endpoint<HttpMethodPath, z.ZodType | z.ZodArray, IEndpoint<HttpMethodPath, z.ZodType | z.ZodArray>> {
  return obj instanceof Endpoint
}

export function isEndpoints(obj: unknown): obj is Endpoints<any> {
  return obj instanceof Endpoints
}

type EndpointsDefinition = {
  [K in HttpMethodPath]: IEndpoint<K, z.ZodType>
}

export function defineEndpoints<T extends EndpointsDefinition>(
  endpoints: T,
): Endpoints<T> {
  return new Endpoints(endpoints)
}

export class Endpoints<T extends EndpointsDefinition> {
  private readonly endpointMap: Map<keyof T, Endpoint<any, any, any>> = new Map()

  public $inferInputJson: {
    [K in keyof T]: T[K] extends IEndpoint<infer TKey, infer _TResponse>
      ? (InputsWithParams<TKey, T[K]['input']> extends { json: infer J } ? J : never)
      : never
  } = {} as any

  constructor(endpoints: T) {
    for (const [key, endpoint] of Object.entries(endpoints)) {
      if (endpoint && 'response' in endpoint) {
        this.endpointMap.set(key as keyof T, new Endpoint(key as HttpMethodPath, endpoint as IEndpoint<HttpMethodPath, z.ZodType>))
      }
    }
  }

  getEndpoint<K extends keyof T>(key: K): T[K] extends IEndpoint<infer TKey, infer TResponse>
    ? Endpoint<TKey, TResponse, T[K]> | undefined
    : undefined {
    return this.endpointMap.get(key) as any
  }

  getAllEndpoints(): Array<Endpoint<any, any, any>> {
    return Array.from(this.endpointMap.values())
  }

  getEntries() {
    return Array.from(this.endpointMap.entries()).map(([_key, endpoint]) => endpoint.getEntry())
  }

  defineMocks<M extends {
    [K in keyof T]?: T[K] extends IEndpoint<infer TKey, infer TResponse>
      ? IMock<TKey, TResponse, T[K]['input']>
      : never
  }>(mocks: M,
  ): void {
    for (const [key, mock] of Object.entries(mocks)) {
      const endpoint = this.endpointMap.get(key as keyof T)
      if (endpoint && mock) {
        endpoint.defineMock(mock)
      }
    }
  }
}

const getUser = defineEndpoint('@get/users/:id', {
  input: {
    query: {
      includeDetails: z.coerce.boolean().optional().default(false),
    },
    json: z.string(),
  },
  response: z.object({ id: z.string() }),
})

getUser.defineMock({
  mockFn: ({ inputs }) => {
    const userId = inputs.param.id

    return {
      id: userId,
    }
  },
})

// Example using the new plural API
const endpoints = defineEndpoints({
  '@get/users/:id': {
    input: {
      param: {
        id: z.string(),
      },
      query: {
        includeDetails: z.coerce.boolean().optional().default(false),
      },
    },
    response: z.object({ id: z.string(), name: z.string() }),
  },
  '@post/users': {
    input: {
      json: z.object({
        name: z.string(),
        email: z.email(),
      }),
    },
    response: z.object({ id: z.string(), name: z.string(), email: z.string() }),
  },
  '@delete/users/:id': {
    input: {
      param: {
        id: z.string(),
      },
    },
    response: z.object({ success: z.boolean() }),
  },
})

endpoints.defineMocks({
  '@get/users/:id': {
    mockFn: ({ inputs }) => {
      return {
        id: inputs.param.id,
        name: `User ${inputs.param.id}`,
      }
    },
  },
  '@post/users': {
    mockFn: ({ inputs }) => {
      return {
        id: 'new-user-id',
        name: inputs.json.name,
        email: inputs.json.email,
      }
    },
  },
  '@delete/users/:id': {
    mockFn: () => {
      return {
        success: true,
      }
    },
  },
})
