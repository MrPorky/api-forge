import server from '@examples/shared/server'
import type { RequestHandler } from '@sveltejs/kit'

export const GET: RequestHandler = ({ request }) => server.fetch(request)
export const POST: RequestHandler = ({ request }) => server.fetch(request)
