import type { RequestHandler } from '@sveltejs/kit'
import server from '@examples/shared/server'

export const GET: RequestHandler = ({ request }) => server.fetch(request)
export const POST: RequestHandler = ({ request }) => server.fetch(request)
