import devServer from '@hono/vite-dev-server'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tsconfigPaths(),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    devServer({
      entry: './server/index.ts',
      exclude: [/^(?!\/api(?:\/|$)).*/],
    }),
  ],
})
