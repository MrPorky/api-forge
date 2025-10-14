import { faker } from '@faker-js/faker'
import { defineEndpoint } from 'mock-dash'
import z from 'zod'
import { productModel } from '@/models/product'

export const getProducts = defineEndpoint('@get/products', {
  response: z.array(productModel),
})

if (import.meta.env.DEV) {
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
