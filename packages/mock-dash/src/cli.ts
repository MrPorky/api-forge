#!/usr/bin/env node
/*
 * mock-dash CLI
 * Usage: mock-dash generate <openapi-file-or-url> [--out <output-file>] [--format ts|json]
 *
 * Accepts local file paths or remote HTTP/HTTPS URLs pointing to an OpenAPI spec (.json or .yaml/.yml).
 * Generates a mock-dash compatible schema object file you can import.
 */
import { parseArgs, runSchemaGenerator } from './cli-methods'

async function main() {
  const cliArguments = parseArgs(process.argv)
  console.info('Running mock-dash schema generator...')
  await runSchemaGenerator(cliArguments)
}

// Ensure zod peer dep is present before running (user must install zod as peer)
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('zod')
} catch {
  console.error(
    'zod is required as a peer dependency. Please install it: npm install zod',
  )
  process.exit(1)
}

// Run the CLI
void main()
