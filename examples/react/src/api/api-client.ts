import { createApiClient } from 'mock-dash'
import * as apiSchema from './schemas'

export const apiClient = createApiClient({
  apiSchema,
  baseURL: '/api',
})
