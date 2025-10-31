import type { Input } from 'hono'
import type z from 'zod'
import type { HttpMethod } from '../schema/common'
import type { HttpEndpoint } from '../schema/http-endpoint'
import {
  type BinaryStreamResponse,
  isBinaryStreamResponse,
  isJSONStreamResponse,
  isSSEResponse,
  type JSONStreamResponse,
  type SSEResponse,
  type StreamResponse,
} from '../schema/stream-response'
import type { Errors } from '../utils/errors'
import { _prepareFetch } from './_prepare-fetch'
import type {
  CreateApiClientArgs,
  EndpointArgs,
  FetchOptions, // Assuming Errors is your union of ApiError, ValidationError, etc.
} from './client-base'
import type { InterceptorManager } from './interceptor'

// --- Types for Stream Return Values ---

// Represents a successfully parsed SSE event
type SSEEvent<T> = {
  type: 'event'
  /** The event name (e.g., 'message') */
  name: string
  /** The parsed and validated data */
  data: T
  /** The event ID, if provided */
  id?: string
  /** The raw data string */
  raw: string
}

// Represents a successfully parsed NDJSON item
type JSONStreamItem<T> = {
  type: 'json'
  /** The parsed and validated data */
  data: T
  /** The raw data string */
  raw: string
}

// Represents a binary chunk
type BinaryChunk = {
  type: 'binary'
  /** The raw data chunk */
  data: Uint8Array
}

// Union of all possible yielded items from the stream generator
export type StreamChunk<R extends StreamResponse> = R extends SSEResponse<
  infer E
>
  ? // E is { eventName: ZodType }. We infer the data type for each event.
    {
      [K in keyof E]: SSEEvent<z.infer<E[K]>>
    }[keyof E]
  : R extends JSONStreamResponse<infer I>
    ? JSONStreamItem<z.infer<I>>
    : R extends BinaryStreamResponse
      ? BinaryChunk
      : never

// Error type for stream parsing
export type StreamParseError = {
  type: 'error'
  error: Error
  /** The raw text chunk that failed to parse */
  raw?: string
}

// The successful return type from the call function
export type StreamSuccessResult<R extends StreamResponse> = {
  data: AsyncGenerator<StreamChunk<R> | StreamParseError, void, void>
  response: Response
  error?: never
}

// The error return type from the call function (e.g., 404, 500)
export type StreamErrorResult = {
  data?: never
  error: Errors
  response: Response
}

// The main call signature for a streaming endpoint
export type StreamEndpointCallSignature<
  R extends StreamResponse,
  I extends Input,
> = (
  ...args: EndpointArgs<
    I,
    {
      onMessage: (payload: {
        event: keyof R
        data: z.infer<R[keyof R]>
        id?: string
      }) => void
      onError?: (error: Errors) => void
      onClose?: () => void
    }
  >
) => Promise<StreamSuccessResult<R> | StreamErrorResult>

/**
 * Main function to call a streaming endpoint.
 * It handles the request and returns an AsyncGenerator for the response body.
 */
export function callStreamEndpoint<
  R extends StreamResponse,
  T extends HttpEndpoint<R, HttpMethod, string, Input>,
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
): StreamEndpointCallSignature<R, any> {
  return async (inputData) => {
    const { transformResponse: localTransformResponse } = inputData || {}

    // 1. Prepare the fetch call
    const { fullUrl, options, context } = await _prepareFetch(
      pathParams,
      endpoint,
      inputData,
      requestOptions,
      interceptors,
    )

    let response: Response
    try {
      // 2. Make the fetch request
      const fetchFn = requestOptions.fetch || fetch
      response = await fetchFn(new Request(fullUrl, options))
    } catch (error) {
      // 3. Handle network errors (same as callRestEndpoint)
      // Assuming you have NetworkError defined elsewhere
      throw new NetworkError(/* ... */)
    }

    // 4. Apply response interceptors
    if (localTransformResponse) {
      const transformedResponse = await localTransformResponse(
        context,
        response,
      )
      if (transformedResponse !== undefined) {
        response = transformedResponse
      }
    }
    response = await interceptors.response.runAll(context, response)

    // 5. Handle HTTP error responses
    if (!response.ok) {
      // Error responses are buffered and parsed, just like in callRestEndpoint
      let errorBody: unknown
      try {
        errorBody = await response.json()
      } catch {
        errorBody = { message: 'Failed to parse error body' }
      }
      return {
        error: new ApiError(
          `API call failed with status ${response.status}`,
          response.status,
          { body: errorBody, url: fullUrl, method: endpoint.method },
        ),
        response,
      }
    }

    // 6. Handle successful stream responses
    if (!response.body) {
      return {
        error: new ApiError('Stream response has no body', response.status, {
          url: fullUrl,
          method: endpoint.method,
        }),
        response,
      }
    }

    // Return the correct generator based on the response type
    let streamGenerator: AsyncGenerator<any, void, void>
    const schema = endpoint.response

    if (isSSEResponse(schema)) {
      streamGenerator = sseStreamParser(response.body, schema.events)
    } else if (isJSONStreamResponse(schema)) {
      streamGenerator = ndjsonStreamParser(response.body, schema.itemSchema)
    } else if (isBinaryStreamResponse(schema)) {
      streamGenerator = binaryStreamParser(response.body)
    } else {
      return {
        error: new ApiError('Unknown stream response type', response.status, {
          url: fullUrl,
          method: endpoint.method,
        }),
        response,
      }
    }

    return {
      data: streamGenerator,
      response,
    }
  }
}

// --- Stream Parsers ---

/**
 * Reads a ReadableStream line by line.
 */
async function* readLines(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<string, void, void> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        if (buffer.length > 0) {
          yield buffer
        }
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')

      // Keep the last partial line in the buffer
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (line.trim().length > 0) {
          yield line
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * Parses a binary stream, yielding Uint8Array chunks.
 */
async function* binaryStreamParser(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<BinaryChunk, void, void> {
  const reader = stream.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      yield { type: 'binary', data: value }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * Parses a Newline-Delimited JSON (NDJSON) stream.
 */
async function* ndjsonStreamParser<T extends z.ZodType>(
  stream: ReadableStream<Uint8Array>,
  schema: T,
): AsyncGenerator<JSONStreamItem<z.infer<T>> | StreamParseError, void, void> {
  for await (const line of readLines(stream)) {
    if (line.trim() === '') continue

    let jsonData: unknown
    try {
      jsonData = JSON.parse(line)
    } catch (error) {
      yield {
        type: 'error',
        error:
          error instanceof Error ? error : new Error('Failed to parse JSON'),
        raw: line,
      }
      continue
    }

    const validation = schema.safeParse(jsonData)
    if (validation.success) {
      yield { type: 'json', data: validation.data, raw: line }
    } else {
      yield { type: 'error', error: validation.error, raw: line }
    }
  }
}

/**
 * Parses a Server-Sent Events (SSE) stream.
 * This is a simplified parser.
 */
async function* sseStreamParser<E extends Record<string, z.ZodType>>(
  stream: ReadableStream<Uint8Array>,
  schemas: E,
): AsyncGenerator<StreamChunk<SSEResponse<E>> | StreamParseError, void, void> {
  let eventName = 'message' // default event name
  let dataBuffer: string[] = []
  let eventId: string | undefined

  for await (const line of readLines(stream)) {
    if (line.startsWith(':')) {
      // comment
      continue
    }

    if (line.startsWith('event:')) {
      eventName = line.substring(6).trim()
      continue
    }

    if (line.startsWith('data:')) {
      dataBuffer.push(line.substring(5).trim())
      continue
    }

    if (line.startsWith('id:')) {
      eventId = line.substring(3).trim()
      continue
    }

    if (line === '') {
      // Empty line: dispatch the event
      if (dataBuffer.length === 0) continue

      const rawData = dataBuffer.join('\n')
      const schema = schemas[eventName]

      if (!schema) {
        // Unknown event, yield an error or just ignore
        yield {
          type: 'error',
          error: new Error(`Unknown SSE event name: "${eventName}"`),
          raw: rawData,
        }
        // Reset for next event
        dataBuffer = []
        eventName = 'message'
        eventId = undefined
        continue
      }

      let parsedJson: unknown
      try {
        parsedJson = JSON.parse(rawData)
      } catch (error) {
        // Handle non-JSON data. If schema is z.string(), just use rawData.
        if (schema instanceof z.ZodString) {
          parsedJson = rawData
        } else {
          yield {
            type: 'error',
            error:
              error instanceof Error
                ? error
                : new Error('Failed to parse SSE data as JSON'),
            raw: rawData,
          }
          dataBuffer = []
          eventName = 'message'
          eventId = undefined
          continue
        }
      }

      const validation = schema.safeParse(parsedJson)
      if (validation.success) {
        yield {
          type: 'event',
          name: eventName,
          data: validation.data,
          id: eventId,
          raw: rawData,
        } as StreamChunk<SSEResponse<E>> // Type assertion
      } else {
        yield { type: 'error', error: validation.error, raw: rawData }
      }

      // Reset for next event
      dataBuffer = []
      eventName = 'message'
      eventId = undefined
    }
  }
}

// Assumed error classes
class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details: any,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
class NetworkError extends Error {
  constructor(
    message: string,
    public details: any,
  ) {
    super(message)
    this.name = 'NetworkError'
  }
}
