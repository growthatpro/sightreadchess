import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Sightread dev server. Fixed port so the Claude preview link is stable.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5177,
    strictPort: true,
  },
})
