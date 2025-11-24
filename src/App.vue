<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Game } from './game/Game'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const game = new Game()

onMounted(async () => {
  if (!canvasRef.value) return
  await game.init(canvasRef.value)
})
</script>

<template>
  <div class="relative w-screen h-screen">
    <div class="absolute top-0 right-0">
    Cog
  </div>
  <canvas ref="canvasRef" id="canvas"></canvas>
  </div>
  
</template>

