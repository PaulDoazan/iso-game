import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    sourcemap: false, // Disable source maps for production
  },
  base: './', // Use relative paths for GitHub Pages
})
