import z from 'zod'

export const productModel = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string(),
  price: z.number().min(0).max(1000),
})

export type Product = z.infer<typeof productModel>
