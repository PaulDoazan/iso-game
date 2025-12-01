/**
 * Utility functions for isometric coordinate conversion
 */

export class IsoUtils {
  /**
   * Convert isometric grid coordinates to screen coordinates
   */
  static isoToScreen(isoX: number, isoY: number, tileSize: number = 64): { x: number; y: number } {
    return {
      x: (isoX - isoY) * tileSize,
      y: (isoX + isoY) * tileSize / 2,
    }
  }

  /**
   * Convert screen coordinates to isometric grid coordinates
   */
  static screenToIso(screenX: number, screenY: number, tileSize: number = 64): { x: number; y: number } {
    return {
      x: (screenX / tileSize + screenY / (tileSize / 2)) / 2,
      y: (screenY / (tileSize / 2) - screenX / tileSize) / 2,
    }
  }
}



