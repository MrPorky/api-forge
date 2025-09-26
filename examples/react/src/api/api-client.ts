import { createApiClient } from 'mock-dash'
import { apiSchema } from './schemas'

export const apiClient = createApiClient({
  apiSchema,
  baseURL: '/api',
})
