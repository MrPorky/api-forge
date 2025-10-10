import z from 'zod'
import { defineEndpoint } from '../endpoints'

export const getUser = defineEndpoint('@get/users', {
  input: {
    query: {
      page: z.string().optional(),
      limit: z.string().optional(),
    },
  },
  response: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })),
})
