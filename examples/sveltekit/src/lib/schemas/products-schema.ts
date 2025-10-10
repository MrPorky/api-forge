import { productModel } from '$lib/models/product'
import { faker } from '@faker-js/faker'
import { defineEndpoint } from 'mock-dash'
import z from 'zod'

export const getProducts = defineEndpoint('@get/products', {
  response: z.array(productModel),
})

if (import.meta.env.DEV) {
  getProducts.defineMock(({
    mockFn: ({ response }) => ({
      ...response,
      name: faker.commerce.productName(),
    }),
  }))
}
