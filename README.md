# MockDash

[![npm version](https://badge.fury.io/js/mock-dash.svg)](https://badge.fury.io/js/mock-dash)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A TypeScript library that lets you define your API schema once and get both a type-safe API client for your frontend and a Hono-based mock server for development.

## Table of Contents

- [Why MockDash?](#why-mockdash)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [API Schema Format](#api-schema-format)
- [Features](#features)
- [Development Workflow](#development-workflow)
- [Contributing](#contributing)
- [License](#license)

## Why MockDash?

- **Single Source of Truth**: Define your API schema once using Zod
- **Type-Safe Client**: Get a fully typed API client for your frontend
- **Mock Server**: Automatically generate a Hono mock server for development
- **Frontend Independence**: Work on frontend features while waiting for backend implementation
- **Zero Configuration**: Works out of the box with sensible defaults

## Installation

```bash
npm install mock-dash zod
npm install --save-dev hono
# or
pnpm add mock-dash zod
pnpm add -D hono
```

## Quick Start

### 1. Define Your Models

```ts
// src/models/user.ts
import { z } from 'zod'

export const userSchema = z.object({
  id: z.string(),
  personalNumber: z.string(),
  name: z.string(),
  givenName: z.string(),
  surname: z.string(),
})

export type User = z.infer<typeof userSchema>
```

### 2. Create API Schemas

```ts
// src/api/schemas/users.ts
import { defineApiSchema } from 'mock-dash'
import { userSchema } from '../../models/user'

export const usersSchema = defineApiSchema({
  '@get/users/:id': {
    response: userSchema,
  },
  '@get/users': {
    input: {
      query: z.object({
        page: z.string().optional(),
        limit: z.string().optional(),
      }),
    },
    response: z.array(userSchema),
  },
  '@post/users': {
    input: {
      json: z.object({
        personalNumber: z.string()
          .length(12)
          .regex(/^\d+$/),
        name: z.string(),
        givenName: z.string(),
        surname: z.string(),
      })
    },
    response: userSchema,
  },
  '@put/users/:id': {
    input: {
      json: userSchema.omit({ id: true })
    },
    response: userSchema,
  },
})
```

```ts
// src/api/schemas/index.ts
export { usersSchema } from './users'
```

### 3. Create Your API Client

```ts
// src/api/client.ts
import { createApiClient } from 'mock-dash'
import * as apiSchema from './schemas'

export const apiClient = createApiClient({
  apiSchema,
  baseURL: process.env.VITE_API_URL || 'http://localhost:3000/api'
})

// Usage in your frontend
const user = await apiClient('@get/users/:id', { params: { id: '123' } }) // Fully typed!
const users = await apiClient('@get/users', { query: { page: '1' } })

// Usage with @tanstack/query
useQuery({
  queryKey: ['session'],
  queryFn: async () => {
    const data = await apiClient('@post/auth/get-session')

    setUser(data)

    return data
  },
  retry: false, // Don't retry on 401/403 errors
  throwOnError: false,
})

useMutation({
  mutationFn: () => apiClient('@post/auth/revoke-session'),
  onSuccess: () => setUser(null),
})

// Using interceptors
const navigate = useNavigate()

useEffect(() => {
  const removeInterceptor = apiClient.interceptors.response.addInterceptor((_c, res) => {
    if (res.status === 401) {
      navigate({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }
    return res
  })

  return removeInterceptor
}, [navigate])
```

### 4. Generate Mock Server

```ts
// mock-server/index.ts
import { generateMockApi } from 'mock-dash'
import { zocker } from 'zocker'
import * as apiSchema from '../src/api/schemas'

// Optional: Define custom mocks
apiSchema.defineMock({
  '@get/users/:id': () => ({
    id: '123',
    personalNumber: '199001011234',
    name: 'John Doe',
    givenName: 'John',
    surname: 'Doe',
  })
})

// Use any Zod-compatible faker library
function generateFakeData(zodSchema) {
  // You can use zocker, @anatine/zod-mock, or any other Zod faker
  return zocker(zodSchema).generate()
}

const { app, mockContext } = generateMockApi(apiSchema, generateFakeData, {
  base: '/api',
  addMiddleware: (app) => {
    // Add CORS, auth, or other middleware
    app.use('*', async (c, next) => {
      c.header('Access-Control-Allow-Origin', '*')
      await next()
    })
  }
})

export default app
```

### 5. Run Your Mock Server

If you're using Vite, there's an awesome package called `@hono/vite-dev-server` to run the mock server at the same time as your frontend:

```ts
export default defineConfig({
  plugins: [
    devServer({
      entry: './mock-server/index.ts',
      // only run the dev server on /api routes
      exclude: [/^(?!\/api(?:\/|$)).*/],
    }),
  ],
})
```

Otherwise, check out [hono.dev](https://hono.dev/docs/getting-started/basic) or [Hono templates](https://github.com/honojs/starter/tree/main/templates) to run it your preferred way:

```ts
// mock-server/server.ts
// node example using `tsx watch mock-server/server.ts`
import { serve } from '@hono/node-server'
import app from './index'

serve({
  fetch: app.fetch,
  port: 8787,
})
```

## Project Structure

```
src/
├── models/           # Zod schemas for your data models
│   └── user.ts
├── api/
│   ├── client.ts     # Generated API client
│   └── schemas/      # API endpoint definitions
│       ├── index.ts
│       └── users.ts
mock-server/
├── index.ts          # Mock server setup
└── server.ts         # Server entry point
```

## API Schema Format

MockDash uses a simple convention for defining endpoints:

- `@{method}/{path}` - Define HTTP method and path
- `input` - Define request validation (query, params, json, form)
- `response` - Define response schema

```ts
const schema = defineApiSchema({
  '@get/users/:id': {
    response: userSchema,
  },
  '@post/users': {
    input: {
      json: createUserSchema,
    },
    response: userSchema,
  },
})
```

## Features

- **Type Safety**: Full TypeScript support with inferred types from Zod schemas
- **Single Source of Truth**: Define your API once, use everywhere
- **Request/Response Validation**: Automatic validation using Zod schemas
- **Mock Server Generation**: Instantly generate Hono-based mock servers
- **Fake Data Generation**: Automatic realistic test data using any Zod faker
- **Middleware Support**: Add authentication, CORS, logging, and custom middleware
- **Path Parameters**: Full support for dynamic routes with type safety
- **Query Parameters**: Type-safe query string handling and validation
- **Multiple Input Types**: Support for JSON, form data, query params, and headers
- **Framework Agnostic**: Works with any frontend framework (React, Vue, Svelte, etc.)
- **Development Ready**: Perfect for frontend-first development workflows

## Development Workflow

1. Define your API schema using Zod
2. Generate type-safe API client for frontend development
3. Run mock server for immediate frontend testing
4. Replace mock server with real backend when ready
5. Keep schemas in sync as API evolves

## Advanced Usage

### Custom Mock Data

You can provide custom mock implementations for specific endpoints:

```ts
const customMocks = {
  '@get/users/:id': params => ({
    id: params.id,
    personalNumber: faker.string.numeric(12),
    name: faker.person.fullName(),
    givenName: faker.person.firstName(),
    surname: faker.person.lastName(),
  }),
  '@get/users': () => Array.from({ length: 10 }, (_, i) => ({
    id: String(i + 1),
    personalNumber: faker.string.numeric(12),
    name: faker.person.fullName(),
    givenName: faker.person.firstName(),
    surname: faker.person.lastName(),
  }))
}
```

### Error Handling

The API client includes built-in error handling and validation:

```ts
try {
  const user = await apiClient('@get/users/:id', { params: { id: 'invalid' } })
}
catch (error) {
  if (error.status === 404) {
    console.log('User not found')
  }
  else if (error.status === 400) {
    console.log('Validation error:', error.body)
  }
}
```

### Interceptors

Add global request/response interceptors:

```ts
// Request interceptor
apiClient.interceptors.request.addInterceptor((config) => {
  config.headers = {
    ...config.headers,
    Authorization: `Bearer ${getToken()}`
  }
  return config
})

// Response interceptor
apiClient.interceptors.response.addInterceptor((config, response) => {
  if (response.status === 401) {
    // Handle unauthorized
    redirectToLogin()
  }
  return response
})
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/MrPorky/mock-dash.git
cd mock-dash
pnpm install
pnpm test
```

## License

MIT © [MrPorky](https://github.com/MrPorky)
