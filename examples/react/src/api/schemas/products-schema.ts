import { faker } from '@faker-js/faker'
import { defineApiSchema } from 'mock-dash'
import z from 'zod'
import { productModel } from '@/models/product'

export const productApiSchema = defineApiSchema({
  '@get/products': {
    response: z.array(productModel),
  },
})

if (import.meta.env.DEV) {
  productApiSchema.defineMock(({
    '@get/products': {
      faker: () => ({
        name: faker.commerce.productName(),
      }),
    },
  }))
}
