import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { defineApiMock, defineApiSchema, defineMockServerSchema } from '../api-schema-types'

describe('api-schema-types', () => {
  describe('defineApiSchema', () => {
    it('should define a basic API schema', () => {
      const schema = defineApiSchema({
        '@get/users': {
          response: z.array(z.object({
            id: z.string(),
            name: z.string(),
          })),
        },
      })

      expect(schema).toBeDefined()
      expect(schema['@get/users']).toBeDefined()
      expect(schema['@get/users'].response).toBeDefined()
    })

    it('should define schema with input validation', () => {
      const schema = defineApiSchema({
        '@post/users': {
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
        },
      })

      expect(schema['@post/users'].input).toBeDefined()
      expect(schema['@post/users'].input?.json).toBeDefined()
    })

    it('should handle path parameters in endpoint keys', () => {
      const schema = defineApiSchema({
        '@get/users/:id': {
          input: {
            param: z.object({
              id: z.string(),
            }),
          },
          response: z.object({
            id: z.string(),
            name: z.string(),
          }),
        },
      })

      expect(schema['@get/users/:id']).toBeDefined()
      expect(schema['@get/users/:id'].input?.param).toBeDefined()
    })
  })

  describe('defineApiMock', () => {
    it('should create mock data generators', () => {
      const schema = defineApiSchema({
        '@get/users': {
          response: z.array(z.object({
            id: z.string(),
            name: z.string(),
          })),
        },
      })

      const mockData = defineApiMock(schema, {
        '@get/users': () => [{ id: '1', name: 'Test User' }],
      })

      expect(mockData).toBeDefined()
      expect(mockData['@get/users']).toBeTypeOf('function')
    })
  })

  describe('defineMockServerSchema', () => {
    it('should define mock server schema with faker', () => {
      const schema = defineApiSchema({
        '@get/users': {
          response: z.array(z.object({
            id: z.string(),
            name: z.string(),
          })),
        },
      })

      const mockSchema = defineMockServerSchema(schema, {
        '@get/users': () => [{ id: '1', name: 'Test User' }],
      })

      expect(mockSchema).toBeDefined()
      expect(mockSchema['@get/users'].faker).toBeDefined()
    })
  })
})
