import { Application, Graphics } from 'pixi.js'

export class Game {
  private app: Application | null = null

  async init(canvas: HTMLCanvasElement) {
    // Create PixiJS application
    this.app = new Application()
    
    await this.app.init({
      canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x2c3e50,
      antialias: true,
    })

    this.createScene()
  }

  private createScene() {
    if (!this.app) return

    // Create a simple rectangle
    const rectangle = new Graphics()
    rectangle.rect(0, 0, 200, 200)
    rectangle.fill(0x3498db)
    rectangle.x = this.app.screen.width / 2 - 100
    rectangle.y = this.app.screen.height / 2 - 100

    // Create a simple circle
    const circle = new Graphics()
    circle.circle(0, 0, 50)
    circle.fill(0xe74c3c)
    circle.x = this.app.screen.width / 2
    circle.y = this.app.screen.height / 2 - 150

    // Add shapes to the stage
    this.app.stage.addChild(rectangle)
    this.app.stage.addChild(circle)
  }

  getApp(): Application | null {
    return this.app
  }
}

