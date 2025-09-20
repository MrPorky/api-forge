---
inclusion: fileMatch
fileMatchPattern: ['**/*.test.ts', '**/*-functional.test.ts', '**/vitest.config.ts']
---

# Testing Guidelines

## Core Testing Principles

- Use **Vitest** as the primary testing framework
- Co-locate test files with source code in `src/tests/` directory
- Follow naming conventions: `*.test.ts` for unit tests, `*-functional.test.ts` for integration tests

## Schema Testing Patterns

### API Schema Definitions

Use the core schema builders from `api-schema-types.ts`:

```typescript
import { defineApiMock, defineApiSchema, defineMockServerSchema } from './api-schema-types'
```

- `defineApiSchema` - Define API endpoint schemas with Zod validation
- `defineApiMock` - Create mock data generators for testing
- `defineMockServerSchema` - Build complete mock server configurations

### Endpoint Key Format

Follow the established convention: `@{method}/{path}`

```typescript
// Examples
'@get/users/:id'
'@post/users'
'@put/users/:id'
'@delete/users/:id'
```

## Mock Server Testing

### Hono App Testing

Prefer using Hono's built-in request testing when possible:

```typescript
// Use app.request() for testing endpoints
const response = await app.request('/users/1')
```

### Test Structure

- **Unit Tests**: Focus on individual functions and schema validation
- **Functional Tests**: Test complete request/response cycles with mock server
- **Error Scenarios**: Test all custom error types (ApiError, NetworkError, ValidationError)

## Coverage Requirements

- Maintain test coverage reports in `coverage/` directory
- Use `pnpm test:coverage` to generate coverage reports
- Ensure critical paths have adequate test coverage

## Common Test Patterns

### Schema Validation Testing

```typescript
// Test both valid and invalid inputs
expect(() => schema.parse(validData)).not.toThrow()
expect(() => schema.parse(invalidData)).toThrow(ZodError)
```

### Mock Data Generation

```typescript
// Use defineApiMock for consistent test data
const userMock = defineApiMock(userSchema, { id: 1, name: 'Test User' })
```

### Error Handling Testing

```typescript
// Test custom error classes
expect(error).toBeInstanceOf(ApiError)
expect(error.status).toBe(404)
expect(error.context).toMatchObject({ endpoint: '@get/users/:id' })
```
