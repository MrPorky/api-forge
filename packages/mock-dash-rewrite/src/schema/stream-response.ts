import type z from 'zod'

/**
 * Base class to identify any stream response in the schema.
 */
export abstract class StreamResponse {
  // Brand to identify stream responses
  public readonly _brand = 'StreamResponse'
}

/**
 * Defines a Server-Sent Events (SSE) stream.
 * The schema defines the possible `event` names and the shape of their `data`.
 */
export class SSEResponse<
  E extends Record<string, z.ZodType>,
> extends StreamResponse {
  constructor(public readonly events: E) {
    super()
  }
}

/**
 * Defines a Newline-Delimited JSON (NDJSON) stream.
 * The schema defines the shape of *each individual JSON object* in the stream.
 */
export class JSONStreamResponse<I extends z.ZodType> extends StreamResponse {
  constructor(public readonly itemSchema: I) {
    super()
  }
}

/**
 * Defines a raw binary stream (e.g., file download, video stream).
 */
export class BinaryStreamResponse extends StreamResponse {
  constructor(
    public readonly contentType: string = 'application/octet-stream',
  ) {
    super()
  }
}

// --- Helper Functions ---

/**
 * Defines a Server-Sent Events (SSE) response stream.
 * @param events - An object where keys are event names and values are Zod schemas for the event's data.
 *
 * @example
 * defineSSE({
 * message: z.object({ id: z.string(), text: z.string() }),
 * userUpdate: z.object({ userId: z.string(), status: z.string() }),
 * close: z.literal('done'),
 * })
 */
export function defineSSE<E extends Record<string, z.ZodType>>(
  events: E,
): SSEResponse<E> {
  return new SSEResponse(events)
}

/**
 * Defines a Newline-Delimited JSON (NDJSON) response stream.
 * @param itemSchema - A Zod schema for *each individual line* (JSON object) in the stream.
 *
 * @example
 * defineJSONStream(
 * z.object({ id: z.number(), name: z.string() })
 * )
 */
export function defineJSONStream<I extends z.ZodType>(
  itemSchema: I,
): JSONStreamResponse<I> {
  return new JSONStreamResponse(itemSchema)
}

/**
 * Defines a binary octet-stream response.
 * @param contentType - The expected MIME type of the stream.
 *
 * @example
 * defineBinaryStream('image/png')
 */
export function defineBinaryStream(
  contentType: string = 'application/octet-stream',
): BinaryStreamResponse {
  return new BinaryStreamResponse(contentType)
}

// --- Type Guards ---

export function isStreamResponse(value: unknown): value is StreamResponse {
  return value instanceof StreamResponse
}

export function isSSEResponse(value: unknown): value is SSEResponse<any> {
  return value instanceof SSEResponse
}

export function isJSONStreamResponse(
  value: unknown,
): value is JSONStreamResponse<any> {
  return value instanceof JSONStreamResponse
}

export function isBinaryStreamResponse(
  value: unknown,
): value is BinaryStreamResponse {
  return value instanceof BinaryStreamResponse
}
