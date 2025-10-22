import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { defineEndpoint } from '../endpoints'
import { generateMockApi } from '../generate-mock-api'

describe('Response Handling', () => {
  describe('String response handling', () => {
    it('should return text response for ZodString schema', async () => {
      const schema = {
        getText: defineEndpoint('@get/text', {
          response: z.string(),
        }),
      }

      const mockFaker = vi.fn().mockReturnValue('Hello, World!')
      const { app } = generateMockApi(schema, mockFaker)

      const response = await app.request('/text')

      expect(response.status).toBe(200)
      const text = await response.text()
      expect(text).toBe('Hello, World!')
    })

    it('should return error for non-string mock data with ZodString schema', async () => {
      const schema = {
        getText: defineEndpoint('@get/text', {
          response: z.string(),
        }),
      }

      const mockFaker = vi.fn().mockReturnValue({ message: 'not a string' })
      const { app } = generateMockApi(schema, mockFaker)

      const response = await app.request('/text')

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toEqual({ message: 'a string is expected' })
    })

    it('should handle ZodStringFormat (like email) as string response', async () => {
      const schema = {
        getEmail: defineEndpoint('@get/email', {
          response: z.email(),
        }),
      }

      const mockFaker = vi.fn().mockReturnValue('test@example.com')
      const { app } = generateMockApi(schema, mockFaker)

      const response = await app.request('/email')

      expect(response.status).toBe(200)
      const text = await response.text()
      expect(text).toBe('test@example.com')
    })

    it('should return error for non-string with ZodStringFormat', async () => {
      const schema = {
        getEmail: defineEndpoint('@get/email', {
          response: z.email(),
        }),
      }

      const mockFaker = vi.fn().mockReturnValue(123)
      const { app } = generateMockApi(schema, mockFaker)

      const response = await app.request('/email')

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toEqual({ message: 'a string is expected' })
    })

    it('should handle custom faker returning string for ZodString', async () => {
      const schema = {
        getText: defineEndpoint('@get/text', {
          response: z.string(),
        }),
      }

      const customFaker = vi
        .fn()
        .mockImplementation(() => 'Custom text response')
      schema.getText.defineMock({ mockFn: customFaker })

      const mockFaker = vi.fn()
      const { app } = generateMockApi(schema, mockFaker)

      const response = await app.request('/text')

      expect(response.status).toBe(200)
      const text = await response.text()
      expect(text).toBe('Custom text response')
    })
  })

  describe('Void response handling', () => {
    it('should return empty response for ZodVoid schema', async () => {
      const schema = {
        deleteItem: defineEndpoint('@delete/item/:id', {
          input: {
            param: { id: z.string() },
          },
          response: z.void(),
        }),
      }

      const mockFaker = vi.fn().mockReturnValue(undefined)
      const { app } = generateMockApi(schema, mockFaker)

      const response = await app.request('/item/123', { method: 'DELETE' })

      expect(response.status).toBe(200)
      expect(response.body).toBe(null)
    })

    it('should handle custom faker with ZodVoid response', async () => {
      const schema = {
        updateStatus: defineEndpoint('@put/status', {
          input: {
            json: z.object({ status: z.string() }),
          },
          response: z.void(),
        }),
      }

      const customFaker = vi.fn().mockImplementation(() => {
        // Custom faker can still do side effects even with void response
        return undefined
      })
      schema.updateStatus.defineMock({ mockFn: customFaker })

      const mockFaker = vi.fn()
      const { app } = generateMockApi(schema, mockFaker)

      const response = await app.request('/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })

      expect(response.status).toBe(200)
      expect(response.body).toBe(null)
      expect(customFaker).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: expect.objectContaining({
            json: { status: 'active' },
          }),
        }),
      )
    })
  })

  describe('JSON response handling (default case)', () => {
    it('should return JSON response for object schema', async () => {
      const schema = {
        getUser: defineEndpoint('@get/user', {
          response: z.object({
            id: z.string(),
            name: z.string(),
          }),
        }),
      }

      const mockFaker = vi.fn().mockReturnValue({
        id: '1',
        name: 'John Doe',
      })
      const { app } = generateMockApi(schema, mockFaker)

      const response = await app.request('/user')

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('application/json')
      const data = await response.json()
      expect(data).toEqual({
        id: '1',
        name: 'John Doe',
      })
    })

    it('should return JSON response for array schema', async () => {
      const schema = {
        getUsers: defineEndpoint('@get/users', {
          response: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
            }),
          ),
        }),
      }

      const mockFaker = vi.fn().mockReturnValue([
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' },
      ])
      const { app } = generateMockApi(schema, mockFaker)

      const response = await app.request('/users')

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('application/json')
      const data = await response.json()
      expect(data).toEqual([
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' },
      ])
    })

    it('should return JSON response for primitive types (numbers, booleans)', async () => {
      const schema = {
        getCount: defineEndpoint('@get/count', {
          response: z.number(),
        }),
        getStatus: defineEndpoint('@get/status', {
          response: z.boolean(),
        }),
      }

      const mockFaker = vi
        .fn()
        .mockReturnValueOnce(42)
        .mockReturnValueOnce(true)
      const { app } = generateMockApi(schema, mockFaker)

      // Test number response
      const countResponse = await app.request('/count')
      expect(countResponse.status).toBe(200)
      expect(countResponse.headers.get('content-type')).toContain(
        'application/json',
      )
      const count = await countResponse.json()
      expect(count).toBe(42)

      // Test boolean response
      const statusResponse = await app.request('/status')
      expect(statusResponse.status).toBe(200)
      expect(statusResponse.headers.get('content-type')).toContain(
        'application/json',
      )
      const status = await statusResponse.json()
      expect(status).toBe(true)
    })
  })

  describe('Custom Response object handling', () => {
    it('should return custom Response object directly', async () => {
      const schema = {
        getCustom: defineEndpoint('@get/custom', {
          response: z.object({ message: z.string() }),
        }),
      }

      const customFaker = vi.fn().mockImplementation(() => {
        return new Response('Custom response body', {
          status: 201,
          headers: { 'Content-Type': 'text/custom' },
        })
      })
      schema.getCustom.defineMock({ mockFn: customFaker })

      const mockFaker = vi.fn()
      const { app } = generateMockApi(schema, mockFaker)

      const response = await app.request('/custom')

      expect(response.status).toBe(201)
      expect(response.headers.get('content-type')).toBe('text/custom')
      const text = await response.text()
      expect(text).toBe('Custom response body')
    })
  })
})
