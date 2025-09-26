import { defineApiSchema } from 'mock-dash'
import { authApiSchema } from './auth-schema'
import { productApiSchema } from './products-schema'

export const apiSchema = defineApiSchema({
  ...authApiSchema,
  ...productApiSchema,
})
