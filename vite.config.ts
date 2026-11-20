import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./src', import.meta.url)),
      '@brand': fileURLToPath(new URL('./brand', import.meta.url)),
    },
  },
  server: { port: 3100 },
  // Large catalogue JSON (manifest, shards, search index) is parsed with JSON.parse, which is faster than an object literal.
  json: { stringify: true },
  // nitro() turns the SSR build into a deployable server: Vercel (.vercel/output) or Node (.output).
  plugins: [tailwindcss(), tanstackStart(), nitro(), viteReact()],
})
