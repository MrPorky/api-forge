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

  it('generates schema from relative swagger.json', async () => {
    const jsonSpecPath = './src/tests/swagger.json'
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
    expect(contents).toMatch(/export const userModel = /)
    expect(contents).toMatch(/export const sessionModel = /)
    // Assert some endpoint definitions (camelCased)
    expect(contents).toMatch(
      /export const postSignInSocial = defineEndpoint\("@post\/sign-in\/social"/,
    )
    expect(contents).toMatch(
      /export const getGetSession = defineEndpoint\("@get\/get-session"/,
    )
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
    expect(contents).toMatch(/export const userModel = /)
    expect(contents).toMatch(/export const sessionModel = /)
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
    expect(contents).toMatch(/export const userModel = /)
    expect(contents).toMatch(/export const accountModel = /)
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
    expect(contents).toMatch(/export const userModel = /)
    expect(contents).toMatch(/export const productModel = /)

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
    expect(contents).toMatch(/export const userModel = /)
    expect(contents).toMatch(/export const productModel = /)

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
    expect(contents).toMatch(/export const userModel = /)
    expect(contents).toMatch(/export const productModel = /)

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

  it('generates schema with propertiesRequiredByDefault option', async () => {
    const jsonSpecPath = path.resolve(__dirname, 'swagger.json')

    // First, generate without the option (default behavior)
    const argsDefault = parseArgs([
      'node',
      'mock-dash',
      'generate',
      jsonSpecPath,
      '--out',
      OUTPUT_TS,
    ])
    await runSchemaGenerator(argsDefault)

    const dest = path.resolve(process.cwd(), OUTPUT_TS)
    expect(fs.existsSync(dest)).toBe(true)
    const contentsDefault = fs.readFileSync(dest, 'utf8')

    // Should have optional properties based on OpenAPI required array
    // User schema has id and image as optional (not in required array)
    expect(contentsDefault).toMatch(
      /userModel.*"id": z\.string\(\)\.optional\(\)/,
    )
    expect(contentsDefault).toMatch(
      /userModel.*"image": z\.string\(\)\.optional\(\)/,
    )
    // name, email, emailVerified should be required (in required array)
    expect(contentsDefault).toMatch(/userModel.*"name": z\.string\(\),/) // name should not have .optional()
    expect(contentsDefault).toMatch(/userModel.*"email": z\.string\(\),/) // email should not have .optional()
    expect(contentsDefault).toMatch(
      /userModel.*"emailVerified": z\.boolean\(\),/,
    ) // emailVerified should not have .optional()
    expect(contentsDefault).not.toMatch(
      /userModel.*"name": z\.string\(\)\.optional\(\)/,
    )
    expect(contentsDefault).not.toMatch(
      /userModel.*"email": z\.string\(\)\.optional\(\)/,
    )

    // Clean up for next generation
    removeOutput()

    // Now generate with propertiesRequiredByDefault option
    const argsRequired = parseArgs([
      'node',
      'mock-dash',
      'generate',
      jsonSpecPath,
      '--out',
      OUTPUT_TS,
      '--properties-required-by-default',
    ])

    await runSchemaGenerator(argsRequired)

    expect(fs.existsSync(dest)).toBe(true)
    const contentsRequired = fs.readFileSync(dest, 'utf8')

    // All properties should be required (no .optional())
    expect(contentsRequired).toMatch(/"id": z\.string\(\),/) // Should not have .optional()
    expect(contentsRequired).toMatch(/"image": z\.string\(\),/) // Should not have .optional()
    expect(contentsRequired).toMatch(/"name": z\.string\(\),/)
    expect(contentsRequired).toMatch(/"email": z\.string\(\),/)
    // Should not have .optional() anywhere in User schema for id and image
    expect(contentsRequired).not.toMatch(/"id": z\.string\(\)\.optional\(\)/)
    expect(contentsRequired).not.toMatch(/"image": z\.string\(\)\.optional\(\)/)
  })

  it('generates schema with short propertiesRequiredByDefault option (-prbd)', async () => {
    const jsonSpecPath = path.resolve(__dirname, 'swagger.json')
    const args = parseArgs([
      'node',
      'mock-dash',
      'generate',
      jsonSpecPath,
      '--out',
      OUTPUT_TS,
      '-prbd',
    ])
    await runSchemaGenerator(args)

    const dest = path.resolve(process.cwd(), OUTPUT_TS)
    expect(fs.existsSync(dest)).toBe(true)
    const contents = fs.readFileSync(dest, 'utf8')

    // All properties should be required (no .optional())
    expect(contents).toMatch(/"id": z\.string\(\)/)
    expect(contents).toMatch(/"image": z\.string\(\)/)
    expect(contents).not.toMatch(/"id": z\.string\(\)\.optional\(\)/)
    expect(contents).not.toMatch(/"image": z\.string\(\)\.optional\(\)/)
  })
})
