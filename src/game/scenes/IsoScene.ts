import { Container, Graphics } from 'pixi.js'
import { Character3D } from '../entities/Character3D'
import { IsoUtils } from '../utils/IsoUtils'
import * as PF from 'pathfinding'

export class IsoScene extends Container {
  private gridSize: number = 20
  private extendedGridSize: number = 0
  private tileSize: number = 64
  private character!: Character3D
  private pathfinder: PF.AStarFinder
  private grid: PF.Grid
  private screenWidth: number = 0
  private screenHeight: number = 0
  private currentSceneX: number = 0
  private currentSceneY: number = 0
  private tiles: Map<string, Graphics> = new Map() // Store tiles by grid coordinates "isoX,isoY"
  private selectedTile: Graphics | null = null // Currently selected target tile
  private selectedTileKey: string | null = null // Key of currently selected tile

  constructor(screenWidth: number, screenHeight: number) {
    super()
    
    this.screenWidth = screenWidth
    this.screenHeight = screenHeight
    
    // Calculate extended grid size to cover the entire screen when panned
    // For isometric, we need more tiles to cover the diagonal view
    this.extendedGridSize = Math.max(
      this.gridSize, 
      Math.ceil(this.screenWidth / this.tileSize) + 20,
      Math.ceil(this.screenHeight / (this.tileSize / 2)) + 20
    )
    
    // Initialize pathfinder with extended grid size
    this.pathfinder = new PF.AStarFinder()
    const matrix = Array(this.extendedGridSize).fill(null).map(() => Array(this.extendedGridSize).fill(0))
    this.grid = new PF.Grid(matrix)

    this.createGrid()
    this.createCharacter()
    this.updateScenePosition() // Set initial position
  }

  /**
   * Create isometric grid tiles (diamond-shaped squares)
   */
  private createGrid() {
    // Grey tiles with light grey strokes
    const tileColor = 0x808080 // Grey
    const borderColor = 0xb0b0b0 // Light grey
    
    for (let isoX = 0; isoX < this.extendedGridSize; isoX++) {
      for (let isoY = 0; isoY < this.extendedGridSize; isoY++) {
        const tile = new Graphics()
        
        // Convert isometric grid coordinates to screen coordinates
        const screenPos = IsoUtils.isoToScreen(isoX, isoY, this.tileSize)
        
        // Draw diamond-shaped isometric tile
        // Make tiles larger to eliminate gaps and match expected size
        // Keep proportions correct for coordinate system (halfHeight = tileSize/4)
        const halfWidth = this.tileSize / 2
        const halfHeight = this.tileSize / 4
        // Scale up tiles to eliminate gaps (scale factor accounts for visual size)
        const scale = 2.0
        const scaledHalfWidth = halfWidth * scale
        const scaledHalfHeight = halfHeight * scale
        
        // Diamond points: top, right, bottom, left
        tile.poly([
          screenPos.x, screenPos.y - scaledHalfHeight,           // Top
          screenPos.x + scaledHalfWidth, screenPos.y,            // Right
          screenPos.x, screenPos.y + scaledHalfHeight,           // Bottom
          screenPos.x - scaledHalfWidth, screenPos.y             // Left
        ])
        tile.fill(tileColor)
        tile.stroke({ width: 1, color: borderColor })
        
        // Store tile reference by grid coordinates
        const tileKey = `${isoX},${isoY}`
        this.tiles.set(tileKey, tile)
        
        this.addChild(tile)
      }
    }
  }
  
  /**
   * Highlight a target tile in yellow
   */
  private highlightTargetTile(gridX: number, gridY: number) {
    const tileKey = `${gridX},${gridY}`
    
    // Reset previous selected tile to grey
    if (this.selectedTile && this.selectedTileKey) {
      this.selectedTile.clear()
      const prevScreenPos = IsoUtils.isoToScreen(
        parseInt(this.selectedTileKey.split(',')[0] || '0'),
        parseInt(this.selectedTileKey.split(',')[1] || '0'),
        this.tileSize
      )
      const halfWidth = this.tileSize / 2
      const halfHeight = this.tileSize / 4
      const scale = 2.0
      const scaledHalfWidth = halfWidth * scale
      const scaledHalfHeight = halfHeight * scale
      
      this.selectedTile.poly([
        prevScreenPos.x, prevScreenPos.y - scaledHalfHeight,
        prevScreenPos.x + scaledHalfWidth, prevScreenPos.y,
        prevScreenPos.x, prevScreenPos.y + scaledHalfHeight,
        prevScreenPos.x - scaledHalfWidth, prevScreenPos.y
      ])
      this.selectedTile.fill(0x808080) // Grey
      this.selectedTile.stroke({ width: 1, color: 0xb0b0b0 }) // Light grey
    }
    
    // Get the new target tile
    const targetTile = this.tiles.get(tileKey)
    if (targetTile) {
      // Clear and redraw in yellow
      targetTile.clear()
      const screenPos = IsoUtils.isoToScreen(gridX, gridY, this.tileSize)
      const halfWidth = this.tileSize / 2
      const halfHeight = this.tileSize / 4
      const scale = 2.0
      const scaledHalfWidth = halfWidth * scale
      const scaledHalfHeight = halfHeight * scale
      
      targetTile.poly([
        screenPos.x, screenPos.y - scaledHalfHeight,
        screenPos.x + scaledHalfWidth, screenPos.y,
        screenPos.x, screenPos.y + scaledHalfHeight,
        screenPos.x - scaledHalfWidth, screenPos.y
      ])
      targetTile.fill(0xffff00) // Yellow
      targetTile.stroke({ width: 1, color: 0xffd700 }) // Gold border
      
      this.selectedTile = targetTile
      this.selectedTileKey = tileKey
    }
  }

  private createCharacter() {
    this.character = new Character3D()
    // Start at center of extended grid (in isometric grid coordinates)
    const centerIsoX = this.extendedGridSize / 2
    const centerIsoY = this.extendedGridSize / 2
    
    // Convert isometric grid coordinates to screen coordinates
    const screenPos = IsoUtils.isoToScreen(centerIsoX, centerIsoY, this.tileSize)
    
    // Set character position in screen coordinates (world space)
    this.character.setPosition(screenPos.x, screenPos.y)
    this.addChild(this.character)
  }

  /**
   * Check if a point is inside a diamond-shaped isometric tile
   */
  private isPointInDiamond(px: number, py: number, centerX: number, centerY: number, halfWidth: number, halfHeight: number): boolean {
    // Check if point is inside diamond using the diamond's four edges
    // Diamond edges: top-right, bottom-right, bottom-left, top-left
    const dx = Math.abs(px - centerX)
    const dy = Math.abs(py - centerY)
    
    // Check if point is within the diamond bounds
    // The diamond is defined by: |x|/halfWidth + |y|/halfHeight <= 1
    return (dx / halfWidth + dy / halfHeight) <= 1
  }

  /**
   * Find the tile that contains the given screen coordinates
   */
  private findTileAtScreenPosition(worldX: number, worldY: number): { gridX: number; gridY: number } | null {
    // Convert screen coordinates to approximate isometric grid coordinates
    const isoGrid = IsoUtils.screenToIso(worldX, worldY, this.tileSize)
    
    // Check the tile at the rounded coordinates and its neighbors
    const candidates = [
      { x: Math.floor(isoGrid.x), y: Math.floor(isoGrid.y) },
      { x: Math.ceil(isoGrid.x), y: Math.floor(isoGrid.y) },
      { x: Math.floor(isoGrid.x), y: Math.ceil(isoGrid.y) },
      { x: Math.ceil(isoGrid.x), y: Math.ceil(isoGrid.y) },
    ]
    
    const halfWidth = (this.tileSize / 2) * 2.0 // scaled
    const halfHeight = (this.tileSize / 4) * 2.0 // scaled
    
    // Check each candidate tile to see if the point is inside
    for (const candidate of candidates) {
      const gridX = candidate.x
      const gridY = candidate.y
      
      // Clamp to grid bounds
      if (gridX < 0 || gridX >= this.extendedGridSize || gridY < 0 || gridY >= this.extendedGridSize) {
        continue
      }
      
      // Get tile center position
      const screenPos = IsoUtils.isoToScreen(gridX, gridY, this.tileSize)
      
      // Check if point is inside this tile's diamond
      if (this.isPointInDiamond(worldX, worldY, screenPos.x, screenPos.y, halfWidth, halfHeight)) {
        return { gridX, gridY }
      }
    }
    
    // Fallback: return the rounded coordinates if no tile found
    const fallbackX = Math.max(0, Math.min(this.extendedGridSize - 1, Math.round(isoGrid.x)))
    const fallbackY = Math.max(0, Math.min(this.extendedGridSize - 1, Math.round(isoGrid.y)))
    return { gridX: fallbackX, gridY: fallbackY }
  }

  /**
   * Handle click event - convert screen coordinates to isometric grid coordinates
   */
  handleClick(screenX: number, screenY: number) {
    // Convert screen coordinates to world coordinates (relative to scene)
    const worldX = screenX - this.x
    const worldY = screenY - this.y
    
    // Find the exact tile that contains the click point
    const clickedTile = this.findTileAtScreenPosition(worldX, worldY)
    if (!clickedTile) return
    
    const clampedGridX = clickedTile.gridX
    const clampedGridY = clickedTile.gridY
    
    // Highlight the target tile in yellow
    this.highlightTargetTile(clampedGridX, clampedGridY)
    
    // Get current character position in isometric grid coordinates
    const currentPos = this.character.getPosition()
    const currentIso = IsoUtils.screenToIso(currentPos.x, currentPos.y, this.tileSize)
    const startGridX = Math.max(0, Math.min(this.extendedGridSize - 1, Math.floor(currentIso.x)))
    const startGridY = Math.max(0, Math.min(this.extendedGridSize - 1, Math.floor(currentIso.y)))
    
    // Rebuild grid (no obstacles for now, but keeping structure for future)
    const matrix = Array(this.extendedGridSize).fill(null).map(() => Array(this.extendedGridSize).fill(0))
    this.grid = new PF.Grid(matrix)
    
    // Calculate path
    const path = this.pathfinder.findPath(startGridX, startGridY, clampedGridX, clampedGridY, this.grid)
    
    if (path.length > 0) {
      // Skip the first point if it's the current position
      const pathToFollow = path.length > 1 ? path.slice(1) : path
      
      // Convert isometric grid coordinates to screen coordinates for the path
      const screenPath = pathToFollow
        .map((point) => {
          if (point && point.length >= 2 && point[0] !== undefined && point[1] !== undefined) {
            const isoX = point[0]
            const isoY = point[1]
            const screenPos = IsoUtils.isoToScreen(isoX, isoY, this.tileSize)
            return { x: screenPos.x, y: screenPos.y }
          }
          return null
        })
        .filter((point): point is { x: number; y: number } => point !== null)
      
      // Move character along the path (using screen coordinates)
      if (screenPath.length > 0) {
        this.character.moveAlongPath(screenPath)
      }
    }
  }

  /**
   * Update scene position to keep character centered on screen
   */
  private updateScenePosition() {
    const characterPos = this.character.getPosition()
    
    // Character's position in the scene is its world position (screen coordinates)
    this.character.x = characterPos.x
    this.character.y = characterPos.y
    
    // Calculate scene position so character appears at screen center
    this.currentSceneX = this.screenWidth / 2 - characterPos.x
    this.currentSceneY = this.screenHeight / 2 - characterPos.y
    this.x = this.currentSceneX
    this.y = this.currentSceneY
  }

  /**
   * Update the scene (call in game loop)
   * @param deltaTime Time elapsed since last frame in seconds (from ticker.deltaTime)
   */
  update(deltaTime: number = 1/60) {
    // Update character movement (time-based for consistent speed)
    this.character.update(deltaTime)
    
    // Update scene position immediately to keep character centered
    this.updateScenePosition()
  }

  /**
   * Update screen dimensions (call when window is resized)
   */
  updateScreenSize(width: number, height: number) {
    this.screenWidth = width
    this.screenHeight = height
    
    // Recalculate extended grid size if needed
    const newExtendedGridSize = Math.max(
      this.gridSize, 
      Math.ceil(this.screenWidth / this.tileSize) + 20,
      Math.ceil(this.screenHeight / (this.tileSize / 2)) + 20
    )
    
    // Only update if grid size changed significantly
    if (Math.abs(newExtendedGridSize - this.extendedGridSize) > 5) {
      this.extendedGridSize = newExtendedGridSize
      // Recreate pathfinder grid
      const matrix = Array(this.extendedGridSize).fill(null).map(() => Array(this.extendedGridSize).fill(0))
      this.grid = new PF.Grid(matrix)
    }
    
    // Recenter character by updating scene position
    this.updateScenePosition()
  }

  getCharacter(): Character3D {
    return this.character
  }

  // Keep for backward compatibility
  getSphere(): Character3D {
    return this.character
  }
}
