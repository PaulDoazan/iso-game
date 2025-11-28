import { Container, Graphics } from 'pixi.js'
import { Character3D } from '../entities/Character3D'
import * as PF from 'pathfinding'

export class TopDownScene extends Container {
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

  constructor(screenWidth: number, screenHeight: number) {
    super()
    
    this.screenWidth = screenWidth
    this.screenHeight = screenHeight
    
    // Calculate extended grid size to cover the entire screen when panned
    this.extendedGridSize = Math.max(
      this.gridSize, 
      Math.ceil(this.screenWidth / this.tileSize) + 20,
      Math.ceil(this.screenHeight / this.tileSize) + 20
    )
    
    // Initialize pathfinder with extended grid size
    this.pathfinder = new PF.AStarFinder()
    const matrix = Array(this.extendedGridSize).fill(null).map(() => Array(this.extendedGridSize).fill(0))
    this.grid = new PF.Grid(matrix)

    this.createGrid()
    this.createCharacter()
    this.updateScenePosition() // Set initial position
  }

  private createGrid() {
    // Create top-down grid tiles - make grid large enough to fill screen
    for (let x = 0; x < this.extendedGridSize; x++) {
      for (let y = 0; y < this.extendedGridSize; y++) {
        const tile = new Graphics()
        // Direct x/y mapping for top-down view
        const tileX = x * this.tileSize
        const tileY = y * this.tileSize
        
        // Draw a square tile
        tile.rect(tileX, tileY, this.tileSize, this.tileSize)
        tile.fill(0x2c3e50)
        tile.stroke({ width: 1, color: 0x34495e })
        
        this.addChild(tile)
      }
    }
  }

  private createCharacter() {
    this.character = new Character3D()
    // Start at center of extended grid (in world coordinates)
    const centerX = (this.extendedGridSize / 2) * this.tileSize
    const centerY = (this.extendedGridSize / 2) * this.tileSize
    this.character.setPosition(centerX, centerY)
    this.addChild(this.character)
  }

  /**
   * Handle click event - convert screen coordinates to world coordinates and pan scene
   */
  handleClick(screenX: number, screenY: number) {
    // Convert screen coordinates to world coordinates
    const worldX = screenX - this.x
    const worldY = screenY - this.y
    
    // Convert to grid coordinates for pathfinding
    const gridX = Math.floor(worldX / this.tileSize)
    const gridY = Math.floor(worldY / this.tileSize)
    
    // Clamp to extended grid bounds (allows movement to all corners)
    const clampedGridX = Math.max(0, Math.min(this.extendedGridSize - 1, gridX))
    const clampedGridY = Math.max(0, Math.min(this.extendedGridSize - 1, gridY))
    
    // Get current character position in grid coordinates
    const currentPos = this.character.getPosition()
    const startGridX = Math.max(0, Math.min(this.extendedGridSize - 1, Math.floor(currentPos.x / this.tileSize)))
    const startGridY = Math.max(0, Math.min(this.extendedGridSize - 1, Math.floor(currentPos.y / this.tileSize)))
    
    // Calculate path (even though no obstacles, pathfinding will give us a straight path)
    this.grid = new PF.Grid(Array(this.extendedGridSize).fill(null).map(() => Array(this.extendedGridSize).fill(0)))
    const path = this.pathfinder.findPath(startGridX, startGridY, clampedGridX, clampedGridY, this.grid)
    
    if (path.length > 0) {
      // Convert grid coordinates back to world coordinates for movement
      const targetWorldX = clampedGridX * this.tileSize + this.tileSize / 2
      const targetWorldY = clampedGridY * this.tileSize + this.tileSize / 2
      this.character.moveTo(targetWorldX, targetWorldY)
    }
  }

  /**
   * Update scene position to keep character centered on screen
   */
  private updateScenePosition() {
    const characterPos = this.character.getPosition()
    
    // Character's position in the scene is its world position (direct mapping)
    this.character.x = characterPos.x
    this.character.y = characterPos.y
    
    // Calculate scene position so character appears at screen center
    // Update immediately to match character's constant movement
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
    // This ensures scene follows character at constant speed (no interpolation)
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
      Math.ceil(this.screenHeight / this.tileSize) + 20
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

