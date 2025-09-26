import type { AuthContextType } from '@/hooks/use-auth'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'

function RootLayout() {
  return (
    <Outlet />
  )
}

export const Route = createRootRouteWithContext<{
  auth: AuthContextType
}>()({ component: RootLayout })
