import { dev } from '$app/environment'
import { productModel } from '$lib/models/product'
import { faker } from '@faker-js/faker'
import { defineApiSchema } from 'mock-dash'
import z from 'zod'

export const productApiSchema = defineApiSchema({
  '@get/products': {
    response: z.array(productModel),
  },
})

if (dev) {
  productApiSchema.defineMock(({
    '@get/products': {
      faker: () => ({
        name: faker.commerce.productName(),
      }),
    },
  }))
}
