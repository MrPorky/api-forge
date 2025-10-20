import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { defineEndpoint } from '../endpoints'
import { MockError } from '../errors'
import { generateMockApi } from '../generate-mock-api'

describe('generate-mock-api integration tests', () => {
  describe('http request/response cycle', () => {
    it('should handle GET request with default faker', async () => {
      const schema = ({
        getUsers: defineEndpoint('@get/users', {
          response: z.array(z.object({
            id: z.string(),
            name: z.string(),
          })),
        }),
      })

      const mockFaker = vi.fn().mockReturnValue([
        { id: '1', name: 'John Doe' },
        { id: '2', name: 'Jane Smith' },
      ])

      const { app } = generateMockApi(schema, mockFaker)
      const response = await app.request('/users')

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual([
        { id: '1', name: 'John Doe' },
        { id: '2', name: 'Jane Smith' },
      ])
      expect(mockFaker).toHaveBeenCalledWith(schema.getUsers.getEndpoint().response)
    })

    it('should handle POST request with JSON input validation', async () => {
      const schema = ({
        postUsers: defineEndpoint('@post/users', {
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
          }),
        }),
      })

      const mockFaker = vi.fn().mockReturnValue({
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
      })

      const { app } = generateMockApi(schema, mockFaker)
      const response = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com',
        }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual({
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
      })
    })

    it('should handle path parameters', async () => {
      const schema = ({
        getUser: defineEndpoint('@get/users/:id', {
          input: {
            param: ({
              id: z.string(),
            }),
          },
          response: z.object({
            id: z.string(),
            name: z.string(),
          }),
        }),
      })

      const mockFaker = vi.fn().mockReturnValue({
        id: '123',
        name: 'John Doe',
      })

      const { app } = generateMockApi(schema, mockFaker)
      const response = await app.request('/users/123')

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual({
        id: '123',
        name: 'John Doe',
      })
    })

    it('should handle query parameters', async () => {
      const schema = ({
        getUsers: defineEndpoint('@get/users', {
          input: {
            query: ({
              page: z.string().optional(),
              limit: z.string().optional(),
            }),
          },
          response: z.array(z.object({
            id: z.string(),
            name: z.string(),
          })),
        }),
      })

      const mockFaker = vi.fn().mockReturnValue([
        { id: '1', name: 'John' },
      ])

      const { app } = generateMockApi(schema, mockFaker)
      const response = await app.request('/users?page=1&limit=10')

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual([{ id: '1', name: 'John' }])
    })

    it('should handle custom faker with context access', async () => {
      const schema = ({
        getUser: defineEndpoint('@get/users/:id', {
          input: {
            param: ({ id: z.string() }),
            query: ({ include: z.string().optional() }),
          },
          response: z.object({
            id: z.string(),
            name: z.string(),
            details: z.string().optional(),
          }),
        }),
      })

      const customFaker = vi.fn().mockImplementation(context => ({
        id: context.inputs.param.id,
        name: `User ${context.inputs.param.id}`,
        details: context.inputs.query.include ? 'Detailed info' : undefined,
      }))

      schema.getUser.defineMock({ mockFn: customFaker })

      const mockFaker = vi.fn().mockReturnValue({})
      const { app } = generateMockApi(schema, mockFaker)

      const response = await app.request('/users/42?include=details')

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual({
        id: '42',
        name: 'User 42',
        details: 'Detailed info',
      })
      expect(customFaker).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: expect.objectContaining({
            param: { id: '42' },
            query: { include: 'details' },
          }),
          mockContext: expect.any(Map),
          honoContext: expect.any(Object),
        }),
      )
    })

    it('should handle array faker with length specification', async () => {
      const schema = ({
        getUsers: defineEndpoint('@get/users', {
          response: z.array(z.object({
            id: z.string(),
            name: z.string(),
          })),
        }),
      })

      const itemFaker = vi.fn().mockImplementation((context, index) => ({
        id: `user-${index}`,
        name: `User ${index}`,
      }))

      schema.getUsers.defineMock({ mockFn: { length: 3, faker: itemFaker } })

      const mockFaker = vi.fn().mockReturnValue([])
      const { app } = generateMockApi(schema, mockFaker)

      const response = await app.request('/users')

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveLength(3)
      expect(data).toEqual([
        { id: 'user-0', name: 'User 0' },
        { id: 'user-1', name: 'User 1' },
        { id: 'user-2', name: 'User 2' },
      ])
      expect(itemFaker).toHaveBeenCalledTimes(3)
    })

    it('should handle MockError responses', async () => {
      const schema = ({
        getError: defineEndpoint('@get/error', {
          response: z.object({
            message: z.string(),
          }),
        }),
      })

      const customFaker = vi.fn().mockImplementation(() => {
        throw new MockError('Not found', 404)
      })

      schema.getError.defineMock({ mockFn: customFaker })

      const mockFaker = vi.fn().mockReturnValue({})
      const { app } = generateMockApi(schema, mockFaker)

      const response = await app.request('/error')

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data).toEqual({ message: 'Not found' })
    })

    it('should handle form data input', async () => {
      const schema = ({
        postUpload: defineEndpoint('@post/upload', {
          input: {
            form: ({
              name: z.string(),
              description: z.string().optional(),
            }),
          },
          response: z.object({
            id: z.string(),
            filename: z.string(),
          }),
        }),
      })

      const mockFaker = vi.fn().mockReturnValue({
        id: '123',
        filename: 'test.txt',
      })

      const { app } = generateMockApi(schema, mockFaker)

      const formData = new FormData()
      formData.append('name', 'test.txt')
      formData.append('description', 'Test file')

      const response = await app.request('/upload', {
        method: 'POST',
        body: formData,
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual({
        id: '123',
        filename: 'test.txt',
      })
    })

    it('should handle multiple HTTP methods on same path', async () => {
      const schema = ({
        getUsers: defineEndpoint('@get/users', {
          response: z.array(z.object({ id: z.string(), name: z.string() })),
        }),
        postUsers: defineEndpoint('@post/users', {
          input: {
            json: z.object({ name: z.string() }),
          },
          response: z.object({ id: z.string(), name: z.string() }),
        }),
      })

      const mockFaker = vi.fn()
        .mockReturnValueOnce([{ id: '1', name: 'Existing User' }])
        .mockReturnValueOnce({ id: '2', name: 'New User' })

      const { app } = generateMockApi(schema, mockFaker)

      // Test GET
      const getResponse = await app.request('/users')
      expect(getResponse.status).toBe(200)
      const getData = await getResponse.json()
      expect(getData).toEqual([{ id: '1', name: 'Existing User' }])

      // Test POST
      const postResponse = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New User' }),
      })
      expect(postResponse.status).toBe(200)
      const postData = await postResponse.json()
      expect(postData).toEqual({ id: '2', name: 'New User' })
    })

    it('should handle base path configuration', async () => {
      const schema = ({
        getUsers: defineEndpoint('@get/users', {
          response: z.array(z.object({ id: z.string() })),
        }),
      })

      const mockFaker = vi.fn().mockReturnValue([{ id: '1' }])
      const { app } = generateMockApi(schema, mockFaker, {
        base: '/api/v1',
      })

      const response = await app.request('/api/v1/users')

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual([{ id: '1' }])
    })

    it('should handle shared mock context between requests', async () => {
      const schema = ({
        postCounter: defineEndpoint('@post/counter', {
          response: z.object({ count: z.number() }),
        }),
        getCounter: defineEndpoint('@get/counter', {
          response: z.object({ count: z.number() }),
        }),
      })

      const postFaker = vi.fn().mockImplementation((context) => {
        const currentCount = context.mockContext.get('count') || 0
        const newCount = currentCount + 1
        context.mockContext.set('count', newCount)
        return { count: newCount }
      })

      const getFaker = vi.fn().mockImplementation((context) => {
        const count = context.mockContext.get('count') || 0
        return { count }
      })

      schema.postCounter.defineMock({ mockFn: postFaker })
      schema.getCounter.defineMock({ mockFn: getFaker })

      const mockFaker = vi.fn().mockReturnValue({})
      const { app } = generateMockApi(schema, mockFaker)

      // Initial GET should return 0
      const getResponse1 = await app.request('/counter')
      expect(getResponse1.status).toBe(200)
      const getData1 = await getResponse1.json()
      expect(getData1).toEqual({ count: 0 })

      // POST should increment to 1
      const postResponse = await app.request('/counter', { method: 'POST' })
      expect(postResponse.status).toBe(200)
      const postData = await postResponse.json()
      expect(postData).toEqual({ count: 1 })

      // GET should now return 1
      const getResponse2 = await app.request('/counter')
      expect(getResponse2.status).toBe(200)
      const getData2 = await getResponse2.json()
      expect(getData2).toEqual({ count: 1 })
    })
  })
})
