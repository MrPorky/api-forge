import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import type { AuthContextType } from '@/hooks/use-auth'

function RootLayout() {
  return <Outlet />
}

export const Route = createRootRouteWithContext<{
  auth: AuthContextType
}>()({ component: RootLayout })
