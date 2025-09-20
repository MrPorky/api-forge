import type z from 'zod'
import type { ApiSchema, Endpoint, InputsWithParam } from './api-schema-types'
import type { EmptyObjectIsNever } from './type-utils'

export type Args<T extends ApiSchema, K extends keyof T> = T[K] extends Endpoint
  ? EmptyObjectIsNever<InputsWithParam<T[K]['input'], K & string>> extends never
    ? []
    : [data: InputsWithParam<T[K]['input'], K & string>]
  : never

export type ClientFn<T extends ApiSchema> = <K extends keyof T>(
  key: K,
  ...args: Args<T, K>
) => T[K] extends Endpoint ? Promise<z.infer<T[K]['response']>> : never

export interface InterceptorContext<T extends ApiSchema, K extends keyof T = keyof T> {
  readonly key: K
  readonly inputs: Args<T, K>[0]
  readonly method: string
  readonly path: string
}

export type InterceptorCallback<T extends ApiSchema, D, K extends keyof T = keyof T> = (
  context: InterceptorContext<T, K>,
  data: D
) => D | Promise<D>

/**
 * Manages a collection of interceptor callbacks and provides methods to add, remove, and execute them.
 * Interceptors are executed in the order they were added, and each interceptor receives the result
 * of the previous interceptor in the chain.
 */
export class InterceptorManager<T extends ApiSchema, D> {
  private readonly callbacks: Array<InterceptorCallback<T, D>> = []

  /**
   * Adds an interceptor callback to the manager. The callback will be executed
   * for all requests/responses in the order it was added.
   *
   * @param callback - The interceptor function to add
   * @returns A cleanup function that removes the interceptor when called
   *
   * @example
   * ```typescript
   * // Add request interceptor for logging
   * const removeLogger = client.interceptors.request.use((context, options) => {
   *   console.log(`Making ${context.method.toUpperCase()} request to ${context.path}`)
   *   return options
   * })
   *
   * // Add response interceptor for error handling
   * const removeErrorHandler = client.interceptors.response.use(async (context, response) => {
   *   if (!response.ok) {
   *     console.error(`Request failed: ${response.status} ${response.statusText}`)
   *   }
   *   return response
   * })
   *
   * // Remove interceptors later
   * removeLogger()
   * removeErrorHandler()
   * ```
   */
  public addInterceptor(callback: InterceptorCallback<T, D>): () => void {
    this.callbacks.push(callback)

    return () => {
      const index = this.callbacks.indexOf(callback)
      if (index > -1) {
        this.callbacks.splice(index, 1)
      }
    }
  }

  /**
   * Alias for addInterceptor that follows the common interceptor pattern used by libraries like Axios.
   * This provides a more familiar API for developers coming from other HTTP client libraries.
   *
   * @param callback - The interceptor function to add
   * @returns A cleanup function that removes the interceptor when called
   *
   * @example
   * ```typescript
   * // Familiar syntax for developers coming from Axios
   * const removeInterceptor = client.interceptors.request.use((context, options) => {
   *   // Add authentication header
   *   return {
   *     ...options,
   *     headers: {
   *       ...options.headers,
   *       'Authorization': `Bearer ${token}`
   *     }
   *   }
   * })
   * ```
   */
  public use(callback: InterceptorCallback<T, D>): () => void {
    return this.addInterceptor(callback)
  }

  /**
   * Executes all registered interceptor callbacks in sequence, passing the result
   * of each interceptor to the next one in the chain.
   *
   * @param context - The interceptor context containing request information
   * @param data - The initial data to be processed by the interceptors
   * @returns The final data after all interceptors have been applied
   *
   * @internal
   */
  public async runAll(
    context: InterceptorContext<T>,
    data: D,
  ): Promise<D> {
    let currentData = data

    for (const callback of this.callbacks) {
      const result = await callback(context, currentData)
      if (result !== undefined) {
        currentData = result
      }
    }

    return currentData
  }
}

export interface ClientProperties<T extends ApiSchema> {
  interceptors: {
    response: InterceptorManager<T, Response>
    request: InterceptorManager<T, FetchOptions>
  }
}

export type Client<T extends ApiSchema> = ClientFn<T> & ClientProperties<T>

export type FetchOptions = Omit<RequestInit, 'body' | 'window' | 'method'>
