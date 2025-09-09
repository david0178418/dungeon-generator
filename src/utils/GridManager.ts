import { Position, Room, Corridor, RoomTemplate, GridAvailability } from '../types';
import { getRoomTemplateById } from '../data/roomTemplates';

export class GridManager {
  private occupiedPositions: Set<string> = new Set();
  private gridSize: number;

  constructor(gridSize: number) {
    this.gridSize = gridSize;
  }

  /**
   * Reset the grid state
   */
  reset(): void {
    this.occupiedPositions = new Set();
  }

  /**
   * Mark a room as occupied in the grid
   */
  markRoomAsOccupied(room: Room): void {
    // Mark the actual occupied squares based on the room's current state
    // If the room has a custom gridPattern (from trimming), use that
    // Otherwise, use the original template pattern
    
    if (room.gridPattern) {
      // Room has been trimmed, use its custom pattern
      for (let y = 0; y < room.gridPattern.length; y++) {
        for (let x = 0; x < room.gridPattern[y].length; x++) {
          if (room.gridPattern[y][x]) {
            const worldX = room.position.x + x;
            const worldY = room.position.y + y;
            this.occupiedPositions.add(`${worldX},${worldY}`);
          }
        }
      }
    } else {
      // Use original template pattern
      const template = room.templateId ? getRoomTemplateById(room.templateId) : null;
      
      if (template && template.gridPattern) {
        for (let y = 0; y < template.gridPattern.length; y++) {
          for (let x = 0; x < template.gridPattern[y].length; x++) {
            if (template.gridPattern[y][x]) {
              const worldX = room.position.x + x;
              const worldY = room.position.y + y;
              this.occupiedPositions.add(`${worldX},${worldY}`);
            }
          }
        }
      } else {
        // Fallback to full rectangle if no template pattern available
        for (let x = room.position.x; x < room.position.x + room.width; x++) {
          for (let y = room.position.y; y < room.position.y + room.height; y++) {
            this.occupiedPositions.add(`${x},${y}`);
          }
        }
      }
    }
  }

  /**
   * Mark a corridor as occupied in the grid
   */
  markCorridorAsOccupied(corridor: Corridor): void {
    corridor.path.forEach(pos => {
      this.occupiedPositions.add(`${pos.x},${pos.y}`);
    });
  }

  /**
   * Get available area for room placement
   */
  getAvailableRoomArea(position: Position, width: number, height: number): GridAvailability {
    const grid: boolean[][] = [];
    
    for (let y = 0; y < height; y++) {
      grid[y] = [];
      for (let x = 0; x < width; x++) {
        const worldX = position.x + x;
        const worldY = position.y + y;
        
        // Check bounds and occupancy
        const isAvailable = worldX >= 0 && 
                           worldX < this.gridSize && 
                           worldY >= 0 && 
                           worldY < this.gridSize && 
                           !this.occupiedPositions.has(`${worldX},${worldY}`);
        
        grid[y][x] = isAvailable;
      }
    }
    
    return {
      grid,
      width,
      height
    };
  }

  /**
   * Check if a position is occupied
   */
  isPositionOccupied(position: Position): boolean {
    return this.occupiedPositions.has(`${position.x},${position.y}`);
  }

  /**
   * Check if a position is within grid bounds
   */
  isWithinBounds(position: Position): boolean {
    return position.x >= 0 && 
           position.x < this.gridSize && 
           position.y >= 0 && 
           position.y < this.gridSize;
  }

  /**
   * Check if a rectangular area is available
   */
  isAreaAvailable(position: Position, width: number, height: number): boolean {
    for (let x = position.x; x < position.x + width; x++) {
      for (let y = position.y; y < position.y + height; y++) {
        const pos = { x, y };
        if (!this.isWithinBounds(pos) || this.isPositionOccupied(pos)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Get all occupied positions (for debugging)
   */
  getOccupiedPositions(): Set<string> {
    return new Set(this.occupiedPositions);
  }

  /**
   * Force mark a specific position as available (used for connection point preservation)
   */
  markPositionAsAvailable(position: Position, grid: boolean[][], templateWidth: number, templateHeight: number): void {
    const localX = position.x;
    const localY = position.y;
    
    if (localY >= 0 && localY < templateHeight && localX >= 0 && localX < templateWidth) {
      grid[localY][localX] = true;
    }
  }
}