import { Application } from 'pixi.js'
import { IsoScene } from './scenes/IsoScene'

export class Game {
  private app: Application | null = null
  private scene: IsoScene | null = null

  async init(canvas: HTMLCanvasElement) {
    // Create PixiJS application
    this.app = new Application()
    
    // Get actual visible dimensions, accounting for browser UI on mobile
    const getVisibleDimensions = () => {
      // Use visualViewport if available (excludes browser UI)
      if (window.visualViewport) {
        return {
          width: window.visualViewport.width,
          height: window.visualViewport.height
        }
      }
      // Fallback to canvas client dimensions (actual rendered size)
      return {
        width: canvas.clientWidth || window.innerWidth,
        height: canvas.clientHeight || window.innerHeight
      }
    }
    
    const dimensions = getVisibleDimensions()
    
    await this.app.init({
      canvas,
      width: dimensions.width,
      height: dimensions.height,
      backgroundColor: 0x4a90e2, // Blue water color
      antialias: true,
      resizeTo: window,
    })

    this.createScene()
    this.setupEventListeners()
    this.startGameLoop()
  }

  private createScene() {
    if (!this.app) return

    // Use renderer dimensions to ensure consistency across all devices
    // This ensures correct proportions even when not in fullscreen on mobile
    // The renderer dimensions are the actual dimensions being used for rendering
    const width = this.app.renderer.width
    const height = this.app.renderer.height
    
    // Create isometric scene - it will fill the screen and handle its own positioning
    this.scene = new IsoScene(width, height)
    
    this.app.stage.addChild(this.scene)
  }

  private setupEventListeners() {
    if (!this.app || !this.scene) return

    // Handle mousedown events
    this.app.canvas.addEventListener('mousedown', (event) => {
      const rect = this.app!.canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      this.scene!.handleClick(x, y)
    })
  }

  private startGameLoop() {
    if (!this.app || !this.scene) return

    // Game loop for smooth animations
    // Use ticker deltaTime for time-based movement (ensures consistent speed)
    this.app.ticker.add((ticker) => {
      // ticker.deltaTime is in milliseconds, convert to seconds
      const deltaTime = ticker.deltaTime / 1000
      this.scene!.update(deltaTime)
    })
  }

  getApp(): Application | null {
    return this.app
  }

  getScene(): IsoScene | null {
    return this.scene
  }
}

