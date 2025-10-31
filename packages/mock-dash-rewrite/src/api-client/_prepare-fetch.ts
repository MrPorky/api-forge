import type { HttpMethod } from '../schema/common'
import type { HttpEndpoint } from '../schema/http-endpoint'
import type { HttpInput } from '../schema/http-input'
import {
  isBinaryStreamResponse,
  isJSONStreamResponse,
  isSSEResponse,
  isStreamResponse,
} from '../schema/stream-response'
import type {
  CreateApiClientArgs,
  EndpointArgs,
  FetchOptions,
} from './client-base'
import type { InterceptorContext, InterceptorManager } from './interceptor'

// These functions are assumed to exist in your project based on `callRestEndpoint`
// You may need to export them from their original files.
declare function buildEndpointPath(
  path: string,
  prefix: string | undefined,
  baseURL: string,
): string
declare function serializeQueryParams(query: unknown): string
declare function buildFormData(form: unknown): FormData

/**
 * @internal
 * Prepares the URL, options, and context for a fetch call.
 * This refactors the common logic from `callRestEndpoint`.
 */
export async function _prepareFetch<
  T extends HttpEndpoint<any, HttpMethod, string, HttpInput>,
>(
  pathParams: Record<string, string>,
  endpoint: T,
  inputData: EndpointArgs<any>[0], // The 'args' object
  requestOptions: Omit<
    CreateApiClientArgs,
    'apiSchema' | 'transformRequest' | 'transformResponse'
  >,
  interceptors: {
    request: InterceptorManager<FetchOptions>
  },
): Promise<{
  fullUrl: string
  options: RequestInit
  context: InterceptorContext
}> {
  const {
    headers: customHeaders,
    signal,
    transformRequest: localTransformRequest,
    // localTransformResponse is handled by the specific call function
    ...restInputArgs
  } = inputData || {}

  let fullUrl = buildEndpointPath(
    endpoint.path,
    endpoint.options?.prefix,
    requestOptions.baseURL,
  )

  // Replace path parameters
  for (const [key, value] of Object.entries(pathParams)) {
    fullUrl = fullUrl.replace(`:${key}`, String(value)) // Ensure value is a string
  }

  // Handle query parameters
  if (restInputArgs?.query) {
    const queryString = serializeQueryParams(restInputArgs.query)
    if (queryString) {
      fullUrl += `?${queryString}`
    }
  }

  const headers: HeadersInit = {
    // Set 'Content-Type': 'application/json' by default
    // It will be removed for FormData later if needed
    'Content-Type': 'application/json',
    ...requestOptions.headers,
    ...customHeaders,
  }

  // For stream requests, we explicitly ask for stream-friendly formats
  if (isStreamResponse(endpoint.response)) {
    if (isSSEResponse(endpoint.response)) {
      ;(headers as Record<string, string>)['Accept'] = 'text/event-stream'
    } else if (isJSONStreamResponse(endpoint.response)) {
      ;(headers as Record<string, string>)['Accept'] = 'application/x-ndjson'
    } else if (isBinaryStreamResponse(endpoint.response)) {
      ;(headers as Record<string, string>)['Accept'] =
        endpoint.response.contentType
    }
  }

  let options: RequestInit = {
    ...requestOptions,
    method: endpoint.method.toUpperCase(),
    headers,
    signal,
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

  const context: InterceptorContext = {
    method: endpoint.method,
    path: fullUrl,
  }

  // Apply local request interceptor if provided
  if (localTransformRequest) {
    options = await localTransformRequest(context, options)
  }

  // Apply global request interceptors
  options = await interceptors.request.runAll(context, options)

  return { fullUrl, options, context }
}
