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
  
  // Rotation state for smooth rotation
  private currentRotationY: number = 0 // Current rotation angle in radians
  private targetRotationY: number = 0 // Target rotation angle in radians
  private rotationSpeed: number = 0.15 // Rotation interpolation speed (0-1) - slightly slower for more realistic feel
  
  // Three.js components
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private character: THREE.Group
  private animationMixer: THREE.AnimationMixer | null = null
  private clock: THREE.Clock
  
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
    
    // Initialize rotation state
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
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x3498db })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 0.6
    group.add(body)
    
    // Head (sphere)
    const headGeometry = new THREE.SphereGeometry(0.5, 16, 16)
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac })
    const head = new THREE.Mesh(headGeometry, headMaterial)
    head.position.y = 1.5
    group.add(head)
    
    // Hat (cylinder)
    const hatGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 8)
    const hatMaterial = new THREE.MeshStandardMaterial({ color: 0xe74c3c })
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
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0x2980b9 })
    
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
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x2c3e50 })
    
    // Left leg
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial)
    leftLeg.position.set(-0.3, -0.4, 0)
    group.add(leftLeg)
    
    // Right leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial)
    rightLeg.position.set(0.3, -0.4, 0)
    group.add(rightLeg)
    
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 8)
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 })
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    leftEye.position.set(-0.15, 1.5, 0.45)
    group.add(leftEye)
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    rightEye.position.set(0.15, 1.5, 0.45)
    group.add(rightEye)
    
    // Visual indicator for front direction (yellow arrow)
    const arrowGeometry = new THREE.ConeGeometry(0.2, 0.4, 8)
    const arrowMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 })
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial)
    arrow.position.set(0, 0.3, 0.6)
    arrow.rotation.x = -Math.PI / 2
    group.add(arrow)
    
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
      this.character.position.y = Math.sin(time * 5) * 0.1
    } else {
      this.character.position.y = 0
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
   * Move the character smoothly to a target world position
   */
  moveTo(x: number, y: number) {
    this.targetX = x
    this.targetY = y
    this.isMoving = true
    
    // Calculate target rotation to face the new direction
    const dx = x - this.currentX
    const dy = y - this.currentY
    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      const targetAngle = Math.atan2(dy, dx)
      this.targetRotationY = Math.PI / 2 - targetAngle + Math.PI / 4
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
      const targetAngle = Math.atan2(dy, dx)
      this.targetRotationY = Math.PI / 2 - targetAngle + Math.PI / 4
    }

    if (distance < 0.1) {
      this.currentX = this.targetX
      this.currentY = this.targetY
      this.isMoving = false
      return false
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
   * Smoothly rotate character towards target rotation
   */
  private updateRotation() {
    let current = this.currentRotationY
    let target = this.targetRotationY
    let diff = target - current
    
    // Normalize to shortest path [-π, π]
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    
    // Smooth interpolation
    if (Math.abs(diff) < 0.01) {
      this.currentRotationY = target
    } else {
      this.currentRotationY += diff * this.rotationSpeed
    }
    
    // Normalize current angle
    while (this.currentRotationY > Math.PI) this.currentRotationY -= Math.PI * 2
    while (this.currentRotationY < -Math.PI) this.currentRotationY += Math.PI * 2
  }

  getPosition(): { x: number; y: number } {
    return { x: this.currentX, y: this.currentY }
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

