import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/FS-Pricing/', // 👈 must match your repo name EXACTLY (including caps)
})
