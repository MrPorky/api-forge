import type { ServerLoad } from '@sveltejs/kit'
import { apiClient } from '$lib/api-client'

export const load: ServerLoad = async ({ fetch }) => {
  apiClient.overrides.fetch = fetch
  const products = await apiClient('@get/products')

  return {
    products,
  }
}
