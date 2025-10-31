import type z from 'zod'
import type { HttpMethod } from '../schema/common'
import type { HttpEndpoint } from '../schema/http-endpoint'
import type { HttpEndpointInput } from '../schema/http-input'
import {
  ApiError,
  type Errors,
  NetworkError,
  ValidationError,
} from '../utils/errors'
import { _prepareFetch } from './_prepare-fetch'
import type {
  CreateApiClientArgs,
  EndpointArgs,
  FetchOptions,
} from './client-base'
import type { InterceptorManager } from './interceptor'

type RestEndpointCallSignature<
  R extends z.ZodType,
  I extends HttpEndpointInput,
> = (
  ...args: EndpointArgs<I>
) => Promise<
  | { data: z.infer<R>; response: Response }
  | { error: Errors; response: Response }
>

export type RestEndpointCall<
  M extends HttpMethod,
  R extends z.ZodType,
  I extends HttpEndpointInput,
> = {
  [K in M]: RestEndpointCallSignature<R, I>
}

export function callRestEndpoint<
  T extends HttpEndpoint<z.ZodType, HttpMethod, string, HttpEndpointInput>,
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
): RestEndpointCallSignature<z.ZodType, any> {
  return async (inputData) => {
    const { transformResponse: localTransformResponse, fetch: localFetch } =
      inputData || {}

    const { fullUrl, options, context } = await _prepareFetch(
      pathParams,
      endpoint,
      inputData,
      requestOptions,
      interceptors,
    )

    let response: Response
    try {
      const fetchFn = localFetch || requestOptions.fetch || fetch
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
      response = await localTransformResponse(context, response)
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
