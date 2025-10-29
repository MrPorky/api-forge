import z from 'zod'

export const httpMethodSchema = z.enum([
  'get',
  'post',
  'patch',
  'put',
  'delete',
])
export type HttpMethod = z.infer<typeof httpMethodSchema>
