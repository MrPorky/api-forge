import Cookies from 'js-cookie'
import { createApiClient } from 'mock-dash'
import { apiSchema } from './schema'

export const apiClient = createApiClient({
  apiSchema,
  baseURL: 'http://localhost:3000/api',
  transformRequest: (_c, config) => {
    const token = Cookies.get('auth-token')
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      }
    }
    return config
  },
  transformResponse: async (_c, response) => {
    const clonedResponse = response.clone()

    try {
      const data = await clonedResponse.json()

      // Handle auth token from login/register
      if (data && typeof data === 'object' && 'token' in data) {
        const token = (data as any).token
        if (token) {
          Cookies.set('auth-token', token, { expires: 7 }) // 7 days
        }
      }
    }
    catch {
      // Ignore JSON parsing errors - response might not be JSON
    }

    return response
  },
})

export type ApiClient = typeof apiClient
