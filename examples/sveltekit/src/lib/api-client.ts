import * as apiSchema from '@examples/shared'
import { createApiClient } from 'mock-dash'

export const apiClient = createApiClient({
  apiSchema,
  baseURL: '/api',
})
