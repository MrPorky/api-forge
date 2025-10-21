import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { defineEndpoint } from '../endpoints'

describe('api-schema-types', () => {
  describe('endpoint definitions (direct)', () => {
    it('should define a basic endpoint schema', () => {
      const schema = {
        getUsers: defineEndpoint('@get/users', {
          response: z.array(z.object({ id: z.string(), name: z.string() })),
        }),
      }

      expect(schema.getUsers.getEndpoint().response).toBeDefined()
    })

    it('should define schema with input validation', () => {
      const schema = {
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
      }

      const endpoint = schema.postUsers.getEndpoint()
      expect(endpoint.input?.json).toBeDefined()
    })

    it('should handle path parameters in endpoint keys', () => {
      const schema = {
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

      const endpoint = schema.getUser.getEndpoint()
      expect(endpoint.input?.param).toBeDefined()
    })
  })

  describe('mock definitions (direct)', () => {
    it('should create mock data generators', () => {
      const schema = {
        getUsers: defineEndpoint('@get/users', {
          response: z.array(z.object({ id: z.string(), name: z.string() })),
        }),
      }

      const mockFn = vi.fn(() => [{ id: '1', name: 'Test User' }])
      schema.getUsers.defineMock({ mockFn })
      expect(schema.getUsers.getEndpoint().response).toBeDefined()
      expect(typeof mockFn).toBe('function')
    })
  })
})
