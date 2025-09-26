import type { ServerLoad } from '@sveltejs/kit'
import { redirect } from '@sveltejs/kit'

export const load: ServerLoad = ({ url, locals }) => {
  const redirectPath = url.href.split(url.host)[1]

  if (!locals.user)
    return redirect(308, `/signin?redirect=${redirectPath}`)

  return {
    user: locals.user.user,
  }
}
