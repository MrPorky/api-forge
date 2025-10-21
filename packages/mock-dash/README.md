<div align="center">

# MockDash

**A TypeScript library that lets you define your API schema once and get both a type-safe API client for your frontend and a Hono-based mock server for development.**

[![npm version](https://badge.fury.io/js/mock-dash.svg)](https://badge.fury.io/js/mock-dash)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

## Table of Contents

- [Why MockDash?](#why-mockdash)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [API Endpoint Format](#api-endpoint-format)
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

MockDash has minimal dependencies:
- **zod** (peer dependency) - For schema validation and type inference
- **hono** (dev dependency) - For mock server generation
- **@hono/zod-validator** - Built-in for request validation

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

### 2. Create API Endpoints

```ts
// src/api/schemas/users.ts
import { defineEndpoint } from 'mock-dash'
import { z } from 'zod'
import { userSchema } from '../../models/user'

export const getUserById = defineEndpoint('@get/users/:id', {
  response: userSchema,
})

export const getUsers = defineEndpoint('@get/users', {
  input: {
    query: z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
    }),
  },
  response: z.array(userSchema),
})

export const createUser = defineEndpoint('@post/users', {
  input: {
    json: z.object({
      personalNumber: z.string()
        .length(12)
        .regex(/^\d+$/),
      name: z.string(),
      givenName: z.string(),
      surname: z.string(),
    }),
  },
  response: userSchema,
})

export const updateUser = defineEndpoint('@put/users/:id', {
  input: {
    json: userSchema.omit({ id: true }),
  },
  response: userSchema,
})
```

```ts
// src/api/schemas/index.ts
export * from './users'
```


### Plain Text & Void Responses

While most endpoints return JSON objects/arrays, MockDash also supports endpoints that return plain text (e.g. health checks, version strings) or no content at all (204 responses). The client automatically decides how to read the body based on the response schema you provide:

Behavior:

- If the endpoint's `response` is `z.string()` (including any formatted string like `z.email()`, `z.uuid()`, etc.), the client reads the body using `response.text()` and validates it with Zod.
- If the endpoint's `response` is `z.void()`, the client does not attempt to parse a body (useful for 204 No Content / empty responses) and returns `undefined`.
- For all other Zod schemas (objects, arrays, numbers, booleans, unions, etc.) the client parses the body as JSON and then validates it.

Examples:

```ts
import { defineEndpoint } from 'mock-dash'
import { z } from 'zod'

// Plain text response (e.g. GET /version -> '1.2.3')
export const getVersion = defineEndpoint('@get/version', {
  response: z.string(),
})

// Email-formatted string response (parsed as text, still validated)
export const getContactEmail = defineEndpoint('@get/support/email', {
  response: z.email(),
})

// Void / empty response (e.g. 204 on successful logout)
export const logout = defineEndpoint('@post/auth/logout', {
  response: z.void(),
})

// Standard JSON response still works the same
export const getUser = defineEndpoint('@get/users/:id', {
  response: z.object({ id: z.string(), name: z.string() }),
})
```

Usage in the client:

```ts
const version = await apiClient('@get/version')        // type: string
const email = await apiClient('@get/support/email')    // type: string
await apiClient('@post/auth/logout')                   // type: void (undefined)
const user = await apiClient('@get/users/:id', { param: { id: '123' } })
```

Notes:

- If a string endpoint actually returns JSON (e.g. '"value"'), it will not be parsed; you'll receive the raw text. Use a JSON schema (e.g. `z.object(...)`) if you expect JSON.
- For numeric / boolean primitives, define a JSON shape (e.g. `{ value: z.number() }`) if the server returns JSON, or wrap the primitive in a string endpoint if the server returns raw text and you want to parse it yourself.
- A `z.never()` response is not supported (it will always fail validation) and typically indicates a design issue.
- **Single Source of Truth**: Define your API schema once using Zod
- **Type-Safe Client**: Get a fully typed API client for your frontend
- **Mock Server**: Automatically generate a Hono mock server for development
- **Frontend Independence**: Work on frontend features while waiting for backend implementation
- **Zero Configuration**: Works out of the box with sensible defaults


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
const user = await apiClient('@get/users/:id', { param: { id: '123' } }) // Fully typed!
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
apiSchema.getUserById.defineMock({
  mockFn: () => ({
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
│   ├── index.ts
│   ├── user.ts
│   └── product.ts
├── api/
│   ├── client.ts     # API client instance
│   └── schemas/      # API endpoint definitions
│       ├── index.ts
│       ├── users.ts
│       └── products.ts
mock-server/
├── index.ts          # Mock server setup
└── server.ts         # Server entry point (optional)
```

## API Endpoint Format

MockDash uses a simple convention for defining endpoints:

- `@{method}/{path}` - Define HTTP method and path
- `input` - Define request validation (query, param, json, form)
- `response` - Define response schema

```ts
const getUserById = defineEndpoint('@get/users/:id', {
  response: userSchema,
})

const createUser = defineEndpoint('@post/users', {
  input: {
    json: createUserSchema,
  },
  response: userSchema,
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

1. Define your data models using Zod schemas
2. Create API endpoints with `defineEndpoint` for each route
3. Generate type-safe API client for frontend development
4. Add custom mocks with `defineMock` for realistic test data
5. Run mock server for immediate frontend testing
6. Replace mock server with real backend when ready
7. Keep endpoint definitions in sync as API evolves

## Advanced Usage

### Custom Mock Data

You can provide custom mock implementations for specific endpoints:

```ts
import { faker } from '@faker-js/faker'

// Custom mock with parameters
getUserById.defineMock({
  mockFn: ({ inputs }) => ({
    id: inputs.param.id,
    personalNumber: faker.string.numeric(12),
    name: faker.person.fullName(),
    givenName: faker.person.firstName(),
    surname: faker.person.lastName(),
  })
})

// Custom mock with faker shorthand
getUsers.defineMock({
  mockFn: {
    length: 10,
    faker: () => ({
      id: faker.string.uuid(),
      personalNumber: faker.string.numeric(12),
      name: faker.person.fullName(),
      givenName: faker.person.firstName(),
      surname: faker.person.lastName(),
    })
  }
})
```

### Error Handling

The API client includes built-in error handling and validation:

```ts
try {
  const user = await apiClient('@get/users/:id', { param: { id: 'invalid' } })
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
