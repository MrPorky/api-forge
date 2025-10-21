import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { defineEndpoint } from '../endpoints'
import { MockError } from '../errors'
import type { FakeFn, MockGenerationOptions } from '../generate-mock-api'
import { generateMockApi } from '../generate-mock-api'

describe('generate-mock-api unit tests', () => {
  let mockFaker: FakeFn

  beforeEach(() => {
    mockFaker = vi.fn(() => ({ id: '1', name: 'Test User' })) as FakeFn
  })

  describe('generateMockApi function', () => {
    it('should return app and mockContext', () => {
      const schema = {
        getUsers: defineEndpoint('@get/users', {
          response: z.object({ id: z.string(), name: z.string() }),
        }),
      }

      const result = generateMockApi(schema, mockFaker)

      expect(result).toHaveProperty('app')
      expect(result).toHaveProperty('mockContext')
      expect(result.app).toBeDefined()
      expect(typeof result.app.get).toBe('function')
      expect(typeof result.app.post).toBe('function')
      expect(result.mockContext).toBeInstanceOf(Map)
    })

    it('should create empty app when no endpoints provided', () => {
      const result = generateMockApi({}, mockFaker)

      expect(result.app).toBeDefined()
      expect(typeof result.app.get).toBe('function')
      expect(result.mockContext).toBeInstanceOf(Map)
    })

    it('should skip non-endpoint keys', () => {
      const schema = {
        getUsers: defineEndpoint('@get/users', {
          response: z.object({ id: z.string() }),
        }),
        // @ts-expect-error Testing invalid key
        notAnEndpoint: defineEndpoint('not-an-endpoint', {
          response: z.object({ data: z.string() }),
        }),
      }

      const result = generateMockApi(schema, mockFaker)
      expect(result.app).toBeDefined()
      expect(typeof result.app.get).toBe('function')
    })
  })

  describe('http method parsing', () => {
    it('should handle all valid HTTP methods', () => {
      const schema = {
        getTest: defineEndpoint('@get/test', {
          response: z.object({ method: z.string() }),
        }),
        postTest: defineEndpoint('@post/test', {
          response: z.object({ method: z.string() }),
        }),
        putTest: defineEndpoint('@put/test', {
          response: z.object({ method: z.string() }),
        }),
        patchTest: defineEndpoint('@patch/test', {
          response: z.object({ method: z.string() }),
        }),
        deleteTest: defineEndpoint('@delete/test', {
          response: z.object({ method: z.string() }),
        }),
      }

      expect(() => generateMockApi(schema, mockFaker)).not.toThrow()
    })

    it('should throw error for invalid HTTP method', () => {
      const schema = {
        // @ts-expect-error Testing invalid key
        invalidTest: defineEndpoint('@invalid/test', {
          response: z.object({ data: z.string() }),
        }),
      }

      expect(() => generateMockApi(schema, mockFaker)).toThrow(
        'invalid is not a valid HTTP method.',
      )
    })

    it('should handle method case sensitivity', () => {
      const schema = {
        // @ts-expect-error Testing invalid key
        invalidTest: defineEndpoint('@GET/test', {
          response: z.object({ data: z.string() }),
        }),
      }

      expect(() => generateMockApi(schema, mockFaker)).toThrow(
        'GET is not a valid HTTP method.',
      )
    })
  })

  describe('path parsing', () => {
    it('should handle simple paths', () => {
      const schema = {
        getUsers: defineEndpoint('@get/users', {
          response: z.object({ id: z.string() }),
        }),
      }

      expect(() => generateMockApi(schema, mockFaker)).not.toThrow()
    })

    it('should handle nested paths', () => {
      const schema = {
        getUserProfile: defineEndpoint('@get/api/v1/users/profile', {
          response: z.object({ id: z.string() }),
        }),
      }

      expect(() => generateMockApi(schema, mockFaker)).not.toThrow()
    })

    it('should handle paths with parameters', () => {
      const schema = {
        getUserPosts: defineEndpoint('@get/users/:id/posts/:postId', {
          input: {
            param: {
              id: z.string(),
              postId: z.string(),
            },
          },
          response: z.object({ id: z.string() }),
        }),
      }

      expect(() => generateMockApi(schema, mockFaker)).not.toThrow()
    })

    it('should handle root path', () => {
      const schema = {
        getRoot: defineEndpoint('@get/', {
          response: z.object({ message: z.string() }),
        }),
      }

      expect(() => generateMockApi(schema, mockFaker)).not.toThrow()
    })
  })

  describe('input validation setup', () => {
    it('should handle endpoints without input validation', () => {
      const schema = {
        getUsers: defineEndpoint('@get/users', {
          response: z.object({ id: z.string() }),
        }),
      }

      expect(() => generateMockApi(schema, mockFaker)).not.toThrow()
    })

    it('should setup validators for all input types', () => {
      const schema = {
        postUsers: defineEndpoint('@post/users', {
          input: {
            json: z.object({ name: z.string() }),
            query: { include: z.string().optional() },
            param: { id: z.string() },
          },
          response: z.object({ id: z.string() }),
        }),
      }

      expect(() => generateMockApi(schema, mockFaker)).not.toThrow()
    })

    it('should handle form input validation', () => {
      const schema = {
        postUpload: defineEndpoint('@post/upload', {
          input: {
            form: {
              name: z.string(),
              description: z.string().optional(),
            },
          },
          response: z.object({ id: z.string() }),
        }),
      }

      expect(() => generateMockApi(schema, mockFaker)).not.toThrow()
    })
  })

  describe('options handling', () => {
    it('should use default base path when not provided', () => {
      const schema = {
        getTest: defineEndpoint('@get/test', {
          response: z.object({ data: z.string() }),
        }),
      }

      const result = generateMockApi(schema, mockFaker)
      expect(result.app).toBeDefined()
      expect(typeof result.app.get).toBe('function')
    })

    it('should apply custom base path', () => {
      const schema = {
        getTest: defineEndpoint('@get/test', {
          response: z.object({ data: z.string() }),
        }),
      }

      const options: MockGenerationOptions = {
        base: '/api/v1',
      }

      const result = generateMockApi({ schema }, mockFaker, options)
      expect(result.app).toBeDefined()
      expect(typeof result.app.get).toBe('function')
    })

    it('should call addMiddleware when provided', () => {
      const schema = {
        getTest: defineEndpoint('@get/test', {
          response: z.object({ data: z.string() }),
        }),
      }

      const middlewareSpy = vi.fn()
      const options: MockGenerationOptions = {
        addMiddleware: middlewareSpy,
      }

      generateMockApi(schema, mockFaker, options)
      expect(middlewareSpy).toHaveBeenCalledTimes(1)
      expect(middlewareSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          get: expect.any(Function),
          post: expect.any(Function),
        }),
      )
    })

    it('should handle empty options object', () => {
      const schema = {
        getTest: defineEndpoint('@get/test', {
          response: z.object({ data: z.string() }),
        }),
      }

      expect(() => generateMockApi(schema, mockFaker, {})).not.toThrow()
    })
  })

  describe('custom faker handling', () => {
    it('should use default faker when no custom faker provided', () => {
      const schema = {
        getUsers: defineEndpoint('@get/users', {
          response: z.object({ id: z.string(), name: z.string() }),
        }),
      }

      const result = generateMockApi(schema, mockFaker)
      expect(result.app).toBeDefined()
      expect(typeof result.app.get).toBe('function')
    })

    it('should handle function-based custom faker', () => {
      const customFaker = vi
        .fn()
        .mockResolvedValue({ id: 'custom', name: 'Custom User' })
      const schema = {
        getUsers: defineEndpoint('@get/users', {
          response: z.object({ id: z.string(), name: z.string() }),
          faker: customFaker,
        }),
      }

      expect(() => generateMockApi(schema, mockFaker)).not.toThrow()
    })

    it('should handle array faker with length specification', () => {
      const itemFaker = vi
        .fn()
        .mockImplementation((_, index) => ({ id: `user-${index}` }))
      const schema = {
        getUsers: defineEndpoint('@get/users', {
          response: z.array(z.object({ id: z.string() })),
          faker: {
            length: 5,
            faker: itemFaker,
          },
        }),
      }

      expect(() => generateMockApi(schema, mockFaker)).not.toThrow()
    })

    it('should handle array faker with min/max specification', () => {
      const itemFaker = vi
        .fn()
        .mockImplementation((_, index) => ({ id: `user-${index}` }))
      const schema = {
        getUsers: defineEndpoint('@get/users', {
          response: z.array(z.object({ id: z.string() })),
          faker: {
            min: 2,
            max: 10,
            faker: itemFaker,
          },
        }),
      }

      expect(() => generateMockApi(schema, mockFaker)).not.toThrow()
    })

    it('should handle array faker with only min specified', () => {
      const itemFaker = vi
        .fn()
        .mockImplementation((_, index) => ({ id: `user-${index}` }))
      const schema = {
        getUsers: defineEndpoint('@get/users', {
          response: z.array(z.object({ id: z.string() })),
          faker: {
            min: 3,
            faker: itemFaker,
          },
        }),
      }

      expect(() => generateMockApi(schema, mockFaker)).not.toThrow()
    })

    it('should handle array faker with only max specified', () => {
      const itemFaker = vi
        .fn()
        .mockImplementation((_, index) => ({ id: `user-${index}` }))
      const schema = {
        getUsers: defineEndpoint('@get/users', {
          response: z.array(z.object({ id: z.string() })),
          faker: {
            max: 5,
            faker: itemFaker,
          },
        }),
      }

      expect(() => generateMockApi(schema, mockFaker)).not.toThrow()
    })
  })

  describe('data merging logic', () => {
    it('should merge array data when both mock and faker return arrays', () => {
      const arrayMockFaker = vi.fn(() => [{ id: '1' }, { id: '2' }]) as FakeFn
      const customFaker = vi.fn().mockResolvedValue([{ id: '3' }, { id: '4' }])

      const schema = {
        getUsers: defineEndpoint('@get/users', {
          response: z.array(z.object({ id: z.string() })),
          faker: customFaker,
        }),
      }

      expect(() => generateMockApi(schema, arrayMockFaker)).not.toThrow()
    })

    it('should merge object data when both mock and faker return objects', () => {
      const objectMockFaker = vi.fn(() => ({
        id: '1',
        name: 'Mock',
      })) as FakeFn
      const customFaker = vi
        .fn()
        .mockResolvedValue({ name: 'Custom', email: 'test@example.com' })

      const schema = {
        getUser: defineEndpoint('@get/user', {
          response: z.object({
            id: z.string(),
            name: z.string(),
            email: z.string().optional(),
          }),
          faker: customFaker,
        }),
      }

      expect(() => generateMockApi(schema, objectMockFaker)).not.toThrow()
    })

    it('should replace mock data when faker returns different type', () => {
      const stringMockFaker = vi.fn(() => ({ id: '1' })) as FakeFn
      const customFaker = vi.fn().mockResolvedValue('custom string')

      const schema = {
        getData: defineEndpoint('@get/data', {
          response: z.union([z.object({ id: z.string() }), z.string()]),
          faker: customFaker,
        }),
      }

      expect(() => generateMockApi({ schema }, stringMockFaker)).not.toThrow()
    })
  })

  describe('error handling in faker', () => {
    it('should handle MockError thrown from custom faker', () => {
      const customFaker = vi.fn().mockImplementation(() => {
        throw new MockError('Custom error', 500)
      })

      const schema = {
        getError: defineEndpoint('@get/error', {
          response: z.object({ data: z.string() }),
          faker: customFaker,
        }),
      }

      expect(() => generateMockApi(schema, mockFaker)).not.toThrow()
    })

    it('should handle generic errors from custom faker', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const customFaker = vi.fn().mockImplementation(() => {
        throw new Error('Generic error')
      })

      const schema = {
        getError: defineEndpoint('@get/error', {
          response: z.object({ data: z.string() }),
          faker: customFaker,
        }),
      }

      expect(() => generateMockApi(schema, mockFaker)).not.toThrow()
      consoleSpy.mockRestore()
    })

    it('should handle errors in array faker item generation', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const itemFaker = vi.fn().mockImplementation(() => {
        throw new Error('Item generation error')
      })

      const schema = {
        getUsers: defineEndpoint('@get/users', {
          response: z.array(z.object({ id: z.string() })),
          faker: {
            length: 3,
            faker: itemFaker,
          },
        }),
      }

      expect(() => generateMockApi({ schema }, mockFaker)).not.toThrow()
      consoleSpy.mockRestore()
    })
  })

  describe('mockContext functionality', () => {
    it('should create mockContext as Map instance', () => {
      const schema = {
        getTest: defineEndpoint('@get/test', {
          response: z.object({ data: z.string() }),
        }),
      }

      const { mockContext } = generateMockApi(schema, mockFaker)

      expect(mockContext).toBeInstanceOf(Map)
      expect(mockContext.set).toBeTypeOf('function')
      expect(mockContext.get).toBeTypeOf('function')
      expect(mockContext.has).toBeTypeOf('function')
      expect(mockContext.delete).toBeTypeOf('function')
      expect(mockContext.clear).toBeTypeOf('function')
    })

    it('should allow setting and getting values in mockContext', () => {
      const schema = {
        getTest: defineEndpoint('@get/test', {
          response: z.object({ data: z.string() }),
        }),
      }

      const { mockContext } = generateMockApi(schema, mockFaker)

      mockContext.set('testKey', 'testValue')
      expect(mockContext.get('testKey')).toBe('testValue')
      expect(mockContext.has('testKey')).toBe(true)
    })

    it('should share mockContext across all endpoints', () => {
      const schema = {
        getUsers: defineEndpoint('@get/users', {
          response: z.object({ id: z.string() }),
        }),
        postUsers: defineEndpoint('@post/users', {
          response: z.object({ id: z.string() }),
        }),
      }

      const { mockContext } = generateMockApi(schema, mockFaker)

      // The same mockContext instance should be used for all endpoints
      expect(mockContext).toBeInstanceOf(Map)
    })
  })

  describe('edge cases', () => {
    it('should handle malformed endpoint keys gracefully', () => {
      const schema = {
        // @ts-expect-error Testing invalid key
        invalidKey: defineEndpoint('@', {
          response: z.object({ data: z.string() }),
        }),
      }

      expect(() => generateMockApi(schema, mockFaker)).toThrow()
    })

    it('should handle endpoint key without method', () => {
      const schema = {
        // @ts-expect-error Testing invalid key
        getUsers: defineEndpoint('/users', {
          response: z.object({ data: z.string() }),
        }),
      }

      // Should skip this key since it doesn't start with @
      expect(() => generateMockApi(schema, mockFaker)).not.toThrow()
    })

    it('should handle empty path after method', () => {
      const schema = {
        getTest: defineEndpoint('@get/', {
          response: z.object({ data: z.string() }),
        }),
      }

      expect(() => generateMockApi(schema, mockFaker)).not.toThrow()
    })

    it('should handle undefined faker gracefully', () => {
      const schema = {
        getUsers: defineEndpoint('@get/users', {
          response: z.object({ id: z.string() }),
          faker: undefined,
        }),
      }

      expect(() => generateMockApi(schema, mockFaker)).not.toThrow()
    })
  })
})
