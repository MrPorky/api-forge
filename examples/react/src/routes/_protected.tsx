import { createFileRoute, Link, Outlet, redirect } from '@tanstack/react-router'
import favicon from '../../public/vite.svg?url'
import styles from './_protected.module.css'

export const Route = createFileRoute('/_protected')({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: '/signin',
        search: {
          redirect: location.href,
        },
      })
    }
  },
})

function RouteComponent() {
  return (
    <>
      <header className={styles.header}>
        <div className="container">
          <nav>
            <Link to="/">
              <img className={styles.logo} src={favicon} alt="svelte logo" />
            </Link>
            <ul>
              <li><Link className="contrast" to="/products">Products</Link></li>
            </ul>
          </nav>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </>
  )
}
