import z from 'zod'
import { userModel } from './user'

export const sessionModel = z.object({
  session: z.object({
    expiersAt: z.iso.datetime(),
    token: z.string(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    ipAddress: z.string(),
    userAgent: z.string(),
    userId: z.string(),
    id: z.string(),
  }),
  user: userModel,
})

export type Session = z.infer<typeof sessionModel>
