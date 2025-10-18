import { dev } from '$app/environment'
import { productModel } from '$lib/models/product'
import { faker } from '@faker-js/faker'
import { defineEndpoint } from 'mock-dash'
import z from 'zod'

export const getProducts = defineEndpoint('@get/products', {
  response: z.array(productModel),
})

if (dev) {
  getProducts.defineMock(({
    mockFn: {
      length: 5,
      faker: () => ({
        id: faker.string.uuid(),
        name: faker.commerce.productName(),
        price: Number(faker.commerce.price()),
        description: faker.commerce.productDescription(),
      }),
    },
  }))
}
