import type z from 'zod'
import type { HttpMethod } from '../schema/common'
import type { EndpointBase } from '../schema/endpoint-base'
import type { EndpointInput, InferInput, Input } from '../schema/input'
import { isRestEndpoint, type RestEndpoint } from '../schema/rest-endpoint'
import { SSEEndpoint } from '../schema/sse-endpoint'
import { buildEndpointPath } from '../utils/buildEndpointPath'
import { deepMerge } from '../utils/deep-merge'
import {
  ApiError,
  type Errors,
  NetworkError,
  ValidationError,
} from '../utils/errors'
import { buildFormData, serializeQueryParams } from '../utils/request-utils'
import type { EmptyObjectIsNever } from '../utils/types'
import {
  type InterceptorCallback,
  type InterceptorContext,
  InterceptorManager,
} from './interceptor'

type EndpointArgs<I extends EndpointInput> = EmptyObjectIsNever<
  InferInput<I>
> extends never
  ? [
      args?: InferInput<I> & {
        headers?: Record<string, string>
        signal?: AbortSignal
        transformRequest?: InterceptorCallback<RequestInit>
        transformResponse?: InterceptorCallback<Response>
      },
    ]
  : [
      args: InferInput<I> & {
        headers?: Record<string, string>
        signal?: AbortSignal
        transformRequest?: InterceptorCallback<RequestInit>
        transformResponse?: InterceptorCallback<Response>
      },
    ]

type PathParameterMapper<
  K extends string,
  P extends string,
  E extends EndpointBase<unknown>,
> = K extends `:${infer PARAM}`
  ? {
      [KEY in PARAM]: (value: string) => ClientPathObject<P, E>
    }
  : {
      [KEY in K]: ClientPathObject<P, E>
    }

type ClientPathObject<
  P extends string,
  E extends EndpointBase<unknown>,
> = P extends `/${infer PATH}`
  ? PATH extends `${infer SEGMENT}/${infer REST}`
    ? PathParameterMapper<SEGMENT, `/${REST}`, E>
    : PathParameterMapper<PATH, '', E>
  : EndpointCall<E>

type EndpointCall<T extends EndpointBase<unknown>> = T extends RestEndpoint<
  infer R,
  infer M,
  string,
  infer I
>
  ? {
      [K in M]: (
        ...args: EndpointArgs<I>
      ) => Promise<
        | { data: z.infer<R>; response: Response }
        | { error: Errors; response: Response }
      >
    }
  : T extends SSEEndpoint<infer R, string, infer I>
    ? (
        ...args: EndpointArgs<I> & {
          onMessage: (data: z.infer<z.ZodUnion<R[keyof R][]>>) => void
          onError?: (error: Errors) => void
          onClose?: () => void
        }
      ) => Promise<Record<keyof R, z.infer<R[keyof R]>>>
    : never

type Client<T = Record<string, unknown>> = {
  [K in keyof T]: T[K] extends EndpointBase<unknown, infer P>
    ? ClientPathObject<P, T[K]>
    : never
}[keyof T]

type FetchOptions = Omit<RequestInit, 'body' | 'window' | 'method'>
type CreateApiClientArgs<
  T extends Record<string, unknown> = Record<string, unknown>,
> = {
  apiSchema: T
  baseURL: string
  transformRequest?: InterceptorCallback<FetchOptions>
  transformResponse?: InterceptorCallback<Response>
  fetch?: (input: Request) => Response | Promise<Response>
} & FetchOptions

export function createApiClient<ApiSchema extends Record<string, unknown>>(
  args: CreateApiClientArgs<ApiSchema>,
) {
  const { apiSchema, transformRequest, transformResponse, ...requestOptions } =
    args

  const interceptors = {
    request: new InterceptorManager<FetchOptions>(),
    response: new InterceptorManager<Response>(),
  }

  if (transformRequest) interceptors.request.addInterceptor(transformRequest)

  if (transformResponse) interceptors.response.addInterceptor(transformResponse)

  const apiRoot = {} as Client<ApiSchema>
  Object.entries(apiSchema).forEach(([_endpointKey, endpoint]) => {
    if (isRestEndpoint(endpoint)) {
      const segments = parsePath(endpoint.path)
      // Merge the new structure into the existing apiRoot
      deepMerge(
        apiRoot,
        buildNode(segments, endpoint, requestOptions, interceptors),
      )
    }
  })

  return { ...apiRoot, interceptors }
}

type ParsedSegment =
  | { type: 'resource'; name: string }
  | { type: 'param'; name: string }

function parsePath(path: string): ParsedSegment[] {
  // 1. Remove leading/trailing slashes and split by '/'
  const segments = path.replace(/^\/|\/$/g, '').split('/')

  return segments.map((segment) => {
    if (segment.startsWith(':')) {
      // It's a path parameter
      return { type: 'param', name: segment.substring(1) }
    } else {
      // It's a static resource name
      return { type: 'resource', name: segment }
    }
  })
}

function buildNode<T extends EndpointBase<unknown>>(
  segments: ParsedSegment[],
  endpoint: T, // The definition from defineGet/definePost
  requestOptions: Omit<
    CreateApiClientArgs,
    'apiSchema' | 'transformRequest' | 'transformResponse'
  >,
  interceptors: {
    request: InterceptorManager<FetchOptions>
    response: InterceptorManager<Response>
  },
  pathParams: Record<string, string> = {}, // Accumulated parameters
) {
  if (segments.length === 0) {
    // 3. END OF PATH: Return the final callable function
    // This function closes over the final pathParams

    if (isRestEndpoint(endpoint)) {
      const apiCall = callRestEndpoint(
        pathParams,
        endpoint,
        requestOptions,
        interceptors,
      )

      return {
        [endpoint.method]: apiCall,
      }
    } else if (endpoint instanceof SSEEndpoint) {
      const sseCall = callSSEEndpoint(
        pathParams,
        endpoint,
        requestOptions,
        interceptors,
      )

      return {
        $sse: sseCall,
      }
    }
  }

  const [currentSegment, ...restSegments] = segments
  const node: Record<string, any> = {}

  if (currentSegment.type === 'resource') {
    // 1. RESOURCE: Attach the next part of the tree
    node[currentSegment.name] = buildNode(
      restSegments,
      endpoint,
      requestOptions,
      interceptors,
      pathParams,
    )
  } else if (currentSegment.type === 'param') {
    // 2. PARAMETER: Attach a function that captures the param value
    const paramKey = currentSegment.name

    node[paramKey] = (paramValue: string) => {
      // Create a new set of params for the recursion
      const newParams = { ...pathParams, [paramKey]: paramValue }

      // Continue building the rest of the path from this point
      return buildNode(
        restSegments,
        endpoint,
        requestOptions,
        interceptors,
        newParams,
      )
    }
  }

  return node
}

function callRestEndpoint<
  T extends RestEndpoint<z.ZodType, HttpMethod, string, EndpointInput>,
>(
  pathParams: Record<string, string>,
  endpoint: T,
  requestOptions: Omit<
    CreateApiClientArgs,
    'apiSchema' | 'transformRequest' | 'transformResponse'
  >,
  interceptors: {
    request: InterceptorManager<FetchOptions>
    response: InterceptorManager<Response>
  },
) {
  return async (...args: EndpointArgs<Input>) => {
    const inputData = args.length > 0 ? args[0] : {}
    const {
      headers: customHeaders,
      signal,
      transformRequest: localTransformRequest,
      transformResponse: localTransformResponse,
      ...restInputArgs
    } = (inputData as any) || {}

    // Build the full URL by replacing path parameters
    let fullUrl = buildEndpointPath(
      endpoint.path,
      endpoint.options?.prefix,
      requestOptions.baseURL,
    )

    // Replace path parameters
    for (const [key, value] of Object.entries(pathParams)) {
      fullUrl = fullUrl.replace(`:${key}`, value)
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...requestOptions.headers,
      ...customHeaders,
    }

    let options: RequestInit = {
      ...requestOptions,
      method: endpoint.method.toUpperCase(),
      headers,
      signal,
    }

    // Handle query parameters
    if (restInputArgs?.query) {
      const queryString = serializeQueryParams(restInputArgs.query)
      if (queryString) {
        fullUrl += `?${queryString}`
      }
    }

    // Handle request body
    if (endpoint.method !== 'get' && restInputArgs) {
      if (restInputArgs.json) {
        options.body = JSON.stringify(restInputArgs.json)
      } else if (restInputArgs.form) {
        // Remove Content-Type to let browser set it for FormData
        delete (headers as Record<string, string>)['Content-Type']
        options.body = buildFormData(restInputArgs.form)
      }
    }

    // Create interceptor context
    const context: InterceptorContext = {
      method: endpoint.method,
      path: fullUrl,
    }

    // Apply local request interceptor if provided
    if (localTransformRequest) {
      const transformed = await localTransformRequest(context, options)
      if (transformed !== undefined) {
        options = transformed
      }
    }

    // Apply global request interceptors
    options = await interceptors.request.runAll(context, options)

    let response: Response
    try {
      const fetchFn = requestOptions.fetch || fetch
      response = await fetchFn(new Request(fullUrl, options))
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError(`Network request failed: ${error.message}`, {
          url: fullUrl,
          method: endpoint.method.toUpperCase(),
          cause: error,
        })
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new NetworkError('Request timeout', {
          url: fullUrl,
          method: endpoint.method.toUpperCase(),
          timeout: true,
          cause: error,
        })
      }
      throw new NetworkError(
        `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          url: fullUrl,
          method: endpoint.method.toUpperCase(),
          cause: error instanceof Error ? error : undefined,
        },
      )
    }

    // Apply local response interceptor if provided
    if (localTransformResponse) {
      const transformedResponse = await localTransformResponse(
        context,
        response,
      )
      if (transformedResponse !== undefined) {
        response = transformedResponse
      }
    }

    // Apply global response interceptors
    response = await interceptors.response.runAll(context, response)

    if (!response.ok) {
      let errorBody: unknown
      try {
        errorBody = await response.json()
      } catch {
        try {
          const text = await response.text()
          errorBody = text ? { message: text } : { message: 'Unknown error' }
        } catch {
          errorBody = { message: 'Unknown error' }
        }
      }

      return {
        error: new ApiError(
          `API call failed with status ${response.status}`,
          response.status,
          {
            body: errorBody,
            url: fullUrl,
            method: endpoint.method.toUpperCase(),
          },
        ),
        response,
      }
    }

    let jsonResponse: unknown
    try {
      // Handle different response types based on the schema
      const contentType = response.headers.get('content-type')

      if (contentType?.includes('text/')) {
        jsonResponse = await response.text()
      } else if (response.status === 204) {
        // No content response
        jsonResponse = undefined
      } else {
        jsonResponse = await response.json()
      }
    } catch (error) {
      return {
        error: new ApiError(
          'Failed to parse response as JSON',
          response.status,
          {
            url: fullUrl,
            method: endpoint.method.toUpperCase(),
            cause: error instanceof Error ? error : undefined,
          },
        ),
        response,
      }
    }

    // Validate response against schema
    const validationResult = endpoint.response.safeParse(jsonResponse)
    if (!validationResult.success) {
      return {
        error: new ValidationError(
          'Response validation failed',
          validationResult.error,
          'response',
          {
            status: response.status,
            body: jsonResponse,
            url: fullUrl,
            method: endpoint.method.toUpperCase(),
          },
        ),
        response,
      }
    }

    return {
      data: validationResult.data,
      response,
    }
  }
}

function callSSEEndpoint<
  T extends SSEEndpoint<Record<string, z.ZodType>, string, EndpointInput>,
>(
  pathParams: Record<string, string>,
  endpoint: T,
  requestOptions: Omit<
    CreateApiClientArgs,
    'apiSchema' | 'transformRequest' | 'transformResponse'
  >,
  interceptors: {
    request: InterceptorManager<FetchOptions>
    response: InterceptorManager<Response>
  },
) {
  return async (...args: any[]) => {
    const inputData = args.length > 0 ? args[0] : {}
    const {
      onMessage,
      onError,
      onClose,
      headers: customHeaders,
      signal,
      transformRequest: localTransformRequest,
      ...restInputArgs
    } = inputData || {}

    // Build the full URL by replacing path parameters
    let fullUrl = buildEndpointPath(endpoint.path, requestOptions.baseURL)

    // Replace path parameters
    for (const [key, value] of Object.entries(pathParams)) {
      fullUrl = fullUrl.replace(`:${key}`, value)
    }

    // Handle query parameters
    if (restInputArgs?.query) {
      const queryString = serializeQueryParams(restInputArgs.query)
      if (queryString) {
        fullUrl += `?${queryString}`
      }
    }

    const headers: HeadersInit = {
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache',
      ...requestOptions.headers,
      ...customHeaders,
    }

    let options: RequestInit = {
      ...requestOptions,
      method: 'GET',
      headers,
      signal,
    }

    // Create interceptor context
    const context: InterceptorContext = {
      method: 'get',
      path: fullUrl,
    }

    // Apply local request interceptor if provided
    if (localTransformRequest) {
      const transformed = await localTransformRequest(context, options)
      if (transformed !== undefined) {
        options = transformed
      }
    }

    // Apply global request interceptors
    options = await interceptors.request.runAll(context, options)

    let response: Response
    try {
      const fetchFn = requestOptions.fetch || fetch
      response = await fetchFn(new Request(fullUrl, options))
    } catch (error) {
      const networkError =
        error instanceof TypeError && error.message.includes('fetch')
          ? new NetworkError(`Network request failed: ${error.message}`, {
              url: fullUrl,
              method: 'GET',
              cause: error,
            })
          : new NetworkError(
              `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              {
                url: fullUrl,
                method: 'GET',
                cause: error instanceof Error ? error : undefined,
              },
            )

      onError?.(networkError)
      throw networkError
    }

    if (!response.ok) {
      const apiError = new ApiError(
        `SSE connection failed with status ${response.status}`,
        response.status,
        {
          url: fullUrl,
          method: 'GET',
        },
      )
      onError?.(apiError)
      throw apiError
    }

    if (!response.body) {
      const error = new ApiError('No response body for SSE connection', 500, {
        url: fullUrl,
        method: 'GET',
      })
      onError?.(error)
      throw error
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    const eventTypes = Object.keys(endpoint.response)
    const responseData: Record<string, unknown> = {}

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          onClose?.()
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              // Try to match the data to one of the expected event types
              for (const eventType of eventTypes) {
                const schema = endpoint.response[eventType]
                const result = schema.safeParse(data)

                if (result.success) {
                  responseData[eventType] = result.data
                  onMessage?.(result.data)
                  break
                }
              }
            } catch (parseError) {
              const validationError = new ApiError(
                'Failed to parse SSE message',
                400,
                {
                  url: fullUrl,
                  method: 'GET',
                  cause: parseError instanceof Error ? parseError : undefined,
                },
              )
              onError?.(validationError)
            }
          }
        }
      }
    } catch (error) {
      const streamError = new NetworkError(
        `SSE stream error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          url: fullUrl,
          method: 'GET',
          cause: error instanceof Error ? error : undefined,
        },
      )
      onError?.(streamError)
      throw streamError
    } finally {
      reader.releaseLock()
    }

    return responseData as Record<
      keyof T['response'],
      z.infer<T['response'][keyof T['response']]>
    >
  }
}
