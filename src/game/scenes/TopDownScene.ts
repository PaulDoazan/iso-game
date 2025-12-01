import { Container, Graphics } from 'pixi.js'
import { Character3D } from '../entities/Character3D'
import * as PF from 'pathfinding'

export class TopDownScene extends Container {
  private gridSize: number = 20
  private extendedGridSize: number = 0
  private tileSize: number = 64 / 1.5
  private character!: Character3D
  private pathfinder: PF.AStarFinder
  private grid: PF.Grid
  private screenWidth: number = 0
  private screenHeight: number = 0
  private currentSceneX: number = 0
  private currentSceneY: number = 0
  private obstacles: Graphics[] = []
  private obstaclePositions: Set<string> = new Set() // Store obstacle grid positions as "x,y"

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
    this.createObstacles()
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

  private createObstacles() {
    // Calculate number of obstacles (about 10-15% of the grid)
    const numObstacles = Math.floor(this.extendedGridSize * this.extendedGridSize * 0.12)
    
    // Get character starting position to avoid placing obstacles there
    const characterStartX = Math.floor(this.extendedGridSize / 2)
    const characterStartY = Math.floor(this.extendedGridSize / 2)
    
    // Create pathfinding matrix with obstacles
    const matrix = Array(this.extendedGridSize).fill(null).map(() => Array(this.extendedGridSize).fill(0))
    
    let obstaclesPlaced = 0
    const maxAttempts = numObstacles * 10 // Prevent infinite loops
    
    while (obstaclesPlaced < numObstacles && obstaclesPlaced < maxAttempts) {
      const gridX = Math.floor(Math.random() * this.extendedGridSize)
      const gridY = Math.floor(Math.random() * this.extendedGridSize)
      
      // Don't place obstacle at character starting position or adjacent cells
      const distanceFromStart = Math.abs(gridX - characterStartX) + Math.abs(gridY - characterStartY)
      if (distanceFromStart <= 2) {
        continue
      }
      
      // Don't place obstacle if one already exists at this position
      const positionKey = `${gridX},${gridY}`
      if (this.obstaclePositions.has(positionKey)) {
        continue
      }
      
      // Mark as obstacle in pathfinding grid
      if (gridX >= 0 && gridX < this.extendedGridSize && gridY >= 0 && gridY < this.extendedGridSize) {
        const row = matrix[gridY]
        if (row) {
          row[gridX] = 1
          this.obstaclePositions.add(positionKey)
        }
      }
      
      // Create visual obstacle
      const obstacle = new Graphics()
      const worldX = gridX * this.tileSize
      const worldY = gridY * this.tileSize
      
      // Draw obstacle as a square tile (same size as grid tiles)
      obstacle.rect(worldX, worldY, this.tileSize, this.tileSize)
      obstacle.fill(0x8b4513) // Brown color for obstacles
      obstacle.stroke({ width: 2, color: 0x654321 }) // Darker brown border
      
      this.addChild(obstacle)
      this.obstacles.push(obstacle)
      
      obstaclesPlaced++
    }
    
    // Update pathfinding grid with obstacles
    this.grid = new PF.Grid(matrix)
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
    let clampedGridX = Math.max(0, Math.min(this.extendedGridSize - 1, gridX))
    let clampedGridY = Math.max(0, Math.min(this.extendedGridSize - 1, gridY))
    
    // Get current character position in grid coordinates
    const currentPos = this.character.getPosition()
    const startGridX = Math.max(0, Math.min(this.extendedGridSize - 1, Math.floor(currentPos.x / this.tileSize)))
    const startGridY = Math.max(0, Math.min(this.extendedGridSize - 1, Math.floor(currentPos.y / this.tileSize)))
    
    // Check if target is an obstacle
    const targetKey = `${clampedGridX},${clampedGridY}`
    if (this.obstaclePositions.has(targetKey)) {
      // Target is an obstacle, find nearest walkable cell
      let nearestX = clampedGridX
      let nearestY = clampedGridY
      let found = false
      const maxSearchRadius = 3
      
      for (let radius = 1; radius <= maxSearchRadius && !found; radius++) {
        for (let dx = -radius; dx <= radius && !found; dx++) {
          for (let dy = -radius; dy <= radius && !found; dy++) {
            const checkX = clampedGridX + dx
            const checkY = clampedGridY + dy
            if (checkX >= 0 && checkX < this.extendedGridSize && 
                checkY >= 0 && checkY < this.extendedGridSize) {
              const checkKey = `${checkX},${checkY}`
              if (!this.obstaclePositions.has(checkKey)) {
                nearestX = checkX
                nearestY = checkY
                found = true
              }
            }
          }
        }
      }
      
      // If no walkable cell found nearby, don't move
      if (!found) {
        return
      }
      
      clampedGridX = nearestX
      clampedGridY = nearestY
    }
    
    // Rebuild grid with obstacles (in case grid was reset)
    const matrix = Array(this.extendedGridSize).fill(null).map(() => Array(this.extendedGridSize).fill(0))
    // Mark obstacle positions as unwalkable
    this.obstaclePositions.forEach(positionKey => {
      const parts = positionKey.split(',')
      const x = Number(parts[0])
      const y = Number(parts[1])
      if (!isNaN(x) && !isNaN(y) && x >= 0 && x < this.extendedGridSize && y >= 0 && y < this.extendedGridSize) {
        matrix[y]![x] = 1
      }
    })
    this.grid = new PF.Grid(matrix)
    
    // Calculate path (pathfinding will navigate around obstacles)
    const path = this.pathfinder.findPath(startGridX, startGridY, clampedGridX, clampedGridY, this.grid)
    
    if (path.length > 0) {
      // Skip the first point if it's the current position (pathfinding includes start)
      const pathToFollow = path.length > 1 ? path.slice(1) : path
      // Convert path to tuple array format [number, number][]
      const pathTuples: Array<[number, number]> = pathToFollow
        .map((point) => {
          if (point && point.length >= 2 && point[0] !== undefined && point[1] !== undefined) {
            return [point[0], point[1]] as [number, number]
          }
          return null
        })
        .filter((point): point is [number, number] => point !== null)
      // Move character along the path to navigate around obstacles
      if (pathTuples.length > 0) {
        this.character.moveAlongPath(pathTuples, this.tileSize)
      }
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
      // Recreate pathfinder grid with obstacles
      const matrix = Array(this.extendedGridSize).fill(null).map(() => Array(this.extendedGridSize).fill(0))
      // Mark obstacle positions as unwalkable
      this.obstaclePositions.forEach(positionKey => {
        const parts = positionKey.split(',')
        const x = Number(parts[0])
        const y = Number(parts[1])
        if (!isNaN(x) && !isNaN(y) && x >= 0 && x < this.extendedGridSize && y >= 0 && y < this.extendedGridSize) {
          matrix[y]![x] = 1
        }
      })
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

