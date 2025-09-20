# Product Overview

SchematicAPI is a TypeScript library that enables developers to define API schemas once using Zod and automatically generate both:

1. **Type-safe API client** - Fully typed client for frontend applications with request/response validation
2. **Mock server** - Hono-based development server with automatic fake data generation

## Key Benefits

- **Single Source of Truth**: Define API contracts once, use everywhere
- **Type Safety**: Full TypeScript support with inferred types from Zod schemas
- **Development Velocity**: Frontend teams can work independently with realistic mock data
- **Framework Agnostic**: Works with React, Vue, Svelte, and any frontend framework
- **Zero Configuration**: Works out of the box with sensible defaults

## Core Workflow

1. Define API schemas using Zod validation schemas
2. Generate type-safe client for frontend development
3. Run mock server for immediate testing and development
4. Replace mock server with real backend when ready
5. Keep schemas synchronized as API evolves

The library bridges the gap between frontend and backend development, enabling parallel development workflows.
