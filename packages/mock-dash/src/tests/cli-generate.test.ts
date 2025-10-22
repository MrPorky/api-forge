import * as fs from 'node:fs'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseArgs, runSchemaGenerator } from '../cli-methods'

const OUTPUT_TS = 'mock-dash-schema.test-gen.ts'

function removeOutput() {
  const dest = path.resolve(process.cwd(), OUTPUT_TS)
  if (fs.existsSync(dest)) fs.unlinkSync(dest)
}

describe('runSchemaGenerator CLI integration', () => {
  beforeEach(() => {
    removeOutput()
  })

  afterEach(() => {
    removeOutput()
  })

  it('generates schema from swagger.json', async () => {
    const jsonSpecPath = path.resolve(__dirname, 'swagger.json')
    const args = parseArgs([
      'node',
      'mock-dash',
      'generate',
      jsonSpecPath,
      '--out',
      OUTPUT_TS,
    ])
    await runSchemaGenerator(args)

    const dest = path.resolve(process.cwd(), OUTPUT_TS)
    expect(fs.existsSync(dest)).toBe(true)
    const contents = fs.readFileSync(dest, 'utf8')
    // Assert component schemas are exported
    expect(contents).toMatch(/export const UserSchema = /)
    expect(contents).toMatch(/export const SessionSchema = /)
    // Assert some endpoint definitions (camelCased)
    expect(contents).toMatch(
      /export const postSignInSocial = defineEndpoint\("@post\/sign-in\/social"/,
    )
    expect(contents).toMatch(
      /export const getGetSession = defineEndpoint\("@get\/get-session"/,
    )
  })

  it('generates schema from swagger.yaml', async () => {
    const yamlSpecPath = path.resolve(__dirname, 'swagger.yaml')
    const args = parseArgs([
      'node',
      'mock-dash',
      'generate',
      yamlSpecPath,
      '--out',
      OUTPUT_TS,
    ])
    await runSchemaGenerator(args)

    const dest = path.resolve(process.cwd(), OUTPUT_TS)
    expect(fs.existsSync(dest)).toBe(true)
    const contents = fs.readFileSync(dest, 'utf8')
    // Assert component schemas are exported
    expect(contents).toMatch(/export const UserSchema = /)
    expect(contents).toMatch(/export const AccountSchema = /)
    // Assert an endpoint definition from yaml
    expect(contents).toMatch(
      /export const postSignUpEmail = defineEndpoint\("@post\/sign-up\/email"/,
    )
  })

  it('generates schema with comma-separated prefixes', async () => {
    const jsonSpecPath = path.resolve(__dirname, 'swagger-prefixed.json')
    const args = parseArgs([
      'node',
      'mock-dash',
      'generate',
      jsonSpecPath,
      '--out',
      OUTPUT_TS,
      '--prefix',
      '/api/v1,/api/v2',
    ])
    await runSchemaGenerator(args)

    const dest = path.resolve(process.cwd(), OUTPUT_TS)
    expect(fs.existsSync(dest)).toBe(true)
    const contents = fs.readFileSync(dest, 'utf8')

    // Assert component schemas are exported
    expect(contents).toMatch(/export const UserSchema = /)
    expect(contents).toMatch(/export const ProductSchema = /)

    // Assert endpoints with stripped prefixes and prefix options
    expect(contents).toMatch(
      /export const getUsers = defineEndpoint\("@get\/users", .+, \{ prefix: "\/api\/v1" \}\)/,
    )
    expect(contents).toMatch(
      /export const getUsersId = defineEndpoint\("@get\/users\/:id", .+, \{ prefix: "\/api\/v1" \}\)/,
    )
    expect(contents).toMatch(
      /export const getProducts = defineEndpoint\("@get\/products", .+, \{ prefix: "\/api\/v2" \}\)/,
    )
    expect(contents).toMatch(
      /export const getProductsId = defineEndpoint\("@get\/products\/:id", .+, \{ prefix: "\/api\/v2" \}\)/,
    )

    // Assert endpoint without prefix remains unchanged (no prefix option)
    expect(contents).toMatch(
      /export const getHealth = defineEndpoint\("@get\/health", .+\)$/m,
    )
    expect(contents).not.toMatch(/getHealth.*prefix/)
  })

  it('generates schema with multiple prefix arguments', async () => {
    const jsonSpecPath = path.resolve(__dirname, 'swagger-prefixed.json')
    const args = parseArgs([
      'node',
      'mock-dash',
      'generate',
      jsonSpecPath,
      '--out',
      OUTPUT_TS,
      '--prefix',
      '/api/v1',
      '--prefix',
      '/api/v2',
    ])
    await runSchemaGenerator(args)

    const dest = path.resolve(process.cwd(), OUTPUT_TS)
    expect(fs.existsSync(dest)).toBe(true)
    const contents = fs.readFileSync(dest, 'utf8')

    // Assert component schemas are exported
    expect(contents).toMatch(/export const UserSchema = /)
    expect(contents).toMatch(/export const ProductSchema = /)

    // Assert endpoints with stripped prefixes and prefix options
    expect(contents).toMatch(
      /export const getUsers = defineEndpoint\("@get\/users", .+, \{ prefix: "\/api\/v1" \}\)/,
    )
    expect(contents).toMatch(
      /export const getUsersId = defineEndpoint\("@get\/users\/:id", .+, \{ prefix: "\/api\/v1" \}\)/,
    )
    expect(contents).toMatch(
      /export const getProducts = defineEndpoint\("@get\/products", .+, \{ prefix: "\/api\/v2" \}\)/,
    )
    expect(contents).toMatch(
      /export const getProductsId = defineEndpoint\("@get\/products\/:id", .+, \{ prefix: "\/api\/v2" \}\)/,
    )

    // Assert endpoint without prefix remains unchanged (no prefix option)
    expect(contents).toMatch(
      /export const getHealth = defineEndpoint\("@get\/health", .+\)$/m,
    )
    expect(contents).not.toMatch(/getHealth.*prefix/)
  })

  it('generates schema with short prefix arguments (-p)', async () => {
    const jsonSpecPath = path.resolve(__dirname, 'swagger-prefixed.json')
    const args = parseArgs([
      'node',
      'mock-dash',
      'generate',
      jsonSpecPath,
      '--out',
      OUTPUT_TS,
      '-p',
      '/api/v1',
      '-p',
      '/api/v2',
    ])
    await runSchemaGenerator(args)

    const dest = path.resolve(process.cwd(), OUTPUT_TS)
    expect(fs.existsSync(dest)).toBe(true)
    const contents = fs.readFileSync(dest, 'utf8')

    // Assert component schemas are exported
    expect(contents).toMatch(/export const UserSchema = /)
    expect(contents).toMatch(/export const ProductSchema = /)

    // Assert endpoints with stripped prefixes and prefix options
    expect(contents).toMatch(
      /export const getUsers = defineEndpoint\("@get\/users", .+, \{ prefix: "\/api\/v1" \}\)/,
    )
    expect(contents).toMatch(
      /export const getProducts = defineEndpoint\("@get\/products", .+, \{ prefix: "\/api\/v2" \}\)/,
    )

    // Assert endpoint without prefix remains unchanged
    expect(contents).toMatch(
      /export const getHealth = defineEndpoint\("@get\/health", .+\)$/m,
    )
  })

  it('generates schema with mixed comma-separated and multiple prefix arguments', async () => {
    const jsonSpecPath = path.resolve(__dirname, 'swagger-prefixed.json')
    const args = parseArgs([
      'node',
      'mock-dash',
      'generate',
      jsonSpecPath,
      '--out',
      OUTPUT_TS,
      '--prefix',
      '/api/v1',
      '-p',
      '/api/v2,/health',
    ])
    await runSchemaGenerator(args)

    const dest = path.resolve(process.cwd(), OUTPUT_TS)
    expect(fs.existsSync(dest)).toBe(true)
    const contents = fs.readFileSync(dest, 'utf8')

    // Assert all endpoints now have prefix options since /health is also a prefix
    expect(contents).toMatch(
      /export const getUsers = defineEndpoint\("@get\/users", .+, \{ prefix: "\/api\/v1" \}\)/,
    )
    expect(contents).toMatch(
      /export const getProducts = defineEndpoint\("@get\/products", .+, \{ prefix: "\/api\/v2" \}\)/,
    )
    expect(contents).toMatch(
      /export const get = defineEndpoint\("@get\/", .+, \{ prefix: "\/health" \}\)/,
    )
  })
})
