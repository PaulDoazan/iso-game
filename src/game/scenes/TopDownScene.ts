import { Container, Graphics } from 'pixi.js'
import { Sphere } from '../entities/Sphere'
import * as PF from 'pathfinding'

export class TopDownScene extends Container {
  private gridSize: number = 20
  private extendedGridSize: number = 0
  private tileSize: number = 64
  private sphere!: Sphere
  private pathfinder: PF.AStarFinder
  private grid: PF.Grid
  private screenWidth: number = 0
  private screenHeight: number = 0
  private targetSceneX: number = 0
  private targetSceneY: number = 0
  private currentSceneX: number = 0
  private currentSceneY: number = 0
  private isPanning: boolean = false
  private panSpeed: number = 0.05

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
    this.createSphere()
    this.updateScenePosition(true) // Set initial position immediately
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

  private createSphere() {
    this.sphere = new Sphere()
    // Start at center of extended grid (in world coordinates)
    const centerX = (this.extendedGridSize / 2) * this.tileSize
    const centerY = (this.extendedGridSize / 2) * this.tileSize
    this.sphere.setPosition(centerX, centerY)
    this.addChild(this.sphere)
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
    
    // Get current sphere position in grid coordinates
    const currentPos = this.sphere.getPosition()
    const startGridX = Math.max(0, Math.min(this.extendedGridSize - 1, Math.floor(currentPos.x / this.tileSize)))
    const startGridY = Math.max(0, Math.min(this.extendedGridSize - 1, Math.floor(currentPos.y / this.tileSize)))
    
    // Calculate path (even though no obstacles, pathfinding will give us a straight path)
    this.grid = new PF.Grid(Array(this.extendedGridSize).fill(null).map(() => Array(this.extendedGridSize).fill(0)))
    const path = this.pathfinder.findPath(startGridX, startGridY, clampedGridX, clampedGridY, this.grid)
    
    if (path.length > 0) {
      // Convert grid coordinates back to world coordinates for movement
      const targetWorldX = clampedGridX * this.tileSize + this.tileSize / 2
      const targetWorldY = clampedGridY * this.tileSize + this.tileSize / 2
      this.sphere.moveTo(targetWorldX, targetWorldY)
    }
  }

  /**
   * Update scene position to keep sphere centered on screen
   */
  private updateScenePosition(immediate: boolean = false) {
    const spherePos = this.sphere.getPosition()
    
    // Sphere's position in the scene is its world position (direct mapping)
    this.sphere.x = spherePos.x
    this.sphere.y = spherePos.y
    
    // Calculate target scene position so sphere appears at screen center
    this.targetSceneX = this.screenWidth / 2 - spherePos.x
    this.targetSceneY = this.screenHeight / 2 - spherePos.y
    
    if (immediate) {
      // Set position immediately (for initial setup)
      this.currentSceneX = this.targetSceneX
      this.currentSceneY = this.targetSceneY
      this.x = this.currentSceneX
      this.y = this.currentSceneY
      this.isPanning = false
    } else {
      // Start panning if not already at target
      if (Math.abs(this.targetSceneX - this.currentSceneX) > 0.1 || Math.abs(this.targetSceneY - this.currentSceneY) > 0.1) {
        this.isPanning = true
      }
    }
  }

  /**
   * Update the scene (call in game loop)
   */
  update() {
    // Update sphere's smooth movement
    const sphereMoving = this.sphere.update()
    
    // Continuously update scene position to keep sphere centered as it moves
    // Always update the target position when sphere is moving
    if (sphereMoving) {
      const spherePos = this.sphere.getPosition()
      
      // Update sphere's position in the scene (direct world coordinate mapping)
      this.sphere.x = spherePos.x
      this.sphere.y = spherePos.y
      
      // Continuously update target scene position to keep sphere centered
      this.targetSceneX = this.screenWidth / 2 - spherePos.x
      this.targetSceneY = this.screenHeight / 2 - spherePos.y
      this.isPanning = true
    } else if (this.isPanning) {
      // Update scene position one more time when sphere stops moving
      this.updateScenePosition()
    }
    
    // Pan the scene smoothly
    if (this.isPanning) {
      const dx = this.targetSceneX - this.currentSceneX
      const dy = this.targetSceneY - this.currentSceneY
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < 0.1) {
        // Reached target
        this.currentSceneX = this.targetSceneX
        this.currentSceneY = this.targetSceneY
        this.isPanning = false
      } else {
        // Smooth interpolation
        this.currentSceneX += dx * this.panSpeed
        this.currentSceneY += dy * this.panSpeed
      }
      
      this.x = this.currentSceneX
      this.y = this.currentSceneY
    }
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
    
    // Recenter sphere by updating scene position
    this.updateScenePosition(true)
  }

  getSphere(): Sphere {
    return this.sphere
  }
}

