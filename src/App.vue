<script setup lang="ts">
import { onMounted, ref, onUnmounted } from 'vue'
import { Game } from './game/Game'
import Parameter from './components/Parameter.vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const game = new Game()

onMounted(async () => {
  if (!canvasRef.value) return
  await game.init(canvasRef.value)
  
  // Handle window resize to keep sphere centered
  window.addEventListener('resize', handleResize)
  window.addEventListener('orientationchange', handleResize)
  
  // Handle visualViewport resize (accounts for browser UI on mobile)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleResize)
    window.visualViewport.addEventListener('scroll', handleResize)
  }
  
  // Initial correction after a short delay to account for browser UI settling
  setTimeout(() => {
    handleResize()
  }, 200)
  
  // Try to lock orientation to landscape on mobile (if supported)
  if (screen.orientation && 'lock' in screen.orientation) {
    (screen.orientation as any).lock('landscape').catch(() => {
      // Orientation lock not supported or denied
      console.log('Orientation lock not available')
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('orientationchange', handleResize)
  if (window.visualViewport) {
    window.visualViewport.removeEventListener('resize', handleResize)
    window.visualViewport.removeEventListener('scroll', handleResize)
  }
})

const handleResize = () => {
  // Small delay to ensure orientation change is complete
  setTimeout(() => {
    const app = game.getApp()
    if (app && canvasRef.value) {
      // Get actual visible dimensions, accounting for browser UI on mobile
      let width: number
      let height: number
      
      if (window.visualViewport) {
        // Use visualViewport if available (excludes browser UI)
        width = window.visualViewport.width
        height = window.visualViewport.height
      } else {
        // Fallback to canvas client dimensions (actual rendered size)
        width = canvasRef.value.clientWidth || window.innerWidth
        height = canvasRef.value.clientHeight || window.innerHeight
      }
      
      // Resize renderer to match actual visible dimensions
      app.renderer.resize(width, height)
      const scene = game.getScene()
      if (scene) {
        // Use renderer dimensions for consistency (these are the actual rendering dimensions)
        scene.updateScreenSize(app.renderer.width, app.renderer.height)
      }
    }
  }, 100)
}
</script>

<template>
  <div class="relative w-screen h-screen overflow-hidden">
    <div class="absolute top-0 right-0 z-10 p-2">
      <Parameter />
    </div>
    <canvas ref="canvasRef" id="canvas" class="w-full h-full"></canvas>
  </div>
</template>

