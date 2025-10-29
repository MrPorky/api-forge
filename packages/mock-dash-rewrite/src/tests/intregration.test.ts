import { describe, expect, it, vi } from 'vitest'
import z from 'zod'
import { createApiClient } from '../api-client/api-client'
import { createMockServer } from '../create-mock-server/create-mock-server'
import {
  defineDelete,
  defineGet,
  definePatch,
  definePost,
  definePut,
} from '../schema/define-rest-endpoint'
import { ApiError, NetworkError, ValidationError } from '../utils/errors'

describe('create-api-client', () => {
  describe('GET requests', () => {
    it('should perform a GET request and return typed response', async () => {
      const apiSchema = {
        getUser: defineGet('/users/:id', {
          input: {
            query: {
              page: z.string(),
              limit: z.string().optional(),
            },
          },
          response: z.object({
            id: z.string(),
            name: z.string(),
          }),
        }),
      }

      const faker = vi.fn()
      faker.mockReturnValue({
        id: '123',
        name: 'John Doe',
      })
      const { app } = createMockServer(apiSchema, faker)

      const client = createApiClient({
        apiSchema,
        baseURL: 'http://localhost',
        fetch: app.fetch,
      })

      expect(client).toHaveProperty('users')
      expect(client.users).toHaveProperty('id')
      expect(client.users.id('test')).toHaveProperty('get')

      const res = await client.users.id('123').get({ query: { page: '1' } })

      expect(res).toHaveProperty('data')
      if ('data' in res) {
        expect(res.data).toEqual({ id: '123', name: 'John Doe' })
      }
    })

    it('should handle GET request without parameters', async () => {
      const apiSchema = {
        listUsers: defineGet('/users', {
          response: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
            }),
          ),
        }),
      }

      const faker = vi.fn()
      faker.mockReturnValue([
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' },
      ])
      const { app } = createMockServer(apiSchema, faker)

      const client = createApiClient({
        apiSchema,
        baseURL: 'http://localhost',
        fetch: app.fetch,
      })

      const res = await client.users.get()

      expect(res).toHaveProperty('data')
      if ('data' in res) {
        expect(Array.isArray(res.data)).toBe(true)
        expect(res.data).toHaveLength(2)
      }
    })

    it('should handle optional query parameters', async () => {
      const apiSchema = {
        searchUsers: defineGet('/users/search', {
          input: {
            query: {
              q: z.string(),
              page: z.string().optional(),
              limit: z.string().optional(),
            },
          },
          response: z.object({
            users: z.array(z.object({ id: z.string(), name: z.string() })),
            total: z.number(),
          }),
        }),
      }

      const faker = vi.fn()
      faker.mockReturnValue({
        users: [{ id: '1', name: 'John Doe' }],
        total: 1,
      })
      const { app } = createMockServer(apiSchema, faker)

      const client = createApiClient({
        apiSchema,
        baseURL: 'http://localhost',
        fetch: app.fetch,
      })

      const res = await client.users.search.get({
        query: { q: 'john' },
      })

      if ('data' in res) {
        expect(res.data).toEqual({
          users: [{ id: '1', name: 'John Doe' }],
          total: 1,
        })
      }
    })
  })

  describe('POST requests', () => {
    it('should perform POST request with JSON body', async () => {
      const apiSchema = {
        createUser: definePost('/users', {
          input: {
            json: z.object({
              name: z.string(),
              email: z.string().email(),
            }),
          },
          response: z.object({
            id: z.string(),
            name: z.string(),
            email: z.string(),
            createdAt: z.string(),
          }),
        }),
      }

      const faker = vi.fn()
      faker.mockReturnValue({
        id: 'new-user-id',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: '2023-01-01T00:00:00Z',
      })
      const { app } = createMockServer(apiSchema, faker)

      const client = createApiClient({
        apiSchema,
        baseURL: 'http://localhost',
        fetch: app.fetch,
      })

      const res = await client.users.post({
        json: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      })

      if ('data' in res) {
        expect(res.data).toEqual({
          id: 'new-user-id',
          name: 'John Doe',
          email: 'john@example.com',
          createdAt: '2023-01-01T00:00:00Z',
        })
      }
    })

    it('should handle POST with form data', async () => {
      const apiSchema = {
        uploadAvatar: definePost('/users/:id/avatar', {
          input: {
            form: {
              file: z.string(), // Simplified for testing
              description: z.string().optional(),
            },
          },
          response: z.object({
            avatarUrl: z.string(),
          }),
        }),
      }

      const faker = vi.fn()
      faker.mockReturnValue({
        avatarUrl: 'https://example.com/avatar.jpg',
      })
      const { app } = createMockServer(apiSchema, faker)

      const client = createApiClient({
        apiSchema,
        baseURL: 'http://localhost',
        fetch: app.fetch,
      })

      const res = await client.users.id('123').avatar.post({
        form: {
          file: 'file-data',
          description: 'User avatar',
        },
      })

      if ('data' in res) {
        expect(res.data).toEqual({
          avatarUrl: 'https://example.com/avatar.jpg',
        })
      }
    })
  })

  describe('PUT requests', () => {
    it('should perform PUT request to update resource', async () => {
      const apiSchema = {
        updateUser: definePut('/users/:id', {
          input: {
            json: z.object({
              name: z.string(),
              email: z.string().email(),
            }),
          },
          response: z.object({
            id: z.string(),
            name: z.string(),
            email: z.string(),
            updatedAt: z.string(),
          }),
        }),
      }

      const faker = vi.fn()
      faker.mockReturnValue({
        id: '123',
        name: 'Jane Doe',
        email: 'jane@example.com',
        updatedAt: '2023-01-01T12:00:00Z',
      })
      const { app } = createMockServer(apiSchema, faker)

      const client = createApiClient({
        apiSchema,
        baseURL: 'http://localhost',
        fetch: app.fetch,
      })

      const res = await client.users.id('123').put({
        json: {
          name: 'Jane Doe',
          email: 'jane@example.com',
        },
      })

      if ('data' in res) {
        expect(res.data).toEqual({
          id: '123',
          name: 'Jane Doe',
          email: 'jane@example.com',
          updatedAt: '2023-01-01T12:00:00Z',
        })
      }
    })
  })

  describe('PATCH requests', () => {
    it('should perform PATCH request for partial updates', async () => {
      const apiSchema = {
        patchUser: definePatch('/users/:id', {
          input: {
            json: z.object({
              name: z.string().optional(),
              email: z.string().email().optional(),
            }),
          },
          response: z.object({
            id: z.string(),
            name: z.string(),
            email: z.string(),
            updatedAt: z.string(),
          }),
        }),
      }

      const faker = vi.fn()
      faker.mockReturnValue({
        id: '123',
        name: 'Updated Name',
        email: 'john@example.com',
        updatedAt: '2023-01-01T12:00:00Z',
      })
      const { app } = createMockServer(apiSchema, faker)

      const client = createApiClient({
        apiSchema,
        baseURL: 'http://localhost',
        fetch: app.fetch,
      })

      const res = await client.users.id('123').patch({
        json: {
          name: 'Updated Name',
        },
      })

      if ('data' in res) {
        expect(res.data).toEqual({
          id: '123',
          name: 'Updated Name',
          email: 'john@example.com',
          updatedAt: '2023-01-01T12:00:00Z',
        })
      }
    })
  })

  describe('DELETE requests', () => {
    it('should perform DELETE request', async () => {
      const apiSchema = {
        deleteUser: defineDelete('/users/:id', {
          response: z.void(),
        }),
      }

      const faker = vi.fn()
      faker.mockReturnValue(undefined)
      const { app } = createMockServer(apiSchema, faker)

      const client = createApiClient({
        apiSchema,
        baseURL: 'http://localhost',
        fetch: app.fetch,
      })

      const res = await client.users.id('123').delete()

      if ('data' in res) {
        expect(res.data).toBeUndefined()
      }
    })

    it('should handle DELETE with confirmation response', async () => {
      const apiSchema = {
        deleteUserWithConfirmation: defineDelete('/users/:id/confirm', {
          response: z.object({
            deleted: z.boolean(),
            deletedAt: z.string(),
          }),
        }),
      }

      const faker = vi.fn()
      faker.mockReturnValue({
        deleted: true,
        deletedAt: '2023-01-01T12:00:00Z',
      })
      const { app } = createMockServer(apiSchema, faker)

      const client = createApiClient({
        apiSchema,
        baseURL: 'http://localhost',
        fetch: app.fetch,
      })

      const res = await client.users.id('123').confirm.delete()

      if ('data' in res) {
        expect(res.data).toEqual({
          deleted: true,
          deletedAt: '2023-01-01T12:00:00Z',
        })
      }
    })
  })

  describe('Error handling', () => {
    it('should handle 404 errors', async () => {
      const apiSchema = {
        getUser: defineGet('/users/:id', {
          response: z.object({
            id: z.string(),
            name: z.string(),
          }),
        }),
      }

      // Mock fetch to return 404
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'User not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const client = createApiClient({
        apiSchema,
        baseURL: 'http://localhost',
        fetch: mockFetch,
      })

      const res = await client.users.id('999').get()

      expect(res).toHaveProperty('error')
      if ('error' in res) {
        expect(res.error).toBeInstanceOf(ApiError)
        expect((res.error as ApiError).status).toBe(404)
      }
    })

    it('should handle validation errors', async () => {
      const apiSchema = {
        createUser: definePost('/users', {
          input: {
            json: z.object({
              name: z.string().min(1),
              email: z.string().email(),
            }),
          },
          response: z.object({
            id: z.string(),
            name: z.string(),
            email: z.string(),
          }),
        }),
      }

      // Mock fetch to return invalid response
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 123, name: 'John' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const client = createApiClient({
        apiSchema,
        baseURL: 'http://localhost',
        fetch: mockFetch,
      })

      const res = await client.users.post({
        json: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      })

      expect(res).toHaveProperty('error')
      if ('error' in res) {
        expect(res.error).toBeInstanceOf(ValidationError)
      }
    })

    it('should handle network errors', async () => {
      const apiSchema = {
        getUser: defineGet('/users/:id', {
          response: z.object({
            id: z.string(),
            name: z.string(),
          }),
        }),
      }

      // Mock fetch to throw network error
      const mockFetch = vi
        .fn()
        .mockRejectedValue(new TypeError('Failed to fetch'))

      const client = createApiClient({
        apiSchema,
        baseURL: 'http://localhost',
        fetch: mockFetch,
      })

      await expect(client.users.id('123').get()).rejects.toThrow(NetworkError)
    })
  })

  describe('Interceptors', () => {
    it('should support request interceptors', async () => {
      const apiSchema = {
        getUser: defineGet('/users/:id', {
          response: z.object({
            id: z.string(),
            name: z.string(),
          }),
        }),
      }

      const faker = vi.fn()
      faker.mockReturnValue({ id: '123', name: 'John Doe' })
      const { app } = createMockServer(apiSchema, faker)

      const client = createApiClient({
        apiSchema,
        baseURL: 'http://localhost',
        fetch: app.fetch,
      })

      const requestInterceptor = vi.fn((_context, options) => ({
        ...options,
        headers: {
          ...options.headers,
          'X-Custom-Header': 'test-value',
        },
      }))

      client.interceptors.request.use(requestInterceptor)

      await client.users.id('123').get()

      expect(requestInterceptor).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'get',
          path: expect.stringContaining('/users/123'),
        }),
        expect.objectContaining({
          headers: expect.any(Object),
        }),
      )
    })

    it('should support response interceptors', async () => {
      const apiSchema = {
        getUser: defineGet('/users/:id', {
          response: z.object({
            id: z.string(),
            name: z.string(),
          }),
        }),
      }

      const faker = vi.fn()
      faker.mockReturnValue({ id: '123', name: 'John Doe' })
      const { app } = createMockServer(apiSchema, faker)

      const client = createApiClient({
        apiSchema,
        baseURL: 'http://localhost',
        fetch: app.fetch,
      })

      const responseInterceptor = vi.fn((_context, response) => response)

      client.interceptors.response.use(responseInterceptor)

      await client.users.id('123').get()

      expect(responseInterceptor).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'get',
          path: expect.stringContaining('/users/123'),
        }),
        expect.any(Response),
      )
    })

    it('should support local request/response transformers', async () => {
      const apiSchema = {
        getUser: defineGet('/users/:id', {
          response: z.object({
            id: z.string(),
            name: z.string(),
          }),
        }),
      }

      const faker = vi.fn()
      faker.mockReturnValue({ id: '123', name: 'John Doe' })
      const { app } = createMockServer(apiSchema, faker)

      const client = createApiClient({
        apiSchema,
        baseURL: 'http://localhost',
        fetch: app.fetch,
      })

      const localRequestTransformer = vi.fn((_context, options) => ({
        ...options,
        headers: {
          ...options.headers,
          'X-Local-Header': 'local-value',
        },
      }))

      const localResponseTransformer = vi.fn((_context, response) => response)

      await client.users.id('123').get({
        transformRequest: localRequestTransformer,
        transformResponse: localResponseTransformer,
      })

      expect(localRequestTransformer).toHaveBeenCalled()
      expect(localResponseTransformer).toHaveBeenCalled()
    })
  })

  describe('Complex path structures', () => {
    it('should handle nested paths with multiple parameters', async () => {
      const apiSchema = {
        getUserPost: defineGet('/users/:userId/posts/:postId', {
          response: z.object({
            id: z.string(),
            title: z.string(),
            userId: z.string(),
          }),
        }),
      }

      const faker = vi.fn()
      faker.mockReturnValue({
        id: 'post-123',
        title: 'My Post',
        userId: 'user-456',
      })
      const { app } = createMockServer(apiSchema, faker)

      const client = createApiClient({
        apiSchema,
        baseURL: 'http://localhost',
        fetch: app.fetch,
      })

      const res = await client.users.userId('456').posts.postId('123').get()

      if ('data' in res) {
        expect(res.data).toEqual({
          id: 'post-123',
          title: 'My Post',
          userId: 'user-456',
        })
      }
    })

    it('should handle deep nested resources', async () => {
      const apiSchema = {
        getCommentReply: defineGet(
          '/users/:userId/posts/:postId/comments/:commentId/replies/:replyId',
          {
            response: z.object({
              id: z.string(),
              content: z.string(),
              commentId: z.string(),
            }),
          },
        ),
      }

      const faker = vi.fn()
      faker.mockReturnValue({
        id: 'reply-789',
        content: 'Reply content',
        commentId: 'comment-456',
      })
      const { app } = createMockServer(apiSchema, faker)

      const client = createApiClient({
        apiSchema,
        baseURL: 'http://localhost',
        fetch: app.fetch,
      })

      const res = await client.users
        .userId('123')
        .posts.postId('456')
        .comments.commentId('789')
        .replies.replyId('101')
        .get()

      if ('data' in res) {
        expect(res.data).toEqual({
          id: 'reply-789',
          content: 'Reply content',
          commentId: 'comment-456',
        })
      }
    })
  })

  describe('Different response types', () => {
    it('should handle text responses', async () => {
      const apiSchema = {
        getPlainText: defineGet('/text', {
          response: z.string(),
        }),
      }

      const mockFetch = vi.fn().mockResolvedValue(
        new Response('Plain text content', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        }),
      )

      const client = createApiClient({
        apiSchema,
        baseURL: 'http://localhost',
        fetch: mockFetch,
      })

      const res = await client.text.get()

      if ('data' in res) {
        expect(res.data).toBe('Plain text content')
      }
    })

    it('should handle void responses (204 No Content)', async () => {
      const apiSchema = {
        deleteResource: defineDelete('/resource/:id', {
          response: z.void(),
        }),
      }

      const mockFetch = vi
        .fn()
        .mockResolvedValue(new Response(null, { status: 204 }))

      const client = createApiClient({
        apiSchema,
        baseURL: 'http://localhost',
        fetch: mockFetch,
      })

      const res = await client.resource.id('123').delete()

      if ('data' in res) {
        expect(res.data).toBeUndefined()
      }
    })
  })

  describe('Request customization', () => {
    it('should support custom headers per request', async () => {
      const apiSchema = {
        getUser: defineGet('/users/:id', {
          response: z.object({
            id: z.string(),
            name: z.string(),
          }),
        }),
      }

      const faker = vi.fn()
      faker.mockReturnValue({ id: '123', name: 'John Doe' })
      const { app } = createMockServer(apiSchema, faker)

      // Spy on app.fetch to check headers
      const fetchSpy = vi.spyOn(app, 'fetch')

      const client = createApiClient({
        apiSchema,
        baseURL: 'http://localhost',
        fetch: app.fetch,
      })

      await client.users.id('123').get({
        headers: {
          Authorization: 'Bearer token123',
          'X-Custom': 'value',
        },
      })

      const request = fetchSpy.mock.calls[0][0] as Request
      expect(request.headers.get('Authorization')).toBe('Bearer token123')
      expect(request.headers.get('X-Custom')).toBe('value')
    })

    it('should support AbortSignal for request cancellation', async () => {
      const apiSchema = {
        getUser: defineGet('/users/:id', {
          response: z.object({
            id: z.string(),
            name: z.string(),
          }),
        }),
      }

      const mockFetch = vi.fn().mockImplementation((input: Request) => {
        // Check if request is aborted
        if (input.signal?.aborted) {
          return Promise.reject(
            new DOMException('Request aborted', 'AbortError'),
          )
        }
        return new Promise((resolve) => setTimeout(resolve, 1000))
      })

      const client = createApiClient({
        apiSchema,
        baseURL: 'http://localhost',
        fetch: mockFetch,
      })

      const controller = new AbortController()

      // Cancel the request immediately
      controller.abort()

      await expect(
        client.users.id('123').get({ signal: controller.signal }),
      ).rejects.toThrow(NetworkError)
    })
  })

  describe('Advanced API scenarios', () => {
    it('should handle concurrent requests', async () => {
      const apiSchema = {
        getUser: defineGet('/users/:id', {
          response: z.object({
            id: z.string(),
            name: z.string(),
          }),
        }),
      }

      const faker = vi.fn()
      faker.mockImplementation(() => {
        // Simulate different users based on call order
        const callCount = faker.mock.calls.length
        return {
          id: `user-${callCount}`,
          name: `User ${callCount}`,
        }
      })
      const { app } = createMockServer(apiSchema, faker)

      const client = createApiClient({
        apiSchema,
        baseURL: 'http://localhost',
        fetch: app.fetch,
      })

      // Make multiple concurrent requests
      const promises = [
        client.users.id('1').get(),
        client.users.id('2').get(),
        client.users.id('3').get(),
      ]

      const results = await Promise.all(promises)

      results.forEach((res, index) => {
        if ('data' in res) {
          expect(res.data.id).toBe(`user-${index + 1}`)
          expect(res.data.name).toBe(`User ${index + 1}`)
        }
      })
    })

    it('should handle API with different content types', async () => {
      const apiSchema = {
        getJson: defineGet('/api/json', {
          response: z.object({ type: z.string() }),
        }),
        getText: defineGet('/api/text', {
          response: z.string(),
        }),
      }

      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ type: 'json' }), {
            headers: { 'Content-Type': 'application/json' },
          }),
        )
        .mockResolvedValueOnce(
          new Response('plain text response', {
            headers: { 'Content-Type': 'text/plain' },
          }),
        )

      const client = createApiClient({
        apiSchema,
        baseURL: 'http://localhost',
        fetch: mockFetch,
      })

      const jsonRes = await client.api.json.get()
      const textRes = await client.api.text.get()

      if ('data' in jsonRes) {
        expect(jsonRes.data).toEqual({ type: 'json' })
      }

      if ('data' in textRes) {
        expect(textRes.data).toBe('plain text response')
      }
    })

    it('should handle complex query parameter scenarios', async () => {
      const apiSchema = {
        searchComplex: defineGet('/search', {
          input: {
            query: {
              q: z.string(),
              filters: z.array(z.string()).optional(),
              page: z.coerce.number().optional(),
              nested: z
                .object({
                  category: z.string(),
                  subcategory: z.string().optional(),
                })
                .optional(),
            },
          },
          response: z.object({
            results: z.array(z.string()),
            count: z.number(),
          }),
        }),
      }

      const faker = vi.fn()
      faker.mockReturnValue({
        results: ['item1', 'item2'],
        count: 2,
      })
      const { app } = createMockServer(apiSchema, faker)

      // Spy on fetch to check query parameters
      const fetchSpy = vi.spyOn(app, 'fetch')

      const client = createApiClient({
        apiSchema,
        baseURL: 'http://localhost',
        fetch: app.fetch,
      })

      await client.search.get({
        query: {
          q: 'test query',
          filters: ['filter1', 'filter2'],
          page: 2,
          nested: {
            category: 'electronics',
            subcategory: 'phones',
          },
        },
      })

      const request = fetchSpy.mock.calls[0][0] as Request
      const url = new URL(request.url)

      expect(url.searchParams.get('q')).toBe('test query')
      expect(url.searchParams.getAll('filters')).toEqual(['filter1', 'filter2'])
      expect(url.searchParams.get('page')).toBe('2')
      expect(url.searchParams.get('nested[category]')).toBe('electronics')
      expect(url.searchParams.get('nested[subcategory]')).toBe('phones')
    })

    it('should properly handle error responses with different status codes', async () => {
      const apiSchema = {
        testEndpoint: defineGet('/test', {
          response: z.object({ success: z.boolean() }),
        }),
      }

      const testCases = [
        { status: 400, expectedError: ApiError },
        { status: 401, expectedError: ApiError },
        { status: 403, expectedError: ApiError },
        { status: 500, expectedError: ApiError },
      ]

      for (const { status, expectedError } of testCases) {
        const mockFetch = vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ message: `Error ${status}` }), {
            status,
            headers: { 'Content-Type': 'application/json' },
          }),
        )

        const client = createApiClient({
          apiSchema,
          baseURL: 'http://localhost',
          fetch: mockFetch,
        })

        const res = await client.test.get()

        expect(res).toHaveProperty('error')
        if ('error' in res) {
          expect(res.error).toBeInstanceOf(expectedError)
          expect((res.error as ApiError).status).toBe(status)
        }
      }
    })

    it('should handle interceptor chaining correctly', async () => {
      const apiSchema = {
        getUser: defineGet('/users/:id', {
          response: z.object({
            id: z.string(),
            name: z.string(),
          }),
        }),
      }

      const faker = vi.fn()
      faker.mockReturnValue({ id: '123', name: 'John Doe' })
      const { app } = createMockServer(apiSchema, faker)

      const client = createApiClient({
        apiSchema,
        baseURL: 'http://localhost',
        fetch: app.fetch,
      })

      const interceptorOrder: string[] = []

      // Add multiple request interceptors
      client.interceptors.request.use((_context, options) => {
        interceptorOrder.push('request-1')
        return {
          ...options,
          headers: { ...options.headers, 'X-First': 'first' },
        }
      })

      client.interceptors.request.use((_context, options) => {
        interceptorOrder.push('request-2')
        return {
          ...options,
          headers: { ...options.headers, 'X-Second': 'second' },
        }
      })

      // Add multiple response interceptors
      client.interceptors.response.use((_context, response) => {
        interceptorOrder.push('response-1')
        return response
      })

      client.interceptors.response.use((_context, response) => {
        interceptorOrder.push('response-2')
        return response
      })

      await client.users.id('123').get()

      // Verify interceptors were called in correct order
      expect(interceptorOrder).toEqual([
        'request-1',
        'request-2',
        'response-1',
        'response-2',
      ])
    })

    it('should handle malformed JSON responses gracefully', async () => {
      const apiSchema = {
        getBrokenJson: defineGet('/broken', {
          response: z.object({ data: z.string() }),
        }),
      }

      const mockFetch = vi.fn().mockResolvedValue(
        new Response('{ invalid json }', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const client = createApiClient({
        apiSchema,
        baseURL: 'http://localhost',
        fetch: mockFetch,
      })

      const res = await client.broken.get()

      expect(res).toHaveProperty('error')
      if ('error' in res) {
        expect(res.error).toBeInstanceOf(ApiError)
        expect(res.error.message).toContain('Failed to parse response as JSON')
      }
    })
  })
})
