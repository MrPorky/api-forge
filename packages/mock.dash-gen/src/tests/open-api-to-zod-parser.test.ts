import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import z from 'zod'
import { parseOpenApi } from '../open-api-to-zod-parser'

describe('open-api-to-zod-parser', () => {
  describe('parseOpenApi', () => {
    it('test', () => {
      const test = parseOpenApi(resolve(__dirname, './swagger.json'))
      const typename = typeof z.string()

      console.log(test)
    })
  })
})
