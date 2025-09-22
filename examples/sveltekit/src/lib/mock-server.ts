import type { z } from 'zod'
import { defineMockServerSchema, generateMockApi } from 'mock-dash'
import { zocker } from 'zocker'
import { apiSchema } from './api/schema'

function generateFakeData(zodSchema: z.ZodType) {
  return zocker(zodSchema).generate()
}

defineMockServerSchema(apiSchema, {
})

const { app } = generateMockApi(apiSchema, generateFakeData, {
  base: '/api',
})

export { app }
