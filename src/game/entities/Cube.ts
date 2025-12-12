import { Container, Graphics } from 'pixi.js'
import { IsoUtils } from '../utils/IsoUtils'

/**
 * Isometric Cube entity using PixiJS Graphics
 * 
 * This creates a 2D isometric cube that can be placed in a specific tile of the isometric scene.
 * The cube base (socle) is dimensioned exactly like a tile.
 */
export class Cube extends Container {
  private baseGraphics: Graphics
  private socleGraphics: Graphics
  private sidesGraphics: Graphics
  
  // Position in isometric grid coordinates
  private isoX: number = 0
  private isoY: number = 0
  private tileSize: number = 64
  
  // Base dimensions (matching tile dimensions exactly)
  private halfWidth: number = 0
  private halfHeight: number = 0
  
  // Cube height (depth in 3D space)
  private cubeHeight: number = 0
  
  // Colors for different faces
  private topColor: number = 0x3498db // Top face (socle) - lighter
  private bottomColor: number = 0x3498db // Bottom face (base) - darker
  private sideColor: number = 0x3498db // Side faces - medium dark

  constructor(isoX: number, isoY: number, tileSize: number, color: number = 0x3498db) {
    super()
    
    // Enable zIndex sorting for proper rendering order within cube
    this.sortableChildren = true
    
    this.isoX = isoX
    this.isoY = isoY
    this.tileSize = tileSize
    
    // Set colors (lighter for top, darker for bottom, medium for sides)
    this.topColor = this.lightenColor(color, 0.2)
    this.bottomColor = this.darkenColor(color, 0.25)
    this.sideColor = this.darkenColor(color, 0.15)
    
    // Create separate graphics objects for base, socle, and sides
    this.baseGraphics = new Graphics()
    this.socleGraphics = new Graphics()
    this.sidesGraphics = new Graphics()
    
    // Set zIndex to ensure all socles are above all bases and sides
    // Bases have zIndex 0, sides have zIndex 0.5, socles have zIndex 1
    this.baseGraphics.zIndex = 0
    this.sidesGraphics.zIndex = 0.5
    this.socleGraphics.zIndex = 1
    
    // Add base first, then sides, then socle (order matters for zIndex)
    this.addChild(this.baseGraphics)
    this.addChild(this.sidesGraphics)
    this.addChild(this.socleGraphics)
    
    // Calculate base dimensions and cube height
    this.updateBaseSize()
    
    // Draw the cube with top and bottom faces
    this.drawBase()
    
    // Position cube at the tile center
    this.updatePosition()
  }

  /**
   * Calculate base size to match tile dimensions exactly
   * Tiles use: halfWidth = tileSize/2 * 2.0 = tileSize, halfHeight = tileSize/4 * 2.0 = tileSize/2
   */
  private updateBaseSize() {
    // Match the tile dimensions from IsoScene.createGrid():
    // halfWidth = tileSize / 2
    // halfHeight = tileSize / 4
    // scale = 2.0
    // scaledHalfWidth = halfWidth * scale = tileSize
    // scaledHalfHeight = halfHeight * scale = tileSize / 2
    this.halfWidth = this.tileSize // scaledHalfWidth
    this.halfHeight = this.tileSize / 2 // scaledHalfHeight
    
    // Set cube height (depth in 3D space)
    // Make it twice as high to look like a real cube
    this.cubeHeight = this.tileSize * 1.2
  }

  /**
   * Draw the cube with top face (socle), bottom face (base), and side faces
   */
  private drawBase() {
    // Clear all graphics
    this.baseGraphics.clear()
    this.socleGraphics.clear()
    this.sidesGraphics.clear()
    
    // In isometric projection, when moving up in 3D space (z increases),
    // we move vertically up in 2D (no horizontal offset)
    // The depth offset is only vertical: dy = height (up, so negative)
    const depthOffsetY = -this.cubeHeight
    
    // Draw bottom face (base) - positioned at origin (on the tile)
    this.baseGraphics.poly([
      0, -this.halfHeight,           // Top
      this.halfWidth, 0,              // Right
      0, this.halfHeight,             // Bottom
      -this.halfWidth, 0              // Left
    ])
    this.baseGraphics.fill(this.bottomColor)
    this.baseGraphics.stroke({ width: 1, color: this.darkenColor(this.bottomColor, 0.2) })
    
    // Draw top face (socle) - diamond shape matching tile exactly, offset upward
    // Points: top, right, bottom, left (centered at origin, then shifted up)
    this.socleGraphics.poly([
      0, -this.halfHeight + depthOffsetY,           // Top
      this.halfWidth, depthOffsetY,                  // Right
      0, this.halfHeight + depthOffsetY,            // Bottom
      -this.halfWidth, depthOffsetY                 // Left
    ])
    this.socleGraphics.fill(this.topColor)
    this.socleGraphics.stroke({ width: 1, color: this.darkenColor(this.topColor, 0.2) })
    
    // Draw 4 side faces connecting base to socle
    // Each face is a parallelogram connecting corresponding corners
    
    // Top face (connects top of base to top of socle)
    this.sidesGraphics.poly([
      0, -this.halfHeight,                    // Base top
      this.halfWidth, 0,                      // Base right
      this.halfWidth, depthOffsetY,           // Socle right
      0, -this.halfHeight + depthOffsetY     // Socle top
    ])
    this.sidesGraphics.fill(this.sideColor)
    this.sidesGraphics.stroke({ width: 1, color: this.darkenColor(this.sideColor, 0.2) })
    
    // Right face (connects right of base to right of socle)
    this.sidesGraphics.poly([
      this.halfWidth, 0,                      // Base right
      0, this.halfHeight,                     // Base bottom
      0, this.halfHeight + depthOffsetY,      // Socle bottom
      this.halfWidth, depthOffsetY            // Socle right
    ])
    this.sidesGraphics.fill(this.darkenColor(this.sideColor, 0.1))
    this.sidesGraphics.stroke({ width: 1, color: this.darkenColor(this.sideColor, 0.2) })
    
    // Bottom face (connects bottom of base to bottom of socle)
    this.sidesGraphics.poly([
      0, this.halfHeight,                     // Base bottom
      -this.halfWidth, 0,                     // Base left
      -this.halfWidth, depthOffsetY,          // Socle left
      0, this.halfHeight + depthOffsetY      // Socle bottom
    ])
    this.sidesGraphics.fill(this.darkenColor(this.sideColor, 0.15))
    this.sidesGraphics.stroke({ width: 1, color: this.darkenColor(this.sideColor, 0.2) })
    
    // Left face (connects left of base to left of socle)
    this.sidesGraphics.poly([
      -this.halfWidth, 0,                     // Base left
      0, -this.halfHeight,                    // Base top
      0, -this.halfHeight + depthOffsetY,   // Socle top
      -this.halfWidth, depthOffsetY           // Socle left
    ])
    this.sidesGraphics.fill(this.darkenColor(this.sideColor, 0.1))
    this.sidesGraphics.stroke({ width: 1, color: this.darkenColor(this.sideColor, 0.2) })
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
   * Check if a point (in world coordinates relative to scene) is inside the cube
   * This checks the entire cube area including base, socle, and sides
   */
  isPointInside(worldX: number, worldY: number): boolean {
    // Cube center position in world coordinates
    const centerX = this.x
    const centerY = this.y
    
    // Calculate the bounding box that encompasses the entire cube
    // The cube extends from the base (at centerY) to the socle (at centerY - cubeHeight)
    // Horizontally: from -halfWidth to +halfWidth
    // Vertically: from base bottom (centerY + halfHeight) to socle top (centerY - cubeHeight - halfHeight)
    
    // Check if point is within the horizontal bounds (X axis)
    const dx = Math.abs(worldX - centerX)
    if (dx > this.halfWidth) {
      return false
    }
    
    // Check if point is within the vertical bounds (Y axis)
    const topY = centerY - this.cubeHeight - this.halfHeight // Top of socle
    const bottomY = centerY + this.halfHeight // Bottom of base
    
    if (worldY < topY || worldY > bottomY) {
      return false
    }
    
    // Now check if point is within the diamond shape at the base or socle level
    // or within the sides (which form a trapezoid between base and socle)
    
    // Check base diamond
    const baseDy = Math.abs(worldY - centerY)
    if (dx / this.halfWidth + baseDy / this.halfHeight <= 1) {
      return true
    }
    
    // Check socle diamond
    const socleCenterY = centerY - this.cubeHeight
    const socleDy = Math.abs(worldY - socleCenterY)
    if (dx / this.halfWidth + socleDy / this.halfHeight <= 1) {
      return true
    }
    
    // Check if point is within the sides (between base and socle)
    // The sides form a trapezoid shape connecting base corners to socle corners
    // For a point between base and socle, check if it's within the side bounds
    if (worldY >= socleCenterY - this.halfHeight && worldY <= centerY + this.halfHeight) {
      // The sides have the same horizontal extent (halfWidth) at all heights
      // So if we're within the horizontal bounds and vertical bounds, we're in a side
      // We can use a simple check: if point is within the diamond shape interpolated
      // between base and socle based on Y position
      const t = (worldY - (centerY + this.halfHeight)) / ((socleCenterY - this.halfHeight) - (centerY + this.halfHeight))
      const interpolatedCenterY = centerY + (socleCenterY - centerY) * t
      const sideDy = Math.abs(worldY - interpolatedCenterY)
      if (dx / this.halfWidth + sideDy / this.halfHeight <= 1) {
        return true
      }
    }
    
    return false
  }

  /**
   * Update cube scale based on tile size
   * Call this when tile size changes
   */
  updateScale(newTileSize: number) {
    this.tileSize = newTileSize
    this.updateBaseSize()
    this.drawBase()
    this.updatePosition()
  }

  /**
   * Set cube color
   */
  setColor(color: number) {
    this.topColor = this.lightenColor(color, 0.2)
    this.bottomColor = this.darkenColor(color, 0.25)
    this.sideColor = this.darkenColor(color, 0.15)
    this.drawBase()
  }


  /**
   * Clean up resources
   */
  destroy() {
    this.baseGraphics.destroy()
    this.socleGraphics.destroy()
    this.sidesGraphics.destroy()
    super.destroy()
  }
}


