import { Application } from 'pixi.js'
import { TopDownScene } from './scenes/TopDownScene'

export class Game {
  private app: Application | null = null
  private scene: TopDownScene | null = null

  async init(canvas: HTMLCanvasElement) {
    // Create PixiJS application
    this.app = new Application()
    
    await this.app.init({
      canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x1a1a1a,
      antialias: true,
      resizeTo: window,
    })

    this.createScene()
    this.setupEventListeners()
    this.startGameLoop()
  }

  private createScene() {
    if (!this.app) return

    // Create top-down scene - it will fill the screen and handle its own positioning
    this.scene = new TopDownScene(this.app.screen.width, this.app.screen.height)
    
    this.app.stage.addChild(this.scene)
  }

  private setupEventListeners() {
    if (!this.app || !this.scene) return

    // Handle click events
    this.app.canvas.addEventListener('click', (event) => {
      const rect = this.app!.canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      this.scene!.handleClick(x, y)
    })
  }

  private startGameLoop() {
    if (!this.app || !this.scene) return

    // Game loop for smooth animations
    this.app.ticker.add(() => {
      this.scene!.update()
    })
  }

  getApp(): Application | null {
    return this.app
  }

  getScene(): TopDownScene | null {
    return this.scene
  }
}

