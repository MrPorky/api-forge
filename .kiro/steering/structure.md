# Project Structure

## Source Organization

```
src/
├── index.ts                    # Main library exports
├── api-schema-types.ts         # Core type definitions and schema builders
├── create-api-client.ts        # Type-safe API client implementation
├── generate-mock-api.ts        # Mock server generation logic
├── client-errors.ts            # Custom error classes (ApiError, NetworkError, ValidationError)
├── request-utils.ts            # HTTP request utilities (query params, form data)
├── type-utils.ts               # TypeScript utility types
└── tests/                      # Test files co-located with source
    ├── *.test.ts               # Unit tests for each module
    └── *-functional.test.ts    # Integration/functional tests
```

## Key Architectural Patterns

### Schema-First Design

- All API contracts defined using Zod schemas
- Single source of truth for request/response validation
- Type inference drives client and server generation

### Endpoint Key Convention

- Format: `@{method}/{path}` (e.g., `@get/users/:id`)
- HTTP method prefix with @ symbol
- Path parameters supported with `:param` syntax

### Error Handling Strategy

- Custom error classes for different failure modes:
  - `ApiError` - HTTP response errors
  - `NetworkError` - Connection/timeout failures
  - `ValidationError` - Schema validation failures
- Structured error context with request details

### Interceptor Pattern

- Request/response interceptors for cross-cutting concerns
- Functional approach with cleanup callbacks
- Type-safe interceptor context

## File Naming Conventions

- **kebab-case** for file names
- **PascalCase** for classes and types
- **camelCase** for functions and variables
- Test files use `.test.ts` suffix
- Functional tests use `-functional.test.ts` suffix

## Import/Export Patterns

- Barrel exports from `index.ts`
- Named exports preferred over default exports
- Type-only imports where applicable (`import type`)
- Explicit re-exports for public API surface
