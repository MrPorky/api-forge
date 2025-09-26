import { productModel } from '$lib/models/product'
import { defineApiSchema } from 'mock-dash'
import z from 'zod'

export const productApiSchema = defineApiSchema({
  '@get/products': {
    response: z.array(productModel),
  },
})
