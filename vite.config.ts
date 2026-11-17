import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative base so the built site works from any static host
  // (Devpost "hosted project", Firebase Hosting, GitHub Pages, ...).
  base: './',
})
