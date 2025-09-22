import type z from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { defineMockServerSchema, generateMockApi, MockError } from 'mock-dash'
import { zocker } from 'zocker'
import { apiSchema } from './api/schema'

// In-memory user store (for demo purposes)
const users = new Map<string, any>()
const JWT_SECRET = 'demo-secret-key'

// Helper to generate user ID
const generateId = () => Math.random().toString(36).substring(2, 9)

// Helper to create JWT token
function createToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}

// Helper to verify JWT token
function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string }
  }
  catch {
    return null
  }
}

// Helper to get user from auth header
function getUserFromAuth(authHeader?: string) {
  if (!authHeader?.startsWith('Bearer '))
    return null
  const token = authHeader.slice(7)
  const payload = verifyToken(token)
  return payload ? users.get(payload.userId) : null
}

function generateFakeData(zodSchema: z.ZodType) {
  return zocker(zodSchema).generate()
}

defineMockServerSchema(apiSchema, {
  '@post/auth/login': async ({ inputs }) => {
    const { email, password } = inputs.json

    // Find user by email
    const user = Array.from(users.values()).find(u => u.email === email)
    if (!user) {
      throw new MockError('Invalid credentials', 401)
    }

    // Check password
    const isValid = await bcrypt.compare(password, user.hashedPassword)
    if (!isValid) {
      throw new MockError('Invalid credentials', 401)
    }

    const token = createToken(user.id)
    const { hashedPassword, ...userWithoutPassword } = user

    return {
      user: userWithoutPassword,
      token,
    }
  },
  '@post/auth/register': async ({ inputs }) => {
    const { email, password, name } = inputs.json

    // Check if user exists
    const existingUser = Array.from(users.values()).find(u => u.email === email)
    if (existingUser) {
      throw new MockError('User already exists', 400)
    }

    // Create new user
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = {
      id: generateId(),
      email,
      name,
      hashedPassword,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    users.set(user.id, user)
    const token = createToken(user.id)
    const { hashedPassword: _, ...userWithoutPassword } = user

    return ({
      user: userWithoutPassword,
      token,
    })
  },

  '@post/auth/logout': async () => {
    // In a real app, you'd invalidate the token
    return ({ success: true })
  },

  '@get/auth/me': async ({ honoContext }) => {
    const user = getUserFromAuth(honoContext.req.header('Authorization'))
    if (!user) {
      throw new MockError('Unauthorized', 401)
    }

    const { hashedPassword, ...userWithoutPassword } = user
    return (userWithoutPassword)
  },

  '@put/profile': async ({ honoContext }) => {
    const user = getUserFromAuth(honoContext.req.header('Authorization'))
    if (!user) {
      throw new MockError('Unauthorized', 401)
    }

    const updates = await honoContext.req.json()
    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    users.set(user.id, updatedUser)
    const { hashedPassword, ...userWithoutPassword } = updatedUser
    return (userWithoutPassword)
  },
  '@delete/profile': async ({ honoContext }) => {
    const user = getUserFromAuth(honoContext.req.header('Authorization'))
    if (!user) {
      throw new MockError('Unauthorized', 401)
    }

    users.delete(user.id)
    return ({ success: true })
  },
})

const { app } = generateMockApi(apiSchema, generateFakeData, {
  base: '/api',
})

export { app }
