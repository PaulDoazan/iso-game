import { Container, Sprite, Texture } from 'pixi.js'
import * as THREE from 'three'

/**
 * 3D Character entity using Three.js
 * 
 * This creates a 3D character that can be integrated into the PixiJS scene.
 * The character rotates to face the direction of movement, providing a full
 * 360-degree view like in Brawl Stars.
 */
export class Character3D extends Container {
  private currentX: number = 0
  private currentY: number = 0
  private targetX: number = 0
  private targetY: number = 0
  private isMoving: boolean = false
  private moveSpeed: number = 6000 // Constant movement speed (pixels per second)
  private path: Array<{ x: number; y: number }> = [] // Path waypoints to follow
  private currentPathIndex: number = 0 // Current waypoint index in path
  private finalTargetPosition: { x: number; y: number } | null = null // Final target to face when arriving
  
  // Rotation state for smooth rotation
  private currentRotationY: number = 0 // Current rotation angle in radians
  private targetRotationY: number = 0 // Target rotation angle in radians
  private rotationSpeed: number = 0.15 // Rotation interpolation speed (0-1) - slightly slower for more realistic feel
  private mouseRotationSpeed: number = 0.4 // Faster rotation speed for mouse following
  
  // Three.js components
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private character: THREE.Group
  private animationMixer: THREE.AnimationMixer | null = null
  private clock: THREE.Clock
  
  // Leg references for walking animation (Groups that contain the leg meshes)
  private leftLeg: THREE.Group | null = null
  private rightLeg: THREE.Group | null = null
  
  // Base Y offset for character position in Three.js scene
  private baseYOffset: number = 0
  
  // For rendering Three.js to PixiJS
  private threeCanvas: HTMLCanvasElement
  private threeTexture: Texture
  private threeSprite: Sprite

  constructor() {
    super()
    
    // Initialize Three.js components
    this.clock = new THREE.Clock()
    
    // Create Three.js scene
    this.scene = new THREE.Scene()
    this.scene.background = null // Transparent background
    
    // Set up camera for isometric top-down view (like Brawl Stars)
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000)
    // Position camera at an angle for isometric view
    this.camera.position.set(8, 12, 8)
    this.camera.lookAt(0, 0, 0)
    
    // Initialize rotation state - start at 0 degrees
    this.currentRotationY = 0
    this.targetRotationY = 0
    
    // Create WebGL renderer
    this.threeCanvas = document.createElement('canvas')
    this.threeCanvas.width = 256
    this.threeCanvas.height = 256
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: this.threeCanvas,
      alpha: true,
      antialias: true,
      premultipliedAlpha: false // Important for proper transparency
    })
    this.renderer.setSize(256, 256)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    // Clear with transparent background
    this.renderer.setClearColor(0x000000, 0) // Transparent clear color
    
    // Create 3D character
    this.character = this.create3DCharacter()
    // Store the base Y offset from the group position
    this.baseYOffset = this.character.position.y
    // Scale character down by 1.5
    this.character.scale.set(1 / 1.5, 1 / 1.5, 1 / 1.5)
    this.scene.add(this.character)
    
    // Apply initial rotation
    this.character.rotation.y = this.currentRotationY
    
    // Add lighting
    this.setupLighting()
    
    // Render once to initialize the canvas before creating texture
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.render(this.scene, this.camera)
    
    // Create texture from Three.js renderer canvas
    this.threeTexture = Texture.from(this.threeCanvas)
    
    // Create sprite from texture
    this.threeSprite = new Sprite(this.threeTexture)
    this.threeSprite.anchor.set(0.5, 0.5)
    this.addChild(this.threeSprite)
  }

  /**
   * Create a simple 3D character (placeholder - can be replaced with GLTF model)
   */
  private create3DCharacter(): THREE.Group {
    const group = new THREE.Group()
    
    // Body (cylinder)
    const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.5, 1.2, 8)
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x00bfff }) // Vibrant cyan blue
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 0.6
    group.add(body)
    
    // Head (sphere)
    const headGeometry = new THREE.SphereGeometry(0.5, 16, 16)
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700 }) // Vibrant gold/yellow
    const head = new THREE.Mesh(headGeometry, headMaterial)
    head.position.y = 1.5
    group.add(head)
    
    // Hat (cylinder)
    const hatGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 8)
    const hatMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 }) // Pure red
    const hat = new THREE.Mesh(hatGeometry, hatMaterial)
    hat.position.y = 1.8
    group.add(hat)
    
    // Hat top (smaller cylinder)
    const hatTopGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 8)
    const hatTop = new THREE.Mesh(hatTopGeometry, hatMaterial)
    hatTop.position.y = 2.0
    group.add(hatTop)
    
    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 8)
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0x00bfff }) // Vibrant cyan blue
    
    // Left arm
    const leftArm = new THREE.Mesh(armGeometry, armMaterial)
    leftArm.position.set(-0.7, 0.8, 0)
    leftArm.rotation.z = Math.PI / 6
    group.add(leftArm)
    
    // Right arm
    const rightArm = new THREE.Mesh(armGeometry, armMaterial)
    rightArm.position.set(0.7, 0.8, 0)
    rightArm.rotation.z = -Math.PI / 6
    group.add(rightArm)
    
    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.8, 8)
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x7f8c8d }) // Brighter gray
    
    // Left leg - use a group so rotation happens at the top (hip joint)
    const leftLegGroup = new THREE.Group()
    leftLegGroup.position.set(-0.3, 0, 0) // Position at hip joint (top of leg)
    const leftLegMesh = new THREE.Mesh(legGeometry, legMaterial)
    // Offset mesh downward so its top is at the group origin (pivot point)
    leftLegMesh.position.set(0, -0.4, 0) // Half the leg height (0.8/2 = 0.4)
    leftLegGroup.add(leftLegMesh)
    group.add(leftLegGroup)
    this.leftLeg = leftLegGroup
    
    // Right leg - use a group so rotation happens at the top (hip joint)
    const rightLegGroup = new THREE.Group()
    rightLegGroup.position.set(0.3, 0, 0) // Position at hip joint (top of leg)
    const rightLegMesh = new THREE.Mesh(legGeometry, legMaterial)
    // Offset mesh downward so its top is at the group origin (pivot point)
    rightLegMesh.position.set(0, -0.4, 0) // Half the leg height (0.8/2 = 0.4)
    rightLegGroup.add(rightLegMesh)
    group.add(rightLegGroup)
    this.rightLeg = rightLegGroup
    
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 8)
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 })
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    leftEye.position.set(-0.15, 1.5, 0.45)
    group.add(leftEye)
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    rightEye.position.set(0.15, 1.5, 0.45)
    group.add(rightEye)

    group.position.set(0, 0.5, 0)
    
    return group
  }

  /**
   * Set up lighting for the 3D scene
   */
  private setupLighting() {
    // Ambient light (soft overall lighting)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambientLight)
    
    // Directional light (main light source from above)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9)
    directionalLight.position.set(5, 10, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 1024
    directionalLight.shadow.mapSize.height = 1024
    this.scene.add(directionalLight)
    
    // Additional fill light
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3)
    fillLight.position.set(-5, 5, -5)
    this.scene.add(fillLight)
  }

  /**
   * Render Three.js scene to canvas
   * Called from update() to keep rendering in sync with PixiJS ticker
   */
  private renderThreeJS() {
    if (this.animationMixer) {
      const delta = this.clock.getDelta()
      this.animationMixer.update(delta)
    }
    
    // Apply rotation to character
    this.character.rotation.y = this.currentRotationY
    
    // Animate character when moving (simple bounce)
    const time = this.clock.getElapsedTime()
    if (this.isMoving) {
      
      // Animate legs for walking motion
      if (this.leftLeg && this.rightLeg) {
        // Walking animation: alternate leg movement
        // Use sine wave with phase offset to create alternating motion
        const walkSpeed = 12 // Speed of leg movement (1.5x faster)
        const legSwingAngle = Math.PI / 6 // 30 degrees swing
        
        // Left leg swings forward when right leg is back, and vice versa
        this.leftLeg.rotation.x = Math.sin(time * walkSpeed) * legSwingAngle
        this.rightLeg.rotation.x = Math.sin(time * walkSpeed + Math.PI) * legSwingAngle
      }
    } else {
      // Use base Y offset when not moving
      this.character.position.y = this.baseYOffset
      
      // Reset legs to neutral position when not moving
      if (this.leftLeg && this.rightLeg) {
        this.leftLeg.rotation.x = 0
        this.rightLeg.rotation.x = 0
      }
    }
    
    // Render Three.js scene
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.render(this.scene, this.camera)
    
    // Update PixiJS texture
    if (this.threeTexture?.baseTexture) {
      this.threeTexture.baseTexture.update()
    }
  }

  /**
   * Set the character's position in world coordinates immediately
   */
  setPosition(x: number, y: number) {
    this.currentX = x
    this.currentY = y
    this.targetX = x
    this.targetY = y
    this.isMoving = false
  }

  /**
   * Calculate rotation angle from screen-space movement direction
   * Uses smooth continuous rotation during movement (allows subdirections)
   * This provides fluid rotation in all 8 directions while moving
   */
  private calculateIsoRotation(dx: number, dy: number): number {
    // Normalize movement direction
    const length = Math.sqrt(dx * dx + dy * dy)
    if (length < 0.1) return this.targetRotationY
    
    // Use smooth rotation calculation (same as mouse following)
    // Calculate actual angle using atan2 for smooth continuous rotation
    let angle = Math.atan2(dy, dx)
    
    // Determine which quadrant/direction we're moving in
    // In isometric: 
    // - Bottom-left (dx < 0, dy > 0): correct - keep as is
    // - Top-right (dx > 0, dy < 0): correct - keep as is
    // - Top-left (dx < 0, dy < 0): needs clockwise rotation
    // - Bottom-right (dx > 0, dy > 0): needs clockwise rotation
    
    const isTopLeft = dx < 0 && dy < 0
    const isBottomRight = dx > 0 && dy > 0
    const isTopRight = dx > 0 && dy < 0
    const isBottomLeft = dx < 0 && dy > 0
    
    const isometricAngle = Math.atan(0.5) // ≈ 26.565° for 2:1 isometric
    
    // Apply different offset based on direction
    if (isTopLeft || isBottomRight) {
      // These directions need more clockwise rotation
      // Increase the angle to rotate more clockwise (add more offset)
      angle += isometricAngle + Math.PI / 6 + Math.PI / 36 // Add 30° + 5° = 35° correction for more clockwise rotation
    } else if (isTopRight || isBottomLeft) {
      // These directions are correct - keep current calculation
      angle += isometricAngle
    } else {
      // Edge cases - use default
      angle += isometricAngle
    }
    
    // Add 180 degrees (π) so character faces the direction it's looking at
    // Negate the angle to reverse rotation direction (clockwise movement = clockwise rotation)
    angle = -angle + Math.PI
    
    // Normalize to [-π, π]
    while (angle > Math.PI) angle -= Math.PI * 2
    while (angle < -Math.PI) angle += Math.PI * 2
    
    return angle
  }

  /**
   * Snap rotation to one of the 4 main isometric directions
   * Called when character arrives at destination
   * Uses targetRotationY to find the nearest main direction (towards the target)
   */
  private snapToMainDirection(): void {
    // The 4 main isometric directions: 0°, 90°, 180°, 270°
    const mainDirections: number[] = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]
    
    // Find the nearest main direction based on targetRotationY (direction towards target)
    let nearestDirection: number = mainDirections[0]!
    let smallestDiff = Math.abs(this.targetRotationY - mainDirections[0]!)
    
    // Normalize target rotation for comparison
    let normalizedTarget = this.targetRotationY
    while (normalizedTarget < 0) normalizedTarget += Math.PI * 2
    while (normalizedTarget >= Math.PI * 2) normalizedTarget -= Math.PI * 2
    
    for (const direction of mainDirections) {
      // Calculate difference considering wrap-around
      const diff1 = Math.abs(normalizedTarget - direction)
      const diff2 = Math.abs(normalizedTarget - (direction + Math.PI * 2))
      const diff3 = Math.abs(normalizedTarget - (direction - Math.PI * 2))
      const diff = Math.min(diff1, diff2, diff3)
      
      if (diff < smallestDiff) {
        smallestDiff = diff
        nearestDirection = direction
      }
    }
    
    // Snap to nearest main direction
    this.targetRotationY = nearestDirection
    this.currentRotationY = nearestDirection
  }

  /**
   * Move the character smoothly to a target world position
   */
  moveTo(x: number, y: number) {
    this.targetX = x
    this.targetY = y
    this.isMoving = true
    this.path = [] // Clear path when using direct movement
    this.currentPathIndex = 0
    
    // Calculate target rotation to face the new direction
    const dx = x - this.currentX
    const dy = y - this.currentY
    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      this.targetRotationY = this.calculateIsoRotation(dx, dy)
    }
  }

  /**
   * Move the character along a path (array of waypoints)
   * This is used for pathfinding to navigate around obstacles
   * @param path Array of waypoints in screen coordinates, or grid coordinates with tileSize
   * @param tileSizeOrTarget Optional: if number, path is treated as grid coordinates. If object with x/y, it's the final target to face.
   * @param finalTarget Optional: if tileSizeOrTarget is a number, this can be the final target position to face
   */
  moveAlongPath(
    path: Array<[number, number]> | Array<{ x: number; y: number }>, 
    tileSizeOrTarget?: number | { x: number; y: number },
    finalTarget?: { x: number; y: number }
  ) {
    if (path.length === 0) return
    
    // Determine if tileSizeOrTarget is a number (tileSize) or object (finalTarget)
    let tileSize: number | undefined
    if (typeof tileSizeOrTarget === 'number') {
      tileSize = tileSizeOrTarget
      this.finalTargetPosition = finalTarget || null
    } else if (tileSizeOrTarget && typeof tileSizeOrTarget === 'object') {
      this.finalTargetPosition = tileSizeOrTarget
    } else {
      // tileSizeOrTarget is undefined, check if finalTarget is provided
      this.finalTargetPosition = finalTarget || null
    }
    
    // Convert path to screen coordinates
    if (tileSize !== undefined && path.length > 0 && Array.isArray(path[0]) && path[0].length === 2) {
      // Grid coordinates format: Array<[number, number]>
      this.path = (path as Array<[number, number]>).map(([gridX, gridY]) => ({
        x: gridX * tileSize + tileSize / 2,
        y: gridY * tileSize + tileSize / 2
      }))
    } else {
      // Screen coordinates format: Array<{ x: number; y: number }>
      this.path = (path as Array<{ x: number; y: number }>).map((point) => ({
        x: point.x,
        y: point.y
      }))
    }
    
    this.currentPathIndex = 0
    this.isMoving = true
    
    // Start moving to first waypoint
    if (this.path.length > 0) {
      const firstPoint = this.path[0]
      if (firstPoint) {
        this.targetX = firstPoint.x
        this.targetY = firstPoint.y
      }
    }
  }

  /**
   * Update the character's position and rotation (call this in the game loop)
   * @param deltaTime Time elapsed since last frame in seconds (from ticker.deltaTime)
   * Returns true if still moving, false if reached target
   */
  update(deltaTime: number = 1/60): boolean {
    this.updateRotation()
    this.renderThreeJS()

    if (!this.isMoving) {
      return false
    }

    const dx = this.targetX - this.currentX
    const dy = this.targetY - this.currentY
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Calculate target rotation based on movement direction
    if (distance > 0.1) {
      // If we have a final target position and the movement is not diagonal (pure horizontal or vertical),
      // orient towards the final target instead of the next waypoint
      if (this.finalTargetPosition) {
        const absDx = Math.abs(dx)
        const absDy = Math.abs(dy)
        const isDiagonal = absDx > 0.1 && absDy > 0.1
        
        // For non-diagonal movement (corridors), orient towards final target
        if (!isDiagonal) {
          const finalDx = this.finalTargetPosition.x - this.currentX
          const finalDy = this.finalTargetPosition.y - this.currentY
          const finalDistance = Math.sqrt(finalDx * finalDx + finalDy * finalDy)
          if (finalDistance > 0.1) {
            this.targetRotationY = this.calculateIsoRotation(finalDx, finalDy)
          }
        } else {
          // For diagonal movement, use movement direction
          this.targetRotationY = this.calculateIsoRotation(dx, dy)
        }
      } else {
        // No final target, use movement direction
        this.targetRotationY = this.calculateIsoRotation(dx, dy)
      }
    }

    if (distance < 0.1) {
      this.currentX = this.targetX
      this.currentY = this.targetY
      
      // If following a path, move to next waypoint
      if (this.path.length > 0 && this.currentPathIndex < this.path.length - 1) {
        this.currentPathIndex++
        this.targetX = this.path[this.currentPathIndex]?.x ?? 0
        this.targetY = this.path[this.currentPathIndex]?.y ?? 0
        return true // Continue moving to next waypoint
      } else {
        // Reached end of path or no path
        // If there's a final target position, orient character towards it
        if (this.finalTargetPosition) {
          const dx = this.finalTargetPosition.x - this.currentX
          const dy = this.finalTargetPosition.y - this.currentY
          if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
            this.targetRotationY = this.calculateIsoRotation(dx, dy)
            // Snap to main direction after calculating rotation towards target
            this.snapToMainDirection()
          } else {
            this.snapToMainDirection()
          }
        } else {
          // Snap rotation to one of the 4 main directions when arriving at destination
          this.snapToMainDirection()
        }
        
        this.isMoving = false
        this.path = []
        this.currentPathIndex = 0
        this.finalTargetPosition = null
        return false
      }
    }

    // Constant speed movement - move towards target at fixed speed (time-based)
    const moveDistance = Math.min(this.moveSpeed * deltaTime, distance)
    const moveX = (dx / distance) * moveDistance
    const moveY = (dy / distance) * moveDistance
    
    this.currentX += moveX
    this.currentY += moveY
    
    return true
  }

  /**
   * Rotate character to face a target position (for testing - mouse follow)
   * Only works when character is not moving
   * Uses smooth continuous rotation based on actual angle to mouse
   */
  rotateTowardsPosition(targetX: number, targetY: number) {
    if (this.isMoving) return // Don't override rotation when moving
    
    const dx = targetX - this.currentX
    const dy = targetY - this.currentY
    const length = Math.sqrt(dx * dx + dy * dy)
    
    if (length > 0.1) {
      // Calculate actual angle to mouse using atan2
      // In isometric view, we need to account for the coordinate system rotation
      let angle = Math.atan2(dy, dx)
      
      // In isometric view, the coordinate system is rotated
      // Based on isoToScreen: x = (isoX - isoY) * tileSize, y = (isoX + isoY) * tileSize / 2
      // The screen coordinates are rotated 45 degrees from standard Cartesian
      // Adjust the angle to align with isometric axes
      angle += Math.PI / 4
      
      // Add 180 degrees (π) so character faces the direction it's looking at
      // Negate the angle to reverse rotation direction (clockwise mouse = clockwise character)
      angle = -angle + Math.PI
      
      // Normalize to [-π, π]
      while (angle > Math.PI) angle -= Math.PI * 2
      while (angle < -Math.PI) angle += Math.PI * 2
      
      this.targetRotationY = angle
    }
  }

  /**
   * Smoothly rotate character towards target rotation
   * Uses faster rotation speed when not moving (mouse following)
   */
  private updateRotation() {
    let current = this.currentRotationY
    let target = this.targetRotationY
    let diff = target - current
    
    // Normalize to shortest path [-π, π]
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    
    // Use faster rotation speed when not moving (for mouse following)
    const speed = this.isMoving ? this.rotationSpeed : this.mouseRotationSpeed
    
    // Smooth interpolation
    if (Math.abs(diff) < 0.01) {
      this.currentRotationY = target
    } else {
      this.currentRotationY += diff * speed
    }
    
    // Normalize current angle
    while (this.currentRotationY > Math.PI) this.currentRotationY -= Math.PI * 2
    while (this.currentRotationY < -Math.PI) this.currentRotationY += Math.PI * 2
  }

  getPosition(): { x: number; y: number } {
    return { x: this.currentX, y: this.currentY }
  }

  /**
   * Update character scale based on tile size
   * Scales the character proportionally to match the tile size
   */
  updateScale(tileSize: number) {
    // Base scale factor (1/1.5 from constructor) adjusted by tile size
    // Use a reference tile size (64) to maintain proportions
    const baseTileSize = 64
    const scaleFactor = (1.4) * (tileSize / baseTileSize)
    this.character.scale.set(scaleFactor, scaleFactor, scaleFactor)
  }

  /**
   * Load a GLTF model for the character (optional)
   * Call this when you have a 3D model file
   */
  async loadGLTFModel(url: string) {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
      const loader = new GLTFLoader()
      
      const gltf = await loader.loadAsync(url)
      
      // Remove old character
      this.scene.remove(this.character)
      
      // Add new model
      this.character = gltf.scene
      this.scene.add(this.character)
      
      // Set up animations if available
      if (gltf.animations.length > 0 && gltf.animations[0]) {
        this.animationMixer = new THREE.AnimationMixer(this.character)
        const clip = gltf.animations[0]
        if (clip) {
          const action = this.animationMixer.clipAction(clip)
          action.play()
        }
      }
      
      // Scale model if needed
      this.character.scale.set(1, 1, 1)
    } catch (error) {
      console.warn('Failed to load GLTF model:', error)
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.renderer.dispose()
    // Clean up Three.js objects
    this.scene.traverse((object: THREE.Object3D) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose()
        if (Array.isArray(object.material)) {
          object.material.forEach((material: THREE.Material) => material.dispose())
        } else {
          object.material.dispose()
        }
      }
    })
    super.destroy()
  }
}

