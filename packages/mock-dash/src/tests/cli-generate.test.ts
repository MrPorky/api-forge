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
    // removeOutput()
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
})
