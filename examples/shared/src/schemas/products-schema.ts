import { faker } from '@faker-js/faker'
import { defineEndpoint } from 'mock-dash'
import z from 'zod'
import { productModel } from '../models/product'

export const getProducts = defineEndpoint('@get/products', {
  response: z.array(productModel),
})

if (process.env.NODE_ENV !== 'production') {
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
