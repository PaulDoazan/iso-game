import { Graphics, Container } from 'pixi.js'

export class Sphere extends Container {
  private graphics: Graphics
  private currentX: number = 0
  private currentY: number = 0
  private targetX: number = 0
  private targetY: number = 0
  private isMoving: boolean = false
  private moveSpeed: number = 0.03 // Movement speed (0-1)

  constructor() {
    super()
    
    // Create the sphere graphics
    this.graphics = new Graphics()
    this.graphics.circle(0, 0, 20 / 1.5)
    this.graphics.fill(0xe74c3c)
    this.addChild(this.graphics)
  }

  /**
   * Set the sphere's position in world coordinates immediately
   */
  setPosition(x: number, y: number) {
    this.currentX = x
    this.currentY = y
    this.targetX = x
    this.targetY = y
    this.isMoving = false
  }

  /**
   * Move the sphere smoothly to a target world position
   */
  moveTo(x: number, y: number) {
    this.targetX = x
    this.targetY = y
    this.isMoving = true
  }

  /**
   * Update the sphere's position (call this in the game loop)
   * Returns true if still moving, false if reached target
   */
  update(): boolean {
    if (!this.isMoving) return false

    const dx = this.targetX - this.currentX
    const dy = this.targetY - this.currentY
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < 0.1) {
      // Reached target
      this.currentX = this.targetX
      this.currentY = this.targetY
      this.isMoving = false
      return false
    }

    // Smooth interpolation
    this.currentX += dx * this.moveSpeed
    this.currentY += dy * this.moveSpeed
    return true
  }

  getPosition(): { x: number; y: number } {
    return { x: this.currentX, y: this.currentY }
  }
}

