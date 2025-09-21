import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { z } from 'zod'

/**
 * Error class for mock server-specific errors that can be thrown from custom faker functions
 * to simulate specific error scenarios during development and testing. This allows mock
 * endpoints to return appropriate HTTP error responses with custom status codes.
 *
 * @example
 * ```typescript
 * import { MockError } from 'mock-dash'
 *
 * const mockSchema = defineMockServerSchema(apiSchema, {
 *   '@get/users/:id': ({ inputs }) => {
 *     // Simulate user not found scenario
 *     if (inputs.param.id === 'nonexistent') {
 *       throw new MockError('User not found', 404)
 *     }
 *
 *     // Simulate server error scenario
 *     if (inputs.param.id === 'error') {
 *       throw new MockError('Internal server error', 500)
 *     }
 *
 *     // Simulate unauthorized access
 *     if (!inputs.header?.authorization) {
 *       throw new MockError('Unauthorized', 401)
 *     }
 *
 *     return {
 *       id: inputs.param.id,
 *       name: 'John Doe',
 *       email: 'john@example.com'
 *     }
 *   }
 * })
 * ```
 */
export class MockError extends Error {
  /** HTTP status code to return in the mock response */
  readonly status: ContentfulStatusCode

  /**
   * Creates a new MockError instance
   *
   * @param message - Error message to include in the response
   * @param status - HTTP status code to return (e.g., 404, 500, 401)
   */
  constructor(message: string, status: ContentfulStatusCode) {
    super(message)
    this.name = 'MockError'
    this.status = status
  }
}

/**
 * Base error class for all API-related errors that occur during HTTP requests.
 * This error is thrown when the server returns a non-2xx HTTP status code,
 * providing detailed context about the failed request including status code,
 * response body, and request details.
 *
 * @example
 * ```typescript
 * import { createApiClient, isApiError } from 'mock-dash'
 *
 * const client = createApiClient({ apiSchema, baseURL: 'https://api.example.com' })
 *
 * try {
 *   const user = await client('@get/users/:id', { param: { id: '123' } })
 * } catch (error) {
 *   if (isApiError(error)) {
 *     console.log('API Error:', error.message)
 *     console.log('Status:', error.status)
 *     console.log('URL:', error.url)
 *     console.log('Method:', error.method)
 *     console.log('Response body:', error.body)
 *
 *     // Handle specific status codes
 *     switch (error.status) {
 *       case 404:
 *         console.log('User not found')
 *         break
 *       case 401:
 *         console.log('Unauthorized - redirect to login')
 *         break
 *       case 500:
 *         console.log('Server error - try again later')
 *         break
 *     }
 *   }
 * }
 * ```
 */
export class ApiError extends Error {
  /** HTTP status code from the failed response */
  public readonly status: number
  /** Response body from the failed request (parsed JSON or raw text) */
  public readonly body?: unknown
  /** URL that was requested when the error occurred */
  public readonly url?: string
  /** HTTP method that was used for the request */
  public readonly method?: string

  /**
   * Creates a new ApiError instance
   *
   * @param message - Error message describing what went wrong
   * @param status - HTTP status code from the response
   * @param options - Additional error context and details
   * @param options.body - Response body from the failed request
   * @param options.url - URL that was requested
   * @param options.method - HTTP method used for the request
   * @param options.cause - Original error that caused this error (for error chaining)
   */
  constructor(message: string, status: number, options?: {
    body?: unknown
    url?: string
    method?: string
    cause?: Error
  }) {
    super(message, { cause: options?.cause })
    this.name = 'ApiError'
    this.status = status
    this.body = options?.body
    this.url = options?.url
    this.method = options?.method

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError)
    }
  }
}

/**
 * Error thrown when Zod schema validation fails for either request data or response data.
 * This error provides detailed information about which fields failed validation and why,
 * making it easy to handle validation errors in a user-friendly way.
 *
 * @example
 * ```typescript
 * import { createApiClient, isValidationError } from 'mock-dash'
 *
 * const client = createApiClient({ apiSchema, baseURL: 'https://api.example.com' })
 *
 * try {
 *   // This will throw ValidationError if email is invalid
 *   const user = await client('@post/users', {
 *     json: {
 *       name: '',  // Too short
 *       email: 'invalid-email'  // Invalid format
 *     }
 *   })
 * } catch (error) {
 *   if (isValidationError(error)) {
 *     console.log('Validation failed:', error.validationType) // 'request' or 'response'
 *
 *     // Get field-specific errors
 *     const fieldErrors = error.getFieldErrors()
 *     console.log('Field errors:', fieldErrors)
 *     // Output: { 'name': ['String must contain at least 1 character(s)'], 'email': ['Invalid email'] }
 *
 *     // Get all error messages as array
 *     const allErrors = error.getAllErrorMessages()
 *     console.log('All errors:', allErrors)
 *     // Output: ['name: String must contain at least 1 character(s)', 'email: Invalid email']
 *
 *     // Display user-friendly error messages
 *     Object.entries(fieldErrors).forEach(([field, messages]) => {
 *       console.log(`${field}: ${messages.join(', ')}`)
 *     })
 *   }
 * }
 * ```
 */
export class ValidationError extends ApiError {
  /** The original Zod validation error with detailed issue information */
  public readonly validationErrors: z.ZodError
  /** Whether this was a request validation error or response validation error */
  public readonly validationType: 'request' | 'response'

  /**
   * Creates a new ValidationError instance
   *
   * @param message - High-level error message
   * @param validationErrors - The Zod validation error containing detailed field errors
   * @param validationType - Whether this is a 'request' or 'response' validation error
   * @param options - Additional error context
   * @param options.status - HTTP status code (defaults to 400 for validation errors)
   * @param options.body - Response body if this is a response validation error
   * @param options.url - URL that was requested
   * @param options.method - HTTP method used
   * @param options.cause - Original error that caused this validation error
   */
  constructor(
    message: string,
    validationErrors: z.ZodError,
    validationType: 'request' | 'response',
    options?: {
      status?: number
      body?: unknown
      url?: string
      method?: string
      cause?: Error
    },
  ) {
    super(message, options?.status ?? 400, {
      body: options?.body,
      url: options?.url,
      method: options?.method,
      cause: options?.cause,
    })
    this.name = 'ValidationError'
    this.validationErrors = validationErrors
    this.validationType = validationType

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError)
    }
  }

  /**
   * Get field-specific validation errors organized by field path.
   * This is useful for displaying validation errors next to form fields.
   *
   * @returns Object mapping field paths to arrays of error messages
   *
   * @example
   * ```typescript
   * const fieldErrors = validationError.getFieldErrors()
   * // Returns: { 'email': ['Invalid email'], 'name': ['Required'] }
   *
   * // Use in React form
   * Object.entries(fieldErrors).forEach(([field, messages]) => {
   *   setFieldError(field, messages.join(', '))
   * })
   * ```
   */
  public getFieldErrors(): Record<string, string[]> {
    const fieldErrors: Record<string, string[]> = {}

    for (const issue of this.validationErrors.issues) {
      const path = issue.path.join('.')
      if (!fieldErrors[path]) {
        fieldErrors[path] = []
      }
      fieldErrors[path].push(issue.message)
    }

    return fieldErrors
  }

  /**
   * Get a flat array of all validation error messages with field paths.
   * This is useful for displaying a simple list of all validation errors.
   *
   * @returns Array of formatted error messages including field paths
   *
   * @example
   * ```typescript
   * const allErrors = validationError.getAllErrorMessages()
   * // Returns: ['email: Invalid email', 'name: Required']
   *
   * // Display in a notification
   * showErrorNotification(allErrors.join('\n'))
   * ```
   */
  public getAllErrorMessages(): string[] {
    return this.validationErrors.issues.map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : ''
      return `${path}${issue.message}`
    })
  }
}

/**
 * Error thrown when network-related issues occur during HTTP requests, such as
 * connection failures, timeouts, DNS resolution errors, or other network problems
 * that prevent the request from reaching the server or receiving a response.
 *
 * @example
 * ```typescript
 * import { createApiClient, isNetworkError } from 'mock-dash'
 *
 * const client = createApiClient({
 *   apiSchema,
 *   baseURL: 'https://api.example.com',
 *   signal: AbortSignal.timeout(5000) // 5 second timeout
 * })
 *
 * try {
 *   const user = await client('@get/users/:id', { param: { id: '123' } })
 * } catch (error) {
 *   if (isNetworkError(error)) {
 *     console.log('Network Error:', error.message)
 *     console.log('URL:', error.url)
 *     console.log('Method:', error.method)
 *     console.log('Was timeout:', error.timeout)
 *
 *     if (error.timeout) {
 *       console.log('Request timed out - check your connection')
 *     } else {
 *       console.log('Network connection failed - are you offline?')
 *     }
 *
 *     // Implement retry logic
 *     setTimeout(() => {
 *       // Retry the request
 *     }, 1000)
 *   }
 * }
 * ```
 */
export class NetworkError extends Error {
  /** URL that was being requested when the network error occurred */
  public readonly url?: string
  /** HTTP method that was being used for the request */
  public readonly method?: string
  /** Whether this error was caused by a request timeout */
  public readonly timeout?: boolean

  /**
   * Creates a new NetworkError instance
   *
   * @param message - Error message describing the network issue
   * @param options - Additional error context and details
   * @param options.url - URL that was being requested
   * @param options.method - HTTP method used for the request
   * @param options.timeout - Whether this error was caused by a timeout
   * @param options.cause - Original error that caused this network error (for error chaining)
   */
  constructor(message: string, options?: {
    url?: string
    method?: string
    timeout?: boolean
    cause?: Error
  }) {
    super(message, { cause: options?.cause })
    this.name = 'NetworkError'
    this.url = options?.url
    this.method = options?.method
    this.timeout = options?.timeout ?? false

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NetworkError)
    }
  }
}

/**
 * Type guard function to check if an error is a MockError instance.
 * This is useful for handling mock-specific errors in development environments.
 *
 * @param error - The error to check
 * @returns True if the error is a MockError, false otherwise
 *
 * @example
 * ```typescript
 * import { isMockError } from 'mock-dash'
 *
 * try {
 *   // Mock server operation
 * } catch (error) {
 *   if (isMockError(error)) {
 *     console.log('Mock error with status:', error.status)
 *     console.log('Mock error message:', error.message)
 *   }
 * }
 * ```
 */
export function isMockError(error: unknown): error is MockError {
  return error instanceof MockError
}

/**
 * Type guard function to check if an error is an ApiError instance.
 * This helps distinguish API errors from other types of errors in your application.
 *
 * @param error - The error to check
 * @returns True if the error is an ApiError, false otherwise
 *
 * @example
 * ```typescript
 * import { isApiError } from 'mock-dash'
 *
 * try {
 *   const result = await client('@get/users/:id', { param: { id: '123' } })
 * } catch (error) {
 *   if (isApiError(error)) {
 *     // Handle API-specific errors
 *     console.log(`API Error ${error.status}: ${error.message}`)
 *     if (error.status === 404) {
 *       showNotFound()
 *     } else if (error.status >= 500) {
 *       showServerError()
 *     }
 *   } else {
 *     // Handle other types of errors
 *     console.error('Unexpected error:', error)
 *   }
 * }
 * ```
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/**
 * Type guard function to check if an error is a ValidationError instance.
 * This is particularly useful for handling form validation errors and providing
 * user-friendly feedback about invalid input data.
 *
 * @param error - The error to check
 * @returns True if the error is a ValidationError, false otherwise
 *
 * @example
 * ```typescript
 * import { isValidationError } from 'mock-dash'
 *
 * try {
 *   const user = await client('@post/users', { json: formData })
 * } catch (error) {
 *   if (isValidationError(error)) {
 *     // Handle validation errors specifically
 *     const fieldErrors = error.getFieldErrors()
 *
 *     // Update form with field-specific errors
 *     Object.entries(fieldErrors).forEach(([field, messages]) => {
 *       setFieldError(field, messages.join(', '))
 *     })
 *
 *     // Show validation summary
 *     showValidationSummary(error.getAllErrorMessages())
 *   }
 * }
 * ```
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError
}

/**
 * Type guard function to check if an error is a NetworkError instance.
 * This helps identify network-related issues like connection failures or timeouts,
 * allowing you to implement appropriate retry logic or offline handling.
 *
 * @param error - The error to check
 * @returns True if the error is a NetworkError, false otherwise
 *
 * @example
 * ```typescript
 * import { isNetworkError } from 'mock-dash'
 *
 * try {
 *   const data = await client('@get/data')
 * } catch (error) {
 *   if (isNetworkError(error)) {
 *     if (error.timeout) {
 *       // Handle timeout specifically
 *       showTimeoutMessage()
 *       offerRetryOption()
 *     } else {
 *       // Handle other network issues
 *       showOfflineMessage()
 *       enableOfflineMode()
 *     }
 *   }
 * }
 * ```
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError
}
