import z from 'zod'
import { defineEndpoint } from '../endpoints'

export const getUser = defineEndpoint('@get/users/:id', {
  input: {
    param: {
      id: z.coerce.number(),
    },
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

getUser.defineMock({
  mockFn: ({ inputs }) => {
    const id = inputs.param.id.toString()
    return [{ id, name: `User ${id}` }]
  },
})
