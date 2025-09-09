import { 
  ConnectionPoint, 
  RoomTemplate, 
  TemplateConnectionPoint,
  GridAvailability 
} from '../types';

export class ConnectionPointValidator {
  /**
   * Filter connection points to only include those that are on the perimeter of the trimmed room
   */
  static validateConnectionPoints(
    template: RoomTemplate,
    availableGrid: boolean[][],
    trimmedPattern: boolean[][],
    preserveConnectionIndex?: number
  ): TemplateConnectionPoint[] {
    return template.connectionPoints.filter((cp, index) => {
      // Always preserve the connection point used for positioning
      if (preserveConnectionIndex !== undefined && index === preserveConnectionIndex) {
        return this.isConnectionPointAvailable(cp, availableGrid, trimmedPattern, template);
      }
      
      const localX = cp.position.x;
      const localY = cp.position.y;
      
      // Must be within bounds and on an available square
      if (!this.isWithinTemplateBounds(cp, template) || 
          !this.isOnAvailableSquare(cp, availableGrid, trimmedPattern)) {
        return false;
      }
      
      // Check if this connection point is actually on the perimeter of the trimmed shape
      return this.isOnPerimeter(cp, trimmedPattern, template);
    }).map((cp, originalIndex) => ({ ...cp, index: originalIndex }));
  }

  /**
   * Check if connection point is available for positioning
   */
  private static isConnectionPointAvailable(
    cp: TemplateConnectionPoint | ConnectionPoint,
    availableGrid: boolean[][],
    trimmedPattern: boolean[][],
    template: RoomTemplate
  ): boolean {
    const localX = cp.position.x;
    const localY = cp.position.y;
    
    const isAvailable = localX >= 0 && localX < template.width && 
                       localY >= 0 && localY < template.height && 
                       availableGrid[localY] && availableGrid[localY][localX] &&
                       trimmedPattern[localY][localX];
    return isAvailable;
  }

  /**
   * Check if connection point is within template bounds
   */
  private static isWithinTemplateBounds(cp: TemplateConnectionPoint | ConnectionPoint, template: RoomTemplate): boolean {
    const localX = cp.position.x;
    const localY = cp.position.y;
    
    return localX >= 0 && localX < template.width && 
           localY >= 0 && localY < template.height;
  }

  /**
   * Check if connection point is on an available square
   */
  private static isOnAvailableSquare(
    cp: TemplateConnectionPoint | ConnectionPoint,
    availableGrid: boolean[][],
    trimmedPattern: boolean[][]
  ): boolean {
    const localX = cp.position.x;
    const localY = cp.position.y;
    
    return availableGrid[localY] && 
           availableGrid[localY][localX] &&
           trimmedPattern[localY][localX];
  }

  /**
   * Check if connection point is on the perimeter of the room
   */
  private static isOnPerimeter(
    cp: TemplateConnectionPoint | ConnectionPoint,
    trimmedPattern: boolean[][],
    template: RoomTemplate
  ): boolean {
    const localX = cp.position.x;
    const localY = cp.position.y;
    
    switch (cp.direction) {
      case 'north':
        return localY === 0 || !trimmedPattern[localY - 1][localX];
      case 'south':
        return localY === template.height - 1 || !trimmedPattern[localY + 1][localX];
      case 'west':
        return localX === 0 || !trimmedPattern[localY][localX - 1];
      case 'east':
        return localX === template.width - 1 || !trimmedPattern[localY][localX + 1];
      default:
        return true; // Allow diagonal connections for now
    }
  }

  /**
   * Update connection point to mark it as generated and connected
   */
  static updateConnectionPointAsGenerated(
    connectionPoint: ConnectionPoint,
    sourceElementId: string,
    rooms: any[],
    corridors: any[]
  ): void {
    // Find and update the connection point in rooms
    for (const room of rooms) {
      if (room.id === sourceElementId) {
        const cp = room.connectionPoints.find((p: ConnectionPoint) => 
          p.position.x === connectionPoint.position.x && 
          p.position.y === connectionPoint.position.y &&
          p.direction === connectionPoint.direction
        );
        if (cp) {
          cp.isGenerated = true;
          cp.isConnected = true;
          return;
        }
      }
    }
    
    // Find and update the connection point in corridors
    for (const corridor of corridors) {
      if (corridor.id === sourceElementId) {
        const cp = corridor.connectionPoints.find((p: ConnectionPoint) => 
          p.position.x === connectionPoint.position.x && 
          p.position.y === connectionPoint.position.y &&
          p.direction === connectionPoint.direction
        );
        if (cp) {
          cp.isGenerated = true;
          cp.isConnected = true;
          return;
        }
      }
    }
  }

  /**
   * Find connection point in element by position and direction
   */
  static findConnectionPoint(
    element: { connectionPoints: ConnectionPoint[] },
    position: { x: number, y: number },
    direction: string
  ): ConnectionPoint | undefined {
    return element.connectionPoints.find(cp => 
      cp.position.x === position.x && 
      cp.position.y === position.y &&
      cp.direction === direction
    );
  }
}