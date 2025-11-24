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
})

const handleResize = () => {
  // Small delay to ensure orientation change is complete
  setTimeout(() => {
    const app = game.getApp()
    if (app && canvasRef.value) {
      app.renderer.resize(window.innerWidth, window.innerHeight)
      const scene = game.getScene()
      if (scene) {
        // Update scene dimensions and recenter sphere
        scene.updateScreenSize(window.innerWidth, window.innerHeight)
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

