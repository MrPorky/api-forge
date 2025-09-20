import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ApiError, isApiError, isMockError, isNetworkError, isValidationError, MockError, NetworkError, ValidationError } from '../errors'

describe('errors', () => {
  describe('apiError', () => {
    it('should create ApiError with status and message', () => {
      const error = new ApiError('Not found', 404, {
        url: '/api/users/1',
        method: 'GET',
      })

      expect(error.name).toBe('ApiError')
      expect(error.message).toBe('Not found')
      expect(error.status).toBe(404)
      expect(error.url).toBe('/api/users/1')
      expect(error.method).toBe('GET')
    })

    it('should maintain proper stack trace', () => {
      const error = new ApiError('Test error', 500)
      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('ApiError')
    })
  })

  describe('validationError', () => {
    it('should create ValidationError with validation details', () => {
      const schema = z.object({ name: z.string() })
      const result = schema.safeParse({ name: 123 })

      if (!result.success) {
        const error = new ValidationError('Validation failed', result.error, 'request')

        expect(error.name).toBe('ValidationError')
        expect(error.validationType).toBe('request')
        expect(error.validationErrors).toBeDefined()
        expect(error.status).toBe(400) // Default status for validation errors
      }
    })

    it('should provide field errors in accessible format', () => {
      const schema = z.object({
        name: z.string(),
        email: z.string().email(),
      })
      const result = schema.safeParse({ name: 123, email: 'invalid' })

      if (!result.success) {
        const error = new ValidationError('Validation failed', result.error, 'request')
        const fieldErrors = error.getFieldErrors()

        expect(fieldErrors).toBeDefined()
        expect(Object.keys(fieldErrors).length).toBeGreaterThan(0)
        expect(fieldErrors.name).toBeDefined()
        expect(fieldErrors.email).toBeDefined()
      }
    })

    it('should get all error messages as flat array', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().min(0),
      })
      const result = schema.safeParse({ name: 123, age: -1 })

      if (!result.success) {
        const error = new ValidationError('Validation failed', result.error, 'request')
        const messages = error.getAllErrorMessages()

        expect(Array.isArray(messages)).toBe(true)
        expect(messages.length).toBeGreaterThan(0)
        expect(messages.some(msg => msg.includes('name'))).toBe(true)
      }
    })

    it('should handle custom status codes', () => {
      const schema = z.object({ name: z.string() })
      const result = schema.safeParse({ name: 123 })

      if (!result.success) {
        const error = new ValidationError('Custom validation error', result.error, 'response', {
          status: 422,
        })

        expect(error.status).toBe(422)
        expect(error.validationType).toBe('response')
      }
    })
  })

  describe('networkError', () => {
    it('should create NetworkError with network details', () => {
      const error = new NetworkError('Connection timeout', {
        url: '/api/users',
        method: 'GET',
        timeout: true,
      })

      expect(error.name).toBe('NetworkError')
      expect(error.timeout).toBe(true)
      expect(error.url).toBe('/api/users')
      expect(error.method).toBe('GET')
    })

    it('should handle connection failures', () => {
      const originalError = new Error('Connection refused')
      const error = new NetworkError('Network request failed', {
        url: 'https://api.example.com/users',
        method: 'POST',
        cause: originalError,
      })

      expect(error.cause).toBe(originalError)
      expect(error.timeout).toBe(false)
    })
  })

  describe('mockError', () => {
    it('should create MockError with status', () => {
      const error = new MockError('Mock error', 500)

      expect(error.name).toBe('MockError')
      expect(error.status).toBe(500)
      expect(error.message).toBe('Mock error')
    })

    it('should handle different HTTP status codes', () => {
      const notFoundError = new MockError('Resource not found', 404)
      const serverError = new MockError('Internal server error', 500)

      expect(notFoundError.status).toBe(404)
      expect(serverError.status).toBe(500)
    })
  })

  describe('type guards', () => {
    it('should correctly identify ApiError', () => {
      const apiError = new ApiError('API error', 400)
      const networkError = new NetworkError('Network error')
      const genericError = new Error('Generic error')

      expect(isApiError(apiError)).toBe(true)
      expect(isApiError(networkError)).toBe(false)
      expect(isApiError(genericError)).toBe(false)
      expect(isApiError(null)).toBe(false)
      expect(isApiError(undefined)).toBe(false)
    })

    it('should correctly identify NetworkError', () => {
      const networkError = new NetworkError('Network error')
      const apiError = new ApiError('API error', 400)

      expect(isNetworkError(networkError)).toBe(true)
      expect(isNetworkError(apiError)).toBe(false)
    })

    it('should correctly identify ValidationError', () => {
      const schema = z.object({ name: z.string() })
      const result = schema.safeParse({ name: 123 })

      if (!result.success) {
        const validationError = new ValidationError('Validation failed', result.error, 'request')
        const apiError = new ApiError('API error', 400)

        expect(isValidationError(validationError)).toBe(true)
        expect(isValidationError(apiError)).toBe(false)
      }
    })

    it('should correctly identify MockError', () => {
      const mockError = new MockError('Mock error', 500)
      const apiError = new ApiError('API error', 400)

      expect(isMockError(mockError)).toBe(true)
      expect(isMockError(apiError)).toBe(false)
    })

    it('should handle inheritance correctly', () => {
      // ValidationError extends ApiError
      const schema = z.object({ name: z.string() })
      const result = schema.safeParse({ name: 123 })

      if (!result.success) {
        const validationError = new ValidationError('Validation failed', result.error, 'request')

        expect(isValidationError(validationError)).toBe(true)
        expect(isApiError(validationError)).toBe(true) // Should also be true due to inheritance
      }
    })
  })
})
