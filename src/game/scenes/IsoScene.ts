import { Container, Graphics } from 'pixi.js'
import { Character3D } from '../entities/Character3D'
import { Cube } from '../entities/Cube'
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
  private obstacles: Set<string> = new Set() // Store obstacle positions as "isoX,isoY"
  private obstacleCubes: Map<string, Cube> = new Map() // Store obstacle cubes by grid coordinates "isoX,isoY"
  private adjacentTiles: Graphics[] = [] // Store currently highlighted adjacent tiles
  private selectedCube: Cube | null = null // Currently selected cube
  private originalCubeColor: number = 0x8B4513 // Original brown color for cubes

  constructor(screenWidth: number, screenHeight: number) {
    super()
    
    // Enable zIndex sorting for proper cube rendering order
    this.sortableChildren = true
    
    this.screenWidth = screenWidth
    this.screenHeight = screenHeight
    
    // Calculate tileSize based on screen dimensions to maintain consistent proportions
    // Use a base tile size that scales with screen width (aim for ~10-15 tiles visible)
    // Divide by 3 to zoom out, then multiply by 1.5 to make tiles 1.5x bigger
    // Then divide by 2 to subdivide each tile into 4 (2x2 grid)
    const targetTilesVisible = 12
    const calculatedTileSize = Math.max(32, Math.min(128, (screenWidth / targetTilesVisible)))
    this.tileSize = ((calculatedTileSize / 3) * 1.5) / 2 // Divide by 2 to subdivide tiles into 4
    
    // Calculate extended grid size to cover the entire screen when panned
    // For isometric, we need more tiles to cover the diagonal view
    // Multiply by 2 to double the grid resolution (each original tile becomes 4 tiles)
    this.extendedGridSize = Math.max(
      this.gridSize * 2, 
      Math.ceil(this.screenWidth / this.tileSize) + 20,
      Math.ceil(this.screenHeight / (this.tileSize / 2)) + 20
    )
    
    // Initialize pathfinder with extended grid size
    // Enable diagonal movement (8 directions) but don't allow cutting corners through obstacles
    this.pathfinder = new PF.AStarFinder({
      allowDiagonal: true,
      dontCrossCorners: true
    })
    
    // Create obstacles positions first (for pathfinding)
    this.createRandomObstaclePositions()
    
    // Build pathfinding grid with obstacles marked as blocked
    const matrix = Array(this.extendedGridSize).fill(null).map(() => Array(this.extendedGridSize).fill(0))
    for (const obstacleKey of this.obstacles) {
      const parts = obstacleKey.split(',')
      if (parts.length >= 2 && parts[0] !== undefined && parts[1] !== undefined) {
        const isoX = Number(parts[0])
        const isoY = Number(parts[1])
        if (!isNaN(isoX) && !isNaN(isoY) && isoX >= 0 && isoX < this.extendedGridSize && isoY >= 0 && isoY < this.extendedGridSize) {
          const row = matrix[isoY]
          if (row) {
            row[isoX] = 1 // Mark as blocked (note: matrix uses [row][col] = [y][x])
          }
        }
      }
    }
    this.grid = new PF.Grid(matrix)

    this.createGrid()
    // Create obstacle cubes after grid so they appear on top
    this.createObstacleCubes()
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
    const obstacleColor = 0x404040 // Dark grey for obstacles
    const obstacleBorderColor = 0x505050 // Darker grey border for obstacles
    
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
        
        // Check if this tile is an obstacle
        const tileKey = `${isoX},${isoY}`
        const isObstacle = this.obstacles.has(tileKey)
        
        // Use dark grey for obstacles, normal grey for walkable tiles
        tile.fill(isObstacle ? obstacleColor : tileColor)
        tile.stroke({ width: 1, color: isObstacle ? obstacleBorderColor : borderColor })
        
        // Store tile reference by grid coordinates
        this.tiles.set(tileKey, tile)
        
        this.addChild(tile)
      }
    }
  }

  /**
   * Create random obstacle positions (for pathfinding)
   * Obstacles are placed randomly but avoid the character's starting position
   */
  private createRandomObstaclePositions() {
    this.obstacles.clear()
    
    // Calculate obstacle density (about 7.5% of tiles will be obstacles)
    const totalTiles = this.extendedGridSize * this.extendedGridSize
    const obstacleCount = Math.floor(totalTiles * 0.075)
    
    // Get character starting position to avoid placing obstacles there
    const centerIsoX = Math.round(this.extendedGridSize / 2)
    const centerIsoY = Math.round(this.extendedGridSize / 2)
    
    // Also avoid a small area around the character (3x3 tiles)
    const avoidRadius = 1
    
    // Generate random obstacle positions
    let placed = 0
    const maxAttempts = obstacleCount * 10 // Prevent infinite loop
    let attempts = 0
    
    while (placed < obstacleCount && attempts < maxAttempts) {
      attempts++
      
      const isoX = Math.floor(Math.random() * this.extendedGridSize)
      const isoY = Math.floor(Math.random() * this.extendedGridSize)
      const tileKey = `${isoX},${isoY}`
      
      // Skip if already an obstacle
      if (this.obstacles.has(tileKey)) {
        continue
      }
      
      // Skip if too close to character starting position
      const distanceX = Math.abs(isoX - centerIsoX)
      const distanceY = Math.abs(isoY - centerIsoY)
      if (distanceX <= avoidRadius && distanceY <= avoidRadius) {
        continue
      }
      
      // Add obstacle to set
      this.obstacles.add(tileKey)
      placed++
    }
  }

  /**
   * Create 3D cubes for obstacles
   * Obstacles are 3D cubes with brown color
   */
  /**
   * Create 3D cubes for obstacles
   * Obstacles are 3D cubes with brown color
   */
  private createObstacleCubes() {
    // Remove existing obstacle cubes
    for (const cube of this.obstacleCubes.values()) {
      cube.destroy()
      this.removeChild(cube)
    }
    this.obstacleCubes.clear()
    
    // Brown color for obstacles (0x8B4513 is saddle brown)
    const obstacleColor = 0x8B4513
    
    // Create 3D cube for each obstacle
    for (const obstacleKey of this.obstacles) {
      const parts = obstacleKey.split(',')
      if (parts.length >= 2 && parts[0] !== undefined && parts[1] !== undefined) {
        const isoX = Number(parts[0])
        const isoY = Number(parts[1])
        if (!isNaN(isoX) && !isNaN(isoY)) {
          const obstacleCube = new Cube(isoX, isoY, this.tileSize, obstacleColor)
          this.obstacleCubes.set(obstacleKey, obstacleCube)
          
          // Initial zIndex will be set by updateZOrdering() based on Y position
          // For now, set a base zIndex based on isometric position
          const screenPos = IsoUtils.isoToScreen(isoX, isoY, this.tileSize)
          obstacleCube.zIndex = Math.floor(screenPos.y * 10)
          
          this.addChild(obstacleCube)
        }
      }
    }
  }
  
  /**
   * Reset a tile to its default color (grey or dark grey for obstacles)
   */
  private resetTileColor(gridX: number, gridY: number) {
    const tileKey = `${gridX},${gridY}`
    const tile = this.tiles.get(tileKey)
    if (!tile) return
    
    const isObstacle = this.obstacles.has(tileKey)
    const tileColor = isObstacle ? 0x404040 : 0x808080 // Dark grey for obstacles, grey for walkable
    const borderColor = isObstacle ? 0x505050 : 0xb0b0b0
    
    tile.clear()
    const screenPos = IsoUtils.isoToScreen(gridX, gridY, this.tileSize)
    const halfWidth = this.tileSize / 2
    const halfHeight = this.tileSize / 4
    const scale = 2.0
    const scaledHalfWidth = halfWidth * scale
    const scaledHalfHeight = halfHeight * scale
    
    tile.poly([
      screenPos.x, screenPos.y - scaledHalfHeight,
      screenPos.x + scaledHalfWidth, screenPos.y,
      screenPos.x, screenPos.y + scaledHalfHeight,
      screenPos.x - scaledHalfWidth, screenPos.y
    ])
    tile.fill(tileColor)
    tile.stroke({ width: 1, color: borderColor })
  }

  /**
   * Highlight a target tile in yellow and adjacent tiles in green
   */
  private highlightTargetTile(gridX: number, gridY: number) {
    const tileKey = `${gridX},${gridY}`
    
    // Reset previous selected tile and adjacent tiles
    if (this.selectedTile && this.selectedTileKey) {
      this.resetTileColor(
        parseInt(this.selectedTileKey.split(',')[0] || '0'),
        parseInt(this.selectedTileKey.split(',')[1] || '0')
      )
    }
    
    // Reset previous adjacent tiles
    for (const adjacentTile of this.adjacentTiles) {
      // Find the tile key for this adjacent tile
      for (const [key, tile] of this.tiles.entries()) {
        if (tile === adjacentTile) {
          const parts = key.split(',')
          if (parts.length >= 2 && parts[0] !== undefined && parts[1] !== undefined) {
            const adjX = parseInt(parts[0])
            const adjY = parseInt(parts[1])
            if (!isNaN(adjX) && !isNaN(adjY)) {
              this.resetTileColor(adjX, adjY)
            }
          }
          break
        }
      }
    }
    this.adjacentTiles = []
    
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
    
    // Highlight adjacent tiles in green (if not obstacles)
    const adjacentPositions = [
      { x: gridX + 1, y: gridY }, // East
      { x: gridX - 1, y: gridY }, // West
      { x: gridX, y: gridY + 1 }, // South
      { x: gridX, y: gridY - 1 }  // North
    ]
    
    for (const pos of adjacentPositions) {
      // Check bounds
      if (pos.x < 0 || pos.x >= this.extendedGridSize || pos.y < 0 || pos.y >= this.extendedGridSize) {
        continue
      }
      
      const adjTileKey = `${pos.x},${pos.y}`
      
      // Skip if it's an obstacle
      if (this.obstacles.has(adjTileKey)) {
        continue
      }
      
      const adjTile = this.tiles.get(adjTileKey)
      if (adjTile) {
        adjTile.clear()
        const adjScreenPos = IsoUtils.isoToScreen(pos.x, pos.y, this.tileSize)
        const halfWidth = this.tileSize / 2
        const halfHeight = this.tileSize / 4
        const scale = 2.0
        const scaledHalfWidth = halfWidth * scale
        const scaledHalfHeight = halfHeight * scale
        
        adjTile.poly([
          adjScreenPos.x, adjScreenPos.y - scaledHalfHeight,
          adjScreenPos.x + scaledHalfWidth, adjScreenPos.y,
          adjScreenPos.x, adjScreenPos.y + scaledHalfHeight,
          adjScreenPos.x - scaledHalfWidth, adjScreenPos.y
        ])
        adjTile.fill(0x00ff00) // Green
        adjTile.stroke({ width: 1, color: 0x00cc00 }) // Darker green border
        
        this.adjacentTiles.push(adjTile)
      }
    }
  }

  private createCharacter() {
    this.character = new Character3D()
    // Set initial scale based on tile size
    this.character.updateScale(this.tileSize)
    // Start at center of extended grid (in isometric grid coordinates)
    // Round to nearest integer to ensure character is exactly at a tile center
    const centerIsoX = Math.round(this.extendedGridSize / 2)
    const centerIsoY = Math.round(this.extendedGridSize / 2)
    
    // Convert isometric grid coordinates to screen coordinates
    const screenPos = IsoUtils.isoToScreen(centerIsoX, centerIsoY, this.tileSize)
    
    // Set character position in screen coordinates (world space)
    this.character.setPosition(screenPos.x, screenPos.y)
    
    // Set initial zIndex based on Y position (will be updated dynamically)
    this.character.zIndex = Math.floor(screenPos.y * 10)
    
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
    
    // First, check if click is on a cube (check entire cube area, not just base)
    let clickedCube: Cube | null = null
    let clickedCubeKey: string | null = null
    
    for (const [cubeKey, cube] of this.obstacleCubes.entries()) {
      if (cube.isPointInside(worldX, worldY)) {
        clickedCube = cube
        clickedCubeKey = cubeKey
        break
      }
    }
    
    let clampedGridX: number
    let clampedGridY: number
    
    // If a cube was clicked, use its position
    if (clickedCube && clickedCubeKey) {
      const parts = clickedCubeKey.split(',')
      if (parts.length >= 2 && parts[0] !== undefined && parts[1] !== undefined) {
        clampedGridX = Number(parts[0])
        clampedGridY = Number(parts[1])
      } else {
        return
      }
    } else {
      // Find the exact tile that contains the click point
      const clickedTile = this.findTileAtScreenPosition(worldX, worldY)
      if (!clickedTile) return
      
      clampedGridX = clickedTile.gridX
      clampedGridY = clickedTile.gridY
    }
    
    // Get current character position in isometric grid coordinates
    const currentPos = this.character.getPosition()
    const currentIso = IsoUtils.screenToIso(currentPos.x, currentPos.y, this.tileSize)
    const startGridX = Math.max(0, Math.min(this.extendedGridSize - 1, Math.floor(currentIso.x)))
    const startGridY = Math.max(0, Math.min(this.extendedGridSize - 1, Math.floor(currentIso.y)))
    
    // Rebuild grid with obstacles marked as blocked (1 = blocked, 0 = walkable)
    const matrix = Array(this.extendedGridSize).fill(null).map(() => Array(this.extendedGridSize).fill(0))
    
    // Mark obstacles as blocked in the pathfinding grid
    for (const obstacleKey of this.obstacles) {
      const parts = obstacleKey.split(',')
      if (parts.length >= 2 && parts[0] !== undefined && parts[1] !== undefined) {
        const isoX = Number(parts[0])
        const isoY = Number(parts[1])
        if (!isNaN(isoX) && !isNaN(isoY) && isoX >= 0 && isoX < this.extendedGridSize && isoY >= 0 && isoY < this.extendedGridSize) {
          const row = matrix[isoY]
          if (row) {
            row[isoX] = 1 // Mark as blocked (note: matrix uses [row][col] = [y][x])
          }
        }
      }
    }
    
    this.grid = new PF.Grid(matrix)
    
    // Check if clicked tile is an obstacle (cube)
    const clickedTileKey = `${clampedGridX},${clampedGridY}`
    const isCubeClicked = this.obstacles.has(clickedTileKey)
    
    // Deselect previous cube if any
    if (this.selectedCube) {
      this.selectedCube.setColor(this.originalCubeColor)
      this.selectedCube = null
    }
    
    let targetGridX = clampedGridX
    let targetGridY = clampedGridY
    let characterTargetX = clampedGridX
    let characterTargetY = clampedGridY
    
    // If a cube was clicked, select it and change its color
    if (isCubeClicked) {
      const clickedCube = this.obstacleCubes.get(clickedTileKey)
      if (clickedCube) {
        this.selectedCube = clickedCube
        // Lighten the brown color (0x8B4513 -> lighter brown)
        const lighterBrown = this.lightenCubeColor(this.originalCubeColor, 0.3)
        clickedCube.setColor(lighterBrown)
      }
      
      // The yellow target tile should be placed UNDER the cube (on the cube's tile)
      // So targetGridX and targetGridY remain as clampedGridX and clampedGridY
      // But we still need to find an adjacent tile for the character to move to
      
      // The 4 adjacent positions around the cube
      const adjacentPositions = [
        { x: clampedGridX + 1, y: clampedGridY }, // East
        { x: clampedGridX - 1, y: clampedGridY }, // West
        { x: clampedGridX, y: clampedGridY + 1 }, // South
        { x: clampedGridX, y: clampedGridY - 1 }  // North
      ]
      
      // Filter valid adjacent tiles (within bounds and not obstacles)
      const validAdjacentTiles = adjacentPositions.filter(pos => {
        if (pos.x < 0 || pos.x >= this.extendedGridSize || pos.y < 0 || pos.y >= this.extendedGridSize) {
          return false
        }
        const tileKey = `${pos.x},${pos.y}`
        return !this.obstacles.has(tileKey)
      })
      
      if (validAdjacentTiles.length === 0) {
        return // No valid position to stand in front of the cube
      }
      
      // Find the closest adjacent tile to the character's current position
      let closestTile = validAdjacentTiles[0]!
      let minDistance = Infinity
      
      for (const tile of validAdjacentTiles) {
        const dx = tile.x - startGridX
        const dy = tile.y - startGridY
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < minDistance) {
          minDistance = distance
          closestTile = tile
        }
      }
      
      // Character moves to adjacent tile, but target highlight is on the cube
      targetGridX = clampedGridX
      targetGridY = clampedGridY
      
      // Store the adjacent tile for character movement
      characterTargetX = closestTile.x
      characterTargetY = closestTile.y
    } else {
      // Normal tile clicked, character moves to adjacent tile
      characterTargetX = targetGridX
      characterTargetY = targetGridY
    }
    
    // Highlight the target tile in yellow (under the cube if cube clicked, otherwise on the clicked tile)
    this.highlightTargetTile(targetGridX, targetGridY)
    
    // If a cube was clicked, character should go directly to the adjacent tile (green tile)
    // No need to find another adjacent tile
    if (isCubeClicked) {
      // Character goes directly to the adjacent tile we found
      const path = this.pathfinder.findPath(startGridX, startGridY, characterTargetX, characterTargetY, this.grid)
      if (path.length === 0) {
        return // No path found
      }
      
      const pathToFollow = path.length > 1 ? path.slice(1) : path
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
      
      if (screenPath.length === 0) {
        const targetScreenPos = IsoUtils.isoToScreen(characterTargetX, characterTargetY, this.tileSize)
        this.character.moveTo(targetScreenPos.x, targetScreenPos.y)
        return
      }
      
      // Face towards the cube
      const targetScreenPos = IsoUtils.isoToScreen(targetGridX, targetGridY, this.tileSize)
      this.character.moveAlongPath(screenPath, undefined, targetScreenPos)
      return
    }
    
    // Normal tile clicked: find the closest adjacent tile (green tile) to the character's starting position
    // The 4 adjacent positions around the target tile
    const adjacentPositions = [
      { x: characterTargetX + 1, y: characterTargetY }, // East
      { x: characterTargetX - 1, y: characterTargetY }, // West
      { x: characterTargetX, y: characterTargetY + 1 }, // South
      { x: characterTargetX, y: characterTargetY - 1 }  // North
    ]
    
    // Filter valid adjacent tiles (within bounds and not obstacles)
    const validAdjacentTiles = adjacentPositions.filter(pos => {
      if (pos.x < 0 || pos.x >= this.extendedGridSize || pos.y < 0 || pos.y >= this.extendedGridSize) {
        return false
      }
      const tileKey = `${pos.x},${pos.y}`
      return !this.obstacles.has(tileKey)
    })
    
    // If no valid adjacent tiles, use target tile itself
    if (validAdjacentTiles.length === 0) {
      // Fallback to target tile if no adjacent tiles are available
      const path = this.pathfinder.findPath(startGridX, startGridY, characterTargetX, characterTargetY, this.grid)
      if (path.length === 0) {
        return // No path found
      }
      
      const pathToFollow = path.length > 1 ? path.slice(1) : path
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
      
      if (screenPath.length === 0) {
        const targetScreenPos = IsoUtils.isoToScreen(characterTargetX, characterTargetY, this.tileSize)
        this.character.moveTo(targetScreenPos.x, targetScreenPos.y)
        return
      }
      
      const targetScreenPos = IsoUtils.isoToScreen(characterTargetX, characterTargetY, this.tileSize)
      this.character.moveAlongPath(screenPath, undefined, targetScreenPos)
      return
    }
    
    // Calculate distance from start position to each valid adjacent tile
    // Find the closest one
    let closestTile = validAdjacentTiles[0]!
    let minDistance = Infinity
    
    for (const tile of validAdjacentTiles) {
      // Calculate Manhattan distance (or Euclidean, both work for grid)
      const dx = tile.x - startGridX
      const dy = tile.y - startGridY
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < minDistance) {
        minDistance = distance
        closestTile = tile
      }
    }
    
    // Calculate path to the closest adjacent tile
    const stopTileX = closestTile.x
    const stopTileY = closestTile.y
    const finalPath = this.pathfinder.findPath(startGridX, startGridY, stopTileX, stopTileY, this.grid)
    
    // Ensure we have a valid path
    if (finalPath.length === 0) {
      return // No valid path found
    }
    
    // Skip the first point if it's the current position
    const pathToFollow = finalPath.length > 1 ? finalPath.slice(1) : finalPath
    
    // Debug: ensure pathToFollow is not empty
    if (pathToFollow.length === 0) {
      // If path only has one point (current position), use the target directly
      const targetScreenPos = IsoUtils.isoToScreen(targetGridX, targetGridY, this.tileSize)
      this.character.moveTo(targetScreenPos.x, targetScreenPos.y)
      return
    }
    
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
    
    // Ensure screen path is not empty
    if (screenPath.length === 0) {
      return // No valid screen path
    }
    
    // Calculate target tile position for final orientation
    // If a cube was clicked, face towards the cube, otherwise face the target tile
    const finalTargetX = isCubeClicked ? clampedGridX : characterTargetX
    const finalTargetY = isCubeClicked ? clampedGridY : characterTargetY
    const targetScreenPos = IsoUtils.isoToScreen(finalTargetX, finalTargetY, this.tileSize)
    
    // Move character along the path (using screen coordinates)
    // Pass target position for final orientation
    this.character.moveAlongPath(screenPath, undefined, targetScreenPos)
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
   * Handle mouse move event - rotate character towards mouse when not moving
   */
  handleMouseMove(screenX: number, screenY: number) {
    // Convert screen coordinates to world coordinates (relative to scene)
    const worldX = screenX - this.x
    const worldY = screenY - this.y
    
    // Rotate character towards mouse position (only when not moving)
    this.character.rotateTowardsPosition(worldX, worldY)
  }

  /**
   * Update the scene (call in game loop)
   * @param deltaTime Time elapsed since last frame in seconds (from ticker.deltaTime)
   */
  update(deltaTime: number = 1/60) {
    // Update character movement (time-based for consistent speed)
    this.character.update(deltaTime)
    
    // Update obstacle cubes rendering
    for (const cube of this.obstacleCubes.values()) {
      cube.update(deltaTime)
    }
    
    // Update scene position immediately to keep character centered
    this.updateScenePosition()
    
    // Update z-ordering based on Y position (depth sorting)
    this.updateZOrdering()
  }

  /**
   * Update z-ordering to create depth illusion
   * Objects with higher Y (lower on screen) are closer and should render on top
   */
  private updateZOrdering() {
    // Get character position in world coordinates (relative to scene)
    const characterPos = this.character.getPosition()
    const characterY = characterPos.y
    
    // Update character zIndex based on Y position
    // Use a large multiplier to ensure character can be above or below cubes
    // Higher Y = closer to camera = higher zIndex
    this.character.zIndex = Math.floor(characterY * 10)
    
    // Update each cube's zIndex based on its Y position
    // We need to consider the cube's base position (where it sits on the tile)
    for (const cube of this.obstacleCubes.values()) {
      const cubePos = cube.getScreenPosition()
      const cubeY = cubePos.y
      
      // Cube zIndex based on its base position
      // Higher Y = closer to camera = higher zIndex
      cube.zIndex = Math.floor(cubeY * 10)
    }
  }

  /**
   * Update screen dimensions (call when window is resized)
   */
  updateScreenSize(width: number, height: number) {
    this.screenWidth = width
    this.screenHeight = height
    
    // Recalculate tileSize based on new screen dimensions
    // Divide by 3 to zoom out, then multiply by 1.5 to make tiles 1.5x bigger
    // Then divide by 2 to subdivide each tile into 4 (2x2 grid)
    const targetTilesVisible = 12
    const calculatedTileSize = Math.max(32, Math.min(128, (width / targetTilesVisible)))
    const newTileSize = ((calculatedTileSize / 3) * 1.5) / 2 // Divide by 2 to subdivide tiles into 4
    
    // Only recreate grid if tileSize changed significantly (more than 10%)
    if (Math.abs(newTileSize - this.tileSize) / this.tileSize > 0.1) {
      this.tileSize = newTileSize
      
      // Update character scale to match new tile size
      if (this.character) {
        this.character.updateScale(this.tileSize)
      }
      
      // Update obstacle cubes scale to match new tile size
      for (const cube of this.obstacleCubes.values()) {
        cube.updateScale(this.tileSize)
      }
      
      // Recreate grid with new tile size
      // Multiply by 2 to double the grid resolution (each original tile becomes 4 tiles)
      this.tiles.clear()
      this.removeChildren()
      this.extendedGridSize = Math.max(
        this.gridSize * 2, 
        Math.ceil(this.screenWidth / this.tileSize) + 20,
        Math.ceil(this.screenHeight / (this.tileSize / 2)) + 20
      )
      const matrix = Array(this.extendedGridSize).fill(null).map(() => Array(this.extendedGridSize).fill(0))
      this.grid = new PF.Grid(matrix)
      this.createRandomObstaclePositions() // Recreate obstacle positions for new grid size
      // Build pathfinding grid with obstacles marked as blocked
      for (const obstacleKey of this.obstacles) {
        const parts = obstacleKey.split(',')
        if (parts.length >= 2 && parts[0] !== undefined && parts[1] !== undefined) {
          const isoX = Number(parts[0])
          const isoY = Number(parts[1])
          if (!isNaN(isoX) && !isNaN(isoY) && isoX >= 0 && isoX < this.extendedGridSize && isoY >= 0 && isoY < this.extendedGridSize) {
            const row = matrix[isoY]
            if (row) {
              row[isoX] = 1
            }
          }
        }
      }
      this.grid = new PF.Grid(matrix)
      this.createGrid()
      this.createObstacleCubes() // Create obstacle cubes after grid
      this.addChild(this.character)
    } else {
      // Just update extended grid size if needed
      // Multiply by 2 to double the grid resolution (each original tile becomes 4 tiles)
      const newExtendedGridSize = Math.max(
        this.gridSize * 2, 
        Math.ceil(this.screenWidth / this.tileSize) + 20,
        Math.ceil(this.screenHeight / (this.tileSize / 2)) + 20
      )
      
      // Only update if grid size changed significantly
      if (Math.abs(newExtendedGridSize - this.extendedGridSize) > 5) {
        this.extendedGridSize = newExtendedGridSize
        // Recreate obstacle positions for new grid size
        this.createRandomObstaclePositions()
        // Recreate pathfinder grid with obstacles
        const matrix = Array(this.extendedGridSize).fill(null).map(() => Array(this.extendedGridSize).fill(0))
        for (const obstacleKey of this.obstacles) {
          const parts = obstacleKey.split(',')
          if (parts.length >= 2 && parts[0] !== undefined && parts[1] !== undefined) {
            const isoX = Number(parts[0])
            const isoY = Number(parts[1])
            if (!isNaN(isoX) && !isNaN(isoY) && isoX >= 0 && isoX < this.extendedGridSize && isoY >= 0 && isoY < this.extendedGridSize) {
              const row = matrix[isoY]
              if (row) {
                row[isoX] = 1
              }
            }
          }
        }
        this.grid = new PF.Grid(matrix)
        // Recreate obstacle cubes
        this.createObstacleCubes()
      }
    }
    
    // Recenter character by updating scene position
    this.updateScenePosition()
  }

  /**
   * Lighten a color by a percentage (for cube selection)
   */
  private lightenCubeColor(color: number, amount: number): number {
    const r = Math.min(255, ((color >> 16) & 0xFF) + (255 * amount))
    const g = Math.min(255, ((color >> 8) & 0xFF) + (255 * amount))
    const b = Math.min(255, (color & 0xFF) + (255 * amount))
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b)
  }

  getCharacter(): Character3D {
    return this.character
  }

  // Keep for backward compatibility
  getSphere(): Character3D {
    return this.character
  }
}
