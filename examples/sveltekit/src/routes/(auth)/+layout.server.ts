import type { ServerLoad } from '@sveltejs/kit'
import { redirect } from '@sveltejs/kit'

export const load: ServerLoad = ({ url, locals }) => {
  const redirectPath = url.searchParams.get('redirect') ?? '/'

  if (locals.user) return redirect(308, redirectPath)

  return {
    redirect: redirectPath,
  }
}
