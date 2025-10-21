# @examples/shared

Shared models, schemas, and server code for mock-dash examples.

## Overview

This package contains reusable code shared across all example projects:

- **Models**: TypeScript types and Zod schemas for data validation
- **Schemas**: API endpoint definitions using mock-dash
- **Server**: Pre-configured mock API server

## Usage

### Installing

Add to your project's `package.json`:

```json
{
  "dependencies": {
    "@examples/shared": "workspace:*"
  }
}
```

### Importing

```typescript
// Import specific modules
import { User, Product, authSchema, server } from '@examples/shared'

// Or import everything
import * as shared from '@examples/shared'
```

### Building

```bash
pnpm build
```
