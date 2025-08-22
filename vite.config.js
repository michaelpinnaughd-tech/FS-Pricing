import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: set base to "/<REPO_NAME>/" (change if your repo name differs)
export default defineConfig({
  plugins: [react()],
  base: '/fs-pp-pricing/',
})
