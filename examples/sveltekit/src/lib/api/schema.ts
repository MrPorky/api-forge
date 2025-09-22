import { defineApiSchema } from 'mock-dash'
import { z } from 'zod'

// User schema
const UserSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string(),
  avatar: z.string().url().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// Auth schemas
const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
})

const RegisterSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
  name: z.string().min(2),
})

const AuthResponseSchema = z.object({
  user: UserSchema,
  token: z.string(),
})

// Profile update schema
const UpdateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  avatar: z.string().url().optional(),
})

// Create API schema
export const apiSchema = defineApiSchema({
  // Auth endpoints
  '@post/auth/login': {
    input: {
      json: LoginSchema,
    },
    response: AuthResponseSchema,
  },
  '@post/auth/register': {
    input: {
      json: RegisterSchema,
    },
    response: AuthResponseSchema,
  },
  '@post/auth/logout': {
    response: z.object({ success: z.boolean() }),
  },
  '@get/auth/me': {
    response: UserSchema,
  },

  // Profile endpoints
  '@put/profile': {
    input: {
      json: UpdateProfileSchema,
    },
    response: UserSchema,
  },
  '@delete/profile': {
    response: z.object({ success: z.boolean() }),
  },
})

export type ApiSchema = typeof apiSchema
export type User = z.infer<typeof UserSchema>
export type LoginRequest = z.infer<typeof LoginSchema>
export type RegisterRequest = z.infer<typeof RegisterSchema>
export type AuthResponse = z.infer<typeof AuthResponseSchema>
