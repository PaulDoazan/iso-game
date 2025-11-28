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
    chunkSizeWarningLimit: 1000, // Increase limit to 1MB (Three.js and PixiJS are large libraries)
    rollupOptions: {
      output: {
        manualChunks: {
          // Split Three.js into its own chunk (large library)
          'three': ['three'],
          // Split PixiJS into its own chunk
          'pixi': ['pixi.js'],
          // Split pathfinding into its own chunk
          'pathfinding': ['pathfinding'],
        },
      },
    },
  },
  base: './', // Use relative paths for GitHub Pages
})
