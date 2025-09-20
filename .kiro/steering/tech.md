# Technology Stack

## Core Dependencies

- **TypeScript** - Primary language with strict type checking enabled
- **Zod** - Schema validation and type inference for API contracts
- **Hono** - Lightweight web framework for mock server generation
- **@hono/zod-validator** - Hono middleware for Zod validation integration

## Development Tools

- **Vitest** - Testing framework with coverage reporting
- **ESLint** - Code linting with @antfu/eslint-config preset
- **pnpm** - Package manager (preferred over npm/yarn)

## Build Configuration

- **Target**: ES2022 with DOM support
- **Module System**: ESNext with bundler resolution
- **Output**: CommonJS and ESM dual package exports
- **Source Maps**: Enabled for debugging
- **Declaration Files**: Generated for TypeScript consumers

## Common Commands

```bash
# Development
pnpm dev              # Watch mode compilation
pnpm build            # Production build
pnpm prepublishOnly   # Pre-publish build hook

# Testing
pnpm test             # Run tests in watch mode
pnpm test:run         # Single test run
pnpm test:coverage    # Generate coverage reports

# Code Quality
pnpm lint             # Check code style
pnpm lint:fix         # Auto-fix linting issues
```

## Package Structure

- Dual exports (CJS/ESM) via package.json exports field
- TypeScript declaration files included
- Source maps for debugging
- Only `dist/` folder published to npm
