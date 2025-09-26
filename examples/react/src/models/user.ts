import z from 'zod'

export const userModel = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string(),
  image: z.url().optional(),
  emailVerified: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export type User = z.infer<typeof userModel>
