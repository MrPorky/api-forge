import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { createApiClient } from '../create-api-client'
import { defineEndpoint } from '../endpoints'
import { ApiError, NetworkError, ValidationError } from '../errors'
import * as apiSchema from './apiSchema'

// Mock fetch for testing
globalThis.fetch = vi.fn()

describe('create-api-client functional tests', () => {
  const mockFetch = fetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe('get requests', () => {
    it('should make GET request with query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [{ id: '1', name: 'John' }],
      } as Response)

      const client = createApiClient({
        apiSchema,
        baseURL: 'https://api.example.com',
      })

      const result = await client('@get/users', {
        query: { page: '1', limit: '10' },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users?page=1&limit=10',
        expect.objectContaining({
          method: 'get',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      )
      expect(result).toEqual([{ id: '1', name: 'John' }])
    })

    it('should handle path parameters correctly', async () => {
      const apiSchema = {
        getUser: defineEndpoint('@get/users/:id', {
          input: {
            param: { id: z.string() },
          },
          response: z.object({
            id: z.string(),
            name: z.string(),
          }),
        }),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: '123', name: 'John' }),
      } as Response)

      const client = createApiClient({
        apiSchema,
        baseURL: 'https://api.example.com',
      })

      const result = await client('@get/users/:id', {
        param: { id: '123' },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users/123',
        expect.objectContaining({
          method: 'get',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      )
      expect(result).toEqual({ id: '123', name: 'John' })
    })

    it('should apply prefix to path while preserving key', async () => {
      const apiSchema = {
        getUser: defineEndpoint(
          '@get/users/:id',
          {
            input: { param: { id: z.string() } },
            response: z.object({ id: z.string(), name: z.string() }),
          },
          { prefix: '/api/v1' },
        ),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: '55', name: 'Prefixed User' }),
      } as Response)

      const client = createApiClient({
        apiSchema,
        baseURL: 'https://api.example.com',
      })

      const data = await client('@get/users/:id', { param: { id: '55' } })

      expect(data).toEqual({ id: '55', name: 'Prefixed User' })
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/users/55',
        expect.objectContaining({ method: 'get' }),
      )
    })

    it('should normalize messy prefix', async () => {
      const apiSchema = {
        getPing: defineEndpoint(
          '@get/ping',
          { response: z.string() },
          { prefix: '///api///v2//' },
        ),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'pong',
      } as Response)

      const client = createApiClient({
        apiSchema,
        baseURL: 'https://api.example.com',
      })

      const result = await client('@get/ping')
      expect(result).toBe('pong')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v2/ping',
        expect.objectContaining({ method: 'get' }),
      )
    })
  })

  describe('post requests', () => {
    it('should make POST request with JSON body', async () => {
      const apiSchema = {
        postUsers: defineEndpoint('@post/users', {
          input: {
            json: z.object({
              name: z.string(),
              email: z.email(),
            }),
          },
          response: z.object({
            id: z.string(),
            name: z.string(),
            email: z.string(),
          }),
        }),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: '1',
          name: 'John',
          email: 'john@example.com',
        }),
      } as Response)

      const client = createApiClient({
        apiSchema,
        baseURL: 'https://api.example.com',
      })

      const result = await client('@post/users', {
        json: { name: 'John', email: 'john@example.com' },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method: 'post',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ name: 'John', email: 'john@example.com' }),
        }),
      )
      expect(result).toEqual({
        id: '1',
        name: 'John',
        email: 'john@example.com',
      })
    })

    it('should handle form data requests', async () => {
      const apiSchema = {
        postUpload: defineEndpoint('@post/upload', {
          input: {
            form: {
              name: z.string(),
              file: z.file(),
            },
          },
          response: z.object({
            id: z.string(),
            filename: z.string(),
          }),
        }),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: '1', filename: 'test.txt' }),
      } as Response)

      const client = createApiClient({
        apiSchema,
        baseURL: 'https://api.example.com',
      })

      const file = new File(['content'], 'test.txt', { type: 'text/plain' })
      const result = await client('@post/upload', {
        form: { name: 'Test Upload', file },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/upload',
        expect.objectContaining({
          method: 'post',
          body: expect.any(FormData),
        }),
      )
      expect(result).toEqual({ id: '1', filename: 'test.txt' })
    })
  })

  describe('error handling', () => {
    it('should throw ApiError for HTTP error responses', async () => {
      const apiSchema = {
        getUsers: defineEndpoint('@get/users', {
          response: z.array(z.object({ id: z.string(), name: z.string() })),
        }),
      }

      const errorResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Not found' }),
        text: async () => 'Not found',
        headers: new Headers(),
        url: 'https://api.example.com/users',
      } as Response

      mockFetch.mockResolvedValue(errorResponse)

      const client = createApiClient({
        apiSchema,
        baseURL: 'https://api.example.com',
      })

      await expect(client('@get/users')).rejects.toThrow(ApiError)

      // Test the specific error message in a separate call
      try {
        await client('@get/users')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).message).toContain(
          'API call failed with status 404',
        )
      }
    })

    it('should throw NetworkError for network failures', async () => {
      const apiSchema = {
        getUsers: defineEndpoint('@get/users', {
          response: z.array(z.object({ id: z.string(), name: z.string() })),
        }),
      }

      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      const client = createApiClient({
        apiSchema,
        baseURL: 'https://api.example.com',
      })

      await expect(client('@get/users')).rejects.toThrow(NetworkError)
    })

    it('should throw ValidationError for request validation failures', async () => {
      const apiSchema = {
        postUsers: defineEndpoint('@post/users', {
          input: {
            json: z.object({
              name: z.string(),
              email: z.email(),
            }),
          },
          response: z.object({
            id: z.string(),
            name: z.string(),
            email: z.string(),
          }),
        }),
      }

      const client = createApiClient({
        apiSchema,
        baseURL: 'https://api.example.com',
      })

      await expect(
        client('@post/users', {
          // @ts-expect-error Testing invalid input
          json: { name: 123, email: 'invalid-email' },
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should throw ValidationError for response validation failures', async () => {
      const apiSchema = {
        getUsers: defineEndpoint('@get/users', {
          response: z.array(z.object({ id: z.string(), name: z.string() })),
        }),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [{ id: 123, name: 'John' }], // Invalid: id should be string
      } as Response)

      const client = createApiClient({
        apiSchema,
        baseURL: 'https://api.example.com',
      })

      await expect(client('@get/users')).rejects.toThrow(ValidationError)
    })
  })

  describe('interceptors', () => {
    it('should apply request interceptors', async () => {
      const apiSchema = {
        getUsers: defineEndpoint('@get/users', {
          response: z.array(z.object({ id: z.string(), name: z.string() })),
        }),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [{ id: '1', name: 'John' }],
      } as Response)

      const client = createApiClient({
        apiSchema,
        baseURL: 'https://api.example.com',
      })

      // Add request interceptor
      client.interceptors.request.addInterceptor((_context, options) => {
        return {
          ...options,
          headers: {
            ...options.headers,
            'X-Custom-Header': 'test-value',
          },
        }
      })

      await client('@get/users')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'test-value',
          }),
        }),
      )
    })

    it('should apply response interceptors', async () => {
      const apiSchema = {
        getUsers: defineEndpoint('@get/users', {
          response: z.array(z.object({ id: z.string(), name: z.string() })),
        }),
      }

      const originalResponse = {
        ok: true,
        status: 200,
        json: async () => [{ id: '1', name: 'John' }],
      } as Response

      mockFetch.mockResolvedValueOnce(originalResponse)

      const client = createApiClient({
        apiSchema,
        baseURL: 'https://api.example.com',
      })

      // Add response interceptor
      const interceptorSpy = vi.fn((_context, response) => response)
      client.interceptors.response.addInterceptor(interceptorSpy)

      await client('@get/users')

      expect(interceptorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          key: '@get/users',
          method: 'get',
          path: 'https://api.example.com/users',
        }),
        originalResponse,
      )
    })
  })
})
