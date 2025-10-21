import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <h1>Welcome to mock-dash React example</h1>
      <p>
        Visit
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://github.com/MrPorky/mock-dash/"
        >
          mock-dash
        </a>{' '}
        to read the documentation
      </p>
    </>
  )
}
