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

export const createUser = defineEndpoint('@post/users', {
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
})
