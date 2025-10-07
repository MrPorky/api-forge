import { ApiError, MockError, NetworkError, ValidationError } from './errors'

/**
 * Type guard for MockError thrown only from mock generation code paths.
 */
export function isMockError(error: unknown): error is MockError {
  return error instanceof MockError
}
/**
 * Type guard for ApiError representing non-2xx HTTP responses.
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
/**
 * Type guard for ValidationError (request or response schema failures).
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError
}
/**
 * Type guard for NetworkError indicating the request never produced a valid response.
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError
}
