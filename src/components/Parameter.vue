<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const isFullscreen = ref(false)
const canvasRef = ref<HTMLCanvasElement | null>(null)

const toggleFullscreen = async () => {
  // Ensure we have the canvas reference
  if (!canvasRef.value) {
    canvasRef.value = document.getElementById('canvas') as HTMLCanvasElement
  }
  
  if (!canvasRef.value) return

  try {
    if (!document.fullscreenElement) {
      // Enter fullscreen
      await canvasRef.value.requestFullscreen()
      isFullscreen.value = true
    } else {
      // Exit fullscreen
      await document.exitFullscreen()
      isFullscreen.value = false
    }
  } catch (error) {
    console.error('Fullscreen error:', error)
  }
}

const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement
}

onMounted(async () => {
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  // Wait for canvas to be available
  await nextTick()
  canvasRef.value = document.getElementById('canvas') as HTMLCanvasElement
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
})
</script>

<template>
  <div 
    @click="toggleFullscreen"
    class="text-white"
  >
    {{ isFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}
  </div>
</template>

<style scoped>

</style>
