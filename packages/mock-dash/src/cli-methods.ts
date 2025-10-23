import * as fs from 'node:fs'
import * as http from 'node:http'
import * as https from 'node:https'
import * as path from 'node:path'
import { normalizePrefix } from './endpoints'

let yaml: typeof import('yaml') | undefined

function isUrl(target: string) {
  return /^https?:\/\//i.test(target)
}

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    lib
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Request failed with status ${res.statusCode}`))
          return
        }
        const chunks: Buffer[] = []
        res.on('data', (d) => chunks.push(d))
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      })
      .on('error', reject)
  })
}

interface GenContext {
  components: Map<string, string> // component name -> schema expression
  resolving: Set<string>
  spec: any
  propertiesRequiredByDefault: boolean
}

function ensureComponent(name: string, schema: any, ctx: GenContext) {
  if (ctx.components.has(name)) return
  if (ctx.resolving.has(name)) return // prevent circular loop
  ctx.resolving.add(name)
  const expr = toZodExpr(schema, ctx)
  ctx.components.set(name, expr)
  ctx.resolving.delete(name)
}

function refName(ref: string) {
  // e.g. #/components/schemas/Activity
  const parts = ref.split('/')
  return parts[parts.length - 1]
}

function getSchemaFromRef(ref: string, ctx: GenContext) {
  const name = refName(ref)
  const target = ctx.spec?.components?.schemas?.[name]
  if (!target) return 'z.unknown()'
  ensureComponent(name, target, ctx)
  const camelCaseName = apiPathToCamelCase(name)
  return `${camelCaseName}Model`
}

function primitiveStringExpr(schema: any): string {
  let base = 'z'
  switch (schema.format) {
    case 'email':
      base += '.email()'
      break
    case 'uuid':
      base += '.uuid()'
      break
    case 'date-time':
      base += '.iso.datetime()'
      break
    case 'uri':
    case 'url':
      base += '.url()'
      break
    default:
      base += '.string()'
      break
  }
  return base
}

function toZodExpr(schema: any, ctx: GenContext): string {
  if (!schema || typeof schema !== 'object') return 'z.unknown()'
  if (schema.$ref) return getSchemaFromRef(schema.$ref, ctx)
  const nullableWrap = (expr: string) =>
    schema.nullable ? `${expr}.nullable()` : expr
  if (schema.oneOf || schema.anyOf || schema.allOf) {
    const variants = (schema.oneOf || schema.anyOf || schema.allOf) as any[]
    if (variants?.length) {
      const unionExpr = variants.map((s) => toZodExpr(s, ctx)).join(', ')
      return nullableWrap(`z.union([${unionExpr}])`)
    }
  }
  switch (schema.type) {
    case 'string':
      return nullableWrap(primitiveStringExpr(schema))
    case 'integer':
      return nullableWrap('z.number().int()')
    case 'number':
      return nullableWrap('z.number()')
    case 'boolean':
      return nullableWrap('z.boolean()')
    case 'array': {
      const itemExpr = schema.items
        ? toZodExpr(schema.items, ctx)
        : 'z.unknown()'
      return nullableWrap(`z.array(${itemExpr})`)
    }
    // case 'object':
    default: {
      const props = schema.properties || {}
      const required: string[] = schema.required || []
      const entries: string[] = []
      for (const [key, propSchema] of Object.entries<any>(props)) {
        let propExpr = toZodExpr(propSchema, ctx)
        // If propertiesRequiredByDefault is true, treat all properties as required unless explicitly marked optional
        // If propertiesRequiredByDefault is false, use the standard OpenAPI required array
        const isRequired =
          ctx.propertiesRequiredByDefault || required.includes(key)
        if (!isRequired) propExpr += '.optional()'
        entries.push(`${JSON.stringify(key)}: ${propExpr}`)
      }
      return nullableWrap(`z.object({ ${entries.join(', ')} })`)
    }
  }
}

export interface EndpointDef {
  key: string
  inputParts: { query?: string; param?: string; json?: string }
  response?: string
  prefix?: string
}

export function buildMockDashSchema(
  spec: any,
  prefixes: string[] = [],
  propertiesRequiredByDefault: boolean = false,
): {
  endpoints: EndpointDef[]
  components: Map<string, string>
} {
  if (!spec.paths || typeof spec.paths !== 'object') {
    throw new Error('No paths found in the OpenAPI specification.')
  }
  const ctx: GenContext = {
    components: new Map<string, string>(),
    resolving: new Set<string>(),
    spec,
    propertiesRequiredByDefault,
  }

  // Pre-register component schemas so that references can resolve consistently
  const compSchemas = spec.components?.schemas || {}
  for (const [name, schema] of Object.entries<any>(compSchemas)) {
    ensureComponent(name, schema, ctx)
  }

  const endpoints: EndpointDef[] = []

  for (const rawPath of Object.keys(spec.paths)) {
    const pathItem = spec.paths[rawPath]
    for (const method of Object.keys(pathItem)) {
      const endpoint = pathItem[method]

      // Check if the path starts with any of the provided prefixes
      let detectedPrefix: string | undefined
      let strippedPath = rawPath

      for (const prefix of prefixes) {
        const normalizedPrefix = normalizePrefix(prefix)
        if (rawPath.startsWith(normalizedPrefix)) {
          detectedPrefix = normalizedPrefix
          strippedPath = rawPath.slice(normalizedPrefix.length)
          // Ensure stripped path starts with /
          if (!strippedPath.startsWith('/')) {
            strippedPath = `/${strippedPath}`
          }
          break
        }
      }

      const colonPath = strippedPath.replace(/\{([^}]+)\}/g, ':$1')
      const endpointKey = `@${method.toLowerCase()}${colonPath.startsWith('/') ? colonPath : `/${colonPath}`}`
      const inputParts: EndpointDef['inputParts'] = {}

      if (Array.isArray(endpoint.parameters)) {
        const queryEntries: string[] = []
        const paramEntries: string[] = []
        for (const param of endpoint.parameters) {
          if (!param?.name || !param?.schema) continue
          // Use param schema converting to expression
          const expr = toZodExpr(param.schema, ctx)
          if (param.in === 'query') {
            queryEntries.push(
              `${JSON.stringify(param.name)}: ${param.required ? expr : `${expr}.optional()`}`,
            )
          } else if (param.in === 'path') {
            paramEntries.push(`${JSON.stringify(param.name)}: ${expr}`)
          }
        }
        if (queryEntries.length)
          inputParts.query = `{ ${queryEntries.join(', ')} }`
        if (paramEntries.length)
          inputParts.param = `{ ${paramEntries.join(', ')} }`
      }

      if (endpoint.requestBody?.content) {
        const content = endpoint.requestBody.content
        const jsonLikeKey = Object.keys(content).find((k) =>
          k.includes('application/json'),
        )
        const jsonSchema = jsonLikeKey
          ? content[jsonLikeKey]?.schema
          : undefined
        if (jsonSchema) {
          inputParts.json = toZodExpr(jsonSchema, ctx)
        }
      }

      let responseExpr: string | undefined
      if (endpoint.responses) {
        const prefStatus = ['200', '201', 'default']
        let chosen: any
        for (const code of prefStatus) {
          if (endpoint.responses[code]) {
            chosen = endpoint.responses[code]
            break
          }
        }
        if (!chosen) {
          // fallback first response
          const firstKey = Object.keys(endpoint.responses)[0]
          chosen = endpoint.responses[firstKey]
        }
        if (chosen?.content) {
          const jsonLikeKey = Object.keys(chosen.content).find((k) =>
            k.includes('application/json'),
          )
          const respSchema = jsonLikeKey
            ? chosen.content[jsonLikeKey]?.schema
            : undefined
          if (respSchema) {
            responseExpr = toZodExpr(respSchema, ctx)
          }
        }
      }

      endpoints.push({
        key: endpointKey,
        inputParts,
        response: responseExpr,
        prefix: detectedPrefix,
      })
    }
  }

  return { endpoints, components: ctx.components }
}

export async function readSpec(input: string) {
  let raw: string
  if (isUrl(input)) {
    raw = await fetchUrl(input)
  } else {
    const abs = path.resolve(process.cwd(), input)
    raw = fs.readFileSync(abs, 'utf8')
  }
  const isYaml = /\.ya?ml$/i.test(input) || /^---/.test(raw)
  let data: any
  if (isYaml) {
    yaml = yaml ?? (await import('yaml'))
    data = yaml.parse(raw)
  } else {
    data = JSON.parse(raw)
  }
  return data
}

export function apiPathToCamelCase(apiPath: string): string {
  // 1. Remove non-alphanumeric characters but keep the ones we need for separation (like / or : for params)
  // We'll replace them with spaces first to ensure proper word separation for camelCase
  const tempName = apiPath
    .replace(/@|:|\//g, ' ') // Replace @, :, and / with a space
    .trim() // Remove leading/trailing spaces

  // 2. Convert the spaced string to camelCase
  let camelCaseName = tempName
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_match, char) => {
      return char.toUpperCase()
    })

  // 3. Ensure the result is valid by removing any non-alphanumeric characters
  // that might have snuck in (though the regex above should handle most cases)
  camelCaseName = camelCaseName.replace(/[^a-zA-Z0-9]/g, '')

  return camelCaseName
}

export function emitTs(data: {
  endpoints: {
    key: string
    inputParts: any
    response?: string
    prefix?: string
  }[]
  components: Map<string, string>
}): string {
  const { endpoints, components } = data
  const compDecls = Array.from(components.entries())
    .map(([name, expr]) => {
      const camelCaseName = apiPathToCamelCase(name)
      return `export const ${camelCaseName}Model = ${expr}`
    })
    .join('\n')

  const endpointLines = endpoints
    .map((e) => {
      const inputs: string[] = []
      if (e.inputParts.query) inputs.push(`query: ${e.inputParts.query}`)
      if (e.inputParts.param) inputs.push(`param: ${e.inputParts.param}`)
      if (e.inputParts.json) inputs.push(`json: ${e.inputParts.json}`)
      const inputBlock = inputs.length
        ? `input: { ${inputs.join(', ')} }, `
        : ''
      const responseBlock = e.response
        ? `response: ${e.response}`
        : 'response: z.undefined()'

      const name = apiPathToCamelCase(e.key)

      // Add prefix option if detected
      const optionsBlock = e.prefix
        ? `, { prefix: ${JSON.stringify(e.prefix)} }`
        : ''

      return `export const ${name} = defineEndpoint(${JSON.stringify(e.key)}, { ${inputBlock}${responseBlock} }${optionsBlock})`
    })
    .join('\n\n')

  return `// Generated by mock-dash CLI
import { z } from 'zod'
import { defineEndpoint } from 'mock-dash'

${compDecls}

${endpointLines}
`
}

interface CliOptions {
  command: string | undefined
  input: string | undefined
  outFile: string
  prefixes: string[] // Prefixes to strip from paths
  propertiesRequiredByDefault: boolean // Treat schema objects without required as having all properties required.
}

export function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2)

  const ctx: CliOptions = {
    command: args[0],
    input: args[1],
    outFile: 'mock-dash-schema.ts',
    prefixes: [],
    propertiesRequiredByDefault: false,
  }

  for (let i = 2; i < args.length; i++) {
    const arg = args[i]
    if ((arg === '--out' || arg === '-o') && i + 1 < args.length) {
      ctx.outFile = args[i + 1]
      i++
    }

    if ((arg === '--prefix' || arg === '-p') && i + 1 < args.length) {
      const prefix = args[i + 1]
      ctx.prefixes.push(...prefix.split(','))
      i++
    }

    if (arg === '--properties-required-by-default' || arg === '-prbd') {
      ctx.propertiesRequiredByDefault = true
    }

    if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }
  }

  return ctx
}

export async function runSchemaGenerator({
  command,
  input,
  outFile,
  prefixes,
  propertiesRequiredByDefault,
}: CliOptions) {
  if (!command) {
    printHelp()
    process.exit(0)
  }
  if (command !== 'generate') {
    console.error(`Unknown command: ${command}`)
    printHelp()
    process.exit(1)
  }
  if (!input) {
    console.error('Missing <openapi-file-or-url> argument.')
    printHelp()
    process.exit(1)
  }
  try {
    const spec = await readSpec(input)
    const schema = buildMockDashSchema(
      spec,
      prefixes,
      propertiesRequiredByDefault,
    )
    const destPath = path.resolve(process.cwd(), outFile)
    fs.writeFileSync(destPath, emitTs(schema))
    console.log(`✔ mock-dash schema generated: ${destPath}`)
  } catch (err: any) {
    console.error('Failed to generate schema:', err.message || err)
    process.exit(1)
  }
}

function printHelp() {
  console.log(
    `mock-dash CLI

Usage:
  mock-dash generate <openapi-file-or-url> [--out <file>] [--prefix <prefix>] [--properties-required-by-default]

Options:
  --out, -o <file>                          Output file path (default: mock-dash-schema.ts)
  --prefix, -p <prefix>                     Strip prefix from OpenAPI paths and add as prefix option to defineEndpoint.
                                            Can be used multiple times or comma-separated for multiple prefixes.
  --properties-required-by-default, -prbd   Treat all object properties as required by default, regardless of the
                                            OpenAPI schema's required array.
  --help, -h                                Show this help message

Examples:
  mock-dash generate ./openapi.json
  mock-dash generate ./openapi.yaml --out api-schema.ts
  mock-dash generate https://example.com/openapi.json --prefix /api/v1
  mock-dash generate ./openapi.json --prefix /api/v1,/api/v2
  mock-dash generate ./openapi.json --properties-required-by-default
`,
  )
}
