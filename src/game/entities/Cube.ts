import { Container, Graphics } from 'pixi.js'
import { IsoUtils } from '../utils/IsoUtils'

/**
 * Isometric Cube entity using PixiJS Graphics
 * 
 * This creates a 2D isometric cube that can be placed in a specific tile of the isometric scene.
 * The cube is oriented correctly for isometric view and takes exactly the surface of one tile.
 */
export class Cube extends Container {
  private graphics: Graphics
  
  // Position in isometric grid coordinates
  private isoX: number = 0
  private isoY: number = 0
  private tileSize: number = 64
  
  // Cube dimensions (will be calculated based on tile size)
  private cubeWidth: number = 0
  private cubeHeight: number = 0
  private cubeDepth: number = 0 // Height of the cube in 3D space
  
  // Colors for different faces (with shading for 3D effect)
  private topColor: number = 0x3498db
  private rightColor: number = 0x3498db
  private frontColor: number = 0x3498db

  constructor(isoX: number, isoY: number, tileSize: number, color: number = 0x3498db) {
    super()
    
    this.isoX = isoX
    this.isoY = isoY
    this.tileSize = tileSize
    
    // Calculate colors for different faces (lighter for top, darker for sides)
    this.topColor = this.lightenColor(color, 0.2)
    this.rightColor = this.darkenColor(color, 0.15)
    this.frontColor = this.darkenColor(color, 0.25)
    
    // Create graphics object
    this.graphics = new Graphics()
    this.addChild(this.graphics)
    
    // Calculate cube dimensions and draw
    this.updateCubeSize()
    this.drawCube()
    
    // Position cube at the tile center
    this.updatePosition()
  }

  /**
   * Calculate cube size based on tile dimensions
   * The cube should fit exactly within the tile's diamond shape
   */
  private updateCubeSize() {
    // Tile dimensions with scale 2.0:
    // scaledHalfWidth = tileSize
    // scaledHalfHeight = tileSize / 2
    // Diamond width = 2 * scaledHalfWidth = 2 * tileSize
    // Diamond height = 2 * scaledHalfHeight = tileSize
    
    // For an isometric cube to take the full tile surface:
    // The top face (diamond) should match the tile diamond exactly
    // The cube width should match the tile's scaled half-width
    this.cubeWidth = this.tileSize // Base width of the cube (matches scaledHalfWidth)
    this.cubeHeight = this.tileSize / 2 // Height of the cube (matches scaledHalfHeight)
    // Cube depth (3D height) - make it visible but not too tall
    this.cubeDepth = this.tileSize * 0.6 // Height of the cube in 3D space
  }

  /**
   * Draw an isometric cube with 3 visible faces
   * The cube takes the full size of a tile and has visible height
   */
  private drawCube() {
    this.graphics.clear()
    
    // Tile dimensions: scaledHalfWidth = tileSize, scaledHalfHeight = tileSize/2
    // The cube base should match the tile diamond exactly
    const halfWidth = this.cubeWidth  // = tileSize (scaledHalfWidth)
    const halfHeight = this.cubeHeight // = tileSize/2 (scaledHalfHeight)
    const depth = this.cubeDepth // Height of the cube in 3D
    
    // In isometric projection (2:1 ratio):
    // - Moving down in 3D space (z decreases) moves down-right in 2D
    // - The depth offset: dx = depth/2 (to the right), dy = depth (down)
    const depthOffsetX = depth / 2
    const depthOffsetY = depth
    
    // Draw faces in order: back faces first, then front faces (for proper z-ordering)
    
    // Right face (parallelogram, medium dark)
    // This face extends from the right edge of the top face downward
    this.graphics.poly([
      halfWidth, 0,                              // Top-right (right edge of top face, front)
      halfWidth + depthOffsetX, depthOffsetY,    // Bottom-right (back)
      depthOffsetX, halfHeight + depthOffsetY,   // Bottom-left (back)
      0, halfHeight                               // Top-left (front)
    ])
    this.graphics.fill(this.rightColor)
    this.graphics.stroke({ width: 1, color: this.darkenColor(this.rightColor, 0.2) })
    
    // Front face (parallelogram, darkest)
    // This face extends from the bottom edge of the top face downward
    this.graphics.poly([
      -halfWidth, 0,                             // Top-left (left edge of top face)
      0, -halfHeight,                             // Top-center
      halfWidth, 0,                               // Top-right
      depthOffsetX, halfHeight + depthOffsetY    // Bottom-center (back)
    ])
    this.graphics.fill(this.frontColor)
    this.graphics.stroke({ width: 1, color: this.darkenColor(this.frontColor, 0.2) })
    
    // Top face (diamond shape matching tile, lighter color)
    // Draw last so it appears on top
    this.graphics.poly([
      0, -halfHeight,           // Top
      halfWidth, 0,              // Right
      0, halfHeight,             // Bottom
      -halfWidth, 0              // Left
    ])
    this.graphics.fill(this.topColor)
    this.graphics.stroke({ width: 1, color: this.darkenColor(this.topColor, 0.2) })
  }

  /**
   * Update cube position based on isometric grid coordinates
   */
  private updatePosition() {
    // Convert isometric grid coordinates to screen coordinates
    const screenPos = IsoUtils.isoToScreen(this.isoX, this.isoY, this.tileSize)
    
    // Set position in screen coordinates
    this.x = screenPos.x
    this.y = screenPos.y
  }

  /**
   * Lighten a color by a percentage
   */
  private lightenColor(color: number, amount: number): number {
    const r = Math.min(255, ((color >> 16) & 0xFF) + (255 * amount))
    const g = Math.min(255, ((color >> 8) & 0xFF) + (255 * amount))
    const b = Math.min(255, (color & 0xFF) + (255 * amount))
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b)
  }

  /**
   * Darken a color by a percentage
   */
  private darkenColor(color: number, amount: number): number {
    const r = Math.max(0, ((color >> 16) & 0xFF) * (1 - amount))
    const g = Math.max(0, ((color >> 8) & 0xFF) * (1 - amount))
    const b = Math.max(0, (color & 0xFF) * (1 - amount))
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b)
  }

  /**
   * Update the cube (call this in the game loop)
   * @param _deltaTime Time elapsed since last frame in seconds (unused for static cube)
   */
  update(_deltaTime: number = 1/60) {
    // No animation needed for static cube, but method kept for consistency
  }

  /**
   * Get the isometric grid coordinates of this cube
   */
  getIsoPosition(): { isoX: number; isoY: number } {
    return { isoX: this.isoX, isoY: this.isoY }
  }

  /**
   * Get the screen position of this cube
   */
  getScreenPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y }
  }

  /**
   * Update cube scale based on tile size
   * Call this when tile size changes
   */
  updateScale(newTileSize: number) {
    this.tileSize = newTileSize
    this.updateCubeSize()
    this.drawCube()
    this.updatePosition()
  }

  /**
   * Set cube color
   */
  setColor(color: number) {
    // Calculate colors for different faces (lighter for top, darker for sides)
    this.topColor = this.lightenColor(color, 0.2)
    this.rightColor = this.darkenColor(color, 0.15)
    this.frontColor = this.darkenColor(color, 0.25)
    this.drawCube()
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.graphics.destroy()
    super.destroy()
  }
}
