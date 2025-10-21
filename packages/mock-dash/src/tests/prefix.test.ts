import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { createApiClient } from '../create-api-client'
import { defineEndpoint } from '../endpoints'

// Mock fetch
globalThis.fetch = vi.fn()

describe('endpoint prefix option', () => {
  const mockFetch = fetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('applies prefix to request URL but not to key', async () => {
    const userEndpoint = defineEndpoint(
      '@get/users/:id',
      {
        input: { param: { id: z.string() } },
        response: z.object({ id: z.string(), name: z.string() }),
      },
      { prefix: '/api/v1' },
    )

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: '123', name: 'Alice' }),
    } as Response)

    const client = createApiClient({
      apiSchema: { userEndpoint },
      baseURL: 'https://example.com',
    })

    const result = await client('@get/users/:id', { param: { id: '123' } })

    expect(result).toEqual({ id: '123', name: 'Alice' })
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/api/v1/users/123',
      expect.objectContaining({ method: 'get' }),
    )
  })

  it('normalizes prefix (no duplicate slashes)', async () => {
    const endpoint = defineEndpoint(
      '@get/items',
      { response: z.array(z.object({ id: z.string() })) },
      { prefix: '///api///v1//' },
    )

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [{ id: '1' }],
    } as Response)

    const client = createApiClient({
      apiSchema: { endpoint },
      baseURL: 'https://example.com',
    })

    await client('@get/items')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/api/v1/items',
      expect.any(Object),
    )
  })
})
