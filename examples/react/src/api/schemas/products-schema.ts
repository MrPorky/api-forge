import { defineApiSchema } from 'mock-dash'
import z from 'zod'
import { productModel } from '@/models/product'

export const productApiSchema = defineApiSchema({
  '@get/products': {
    response: z.array(productModel),
  },
})
