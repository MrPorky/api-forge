import z from 'zod'
import { defineApiSchema } from '../api-schema-types'

export const schema = defineApiSchema({
  '@get/users': {
    input: {
      query: z.object({
        page: z.string().optional(),
        limit: z.string().optional(),
      }),
    },
    response: z.array(z.object({
      id: z.string(),
      name: z.string(),
    })),
  },
})
