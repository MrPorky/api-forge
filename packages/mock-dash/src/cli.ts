#!/usr/bin/env node

import { parseArgs, runSchemaGenerator } from './cli-methods'

async function main() {
  const cliArguments = parseArgs(process.argv)
  await runSchemaGenerator(cliArguments)
}

// Ensure zod peer dep is present before running (user must install zod as peer)
try {
  require('zod')
} catch {
  console.error(
    'zod is required as a peer dependency. Please install it: npm install zod',
  )
  process.exit(1)
}

// Run the CLI
void main()
