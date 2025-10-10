import devServer from '@hono/vite-dev-server'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      treeshake: {
        moduleSideEffects: false
      },
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react/jsx-runtime'],
          'router-vendor': ['@tanstack/react-router'],
          'validation-vendor': ['zod'],
        }
      }
    }
  },
  plugins: [
    visualizer(),
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
