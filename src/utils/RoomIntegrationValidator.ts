import {
  Room,
  Corridor,
  ConnectionPoint,
  Position,
  RoomTemplate,
  ConnectionPointState,
  DoorState
} from '../types';
import { SharedWallManager } from './SharedWallManager';
import { GridManager } from './GridManager';

export interface ValidationResult {
  isValid: boolean;
  validConnectionPoints: ConnectionPoint[];
  originalIndices: number[]; // Maps validated points back to original template indices
  errors: string[];
}

export interface IntegrationContext {
  sourceConnectionPoint: ConnectionPoint;
  sourceElementId: string;
  existingRooms: Room[];
  existingCorridors: Corridor[];
  sharedWallManager: SharedWallManager;
  gridManager: GridManager;
}

/**
 * Validates room integration before creating room objects
 * Implements the "validate first, generate only if valid" approach
 */
export class RoomIntegrationValidator {
  
  /**
   * Pre-validate a room placement including all connection points and conflicts
   */
  static validateRoomPlacement(
    template: RoomTemplate,
    position: Position,
    context: IntegrationContext
  ): ValidationResult {
    const errors: string[] = [];
    
    // 1. Check grid space availability
    const availableGridInfo = context.gridManager.getAvailableRoomArea(
      position, 
      template.width, 
      template.height
    );
    
    if (!this.hasMinimumSpace(availableGridInfo.grid)) {
      errors.push('Insufficient grid space for room placement');
      return { isValid: false, validConnectionPoints: [], originalIndices: [], errors };
    }
    
    // 2. Create temporary room for validation
    const tempRoom = this.createTemporaryRoom(template, position, context);
    
    // 3. Validate connection points against existing map
    const connectionPointValidation = this.validateConnectionPoints(
      tempRoom.connectionPoints,
      context
    );
    
    if (!connectionPointValidation.isValid) {
      errors.push(...connectionPointValidation.errors);
    }
    
    // 4. Check for wall conflicts
    const wallConflicts = context.sharedWallManager.checkDoorConflicts(tempRoom, position);
    const hasUnexpectedDoors = wallConflicts.some(conflict => 
      conflict.conflictType === 'unexpected_door'
    );
    
    if (hasUnexpectedDoors) {
      errors.push('Would create doors against solid walls');
    }
    
    return {
      isValid: errors.length === 0,
      validConnectionPoints: connectionPointValidation.validConnectionPoints,
      originalIndices: connectionPointValidation.originalIndices,
      errors
    };
  }
  
  /**
   * Validate individual connection points against existing map state
   */
  private static validateConnectionPoints(
    connectionPoints: ConnectionPoint[],
    context: IntegrationContext
  ): { isValid: boolean; validConnectionPoints: ConnectionPoint[]; originalIndices: number[]; errors: string[] } {
    const errors: string[] = [];
    const validConnectionPoints: ConnectionPoint[] = [];
    const originalIndices: number[] = [];
    
    connectionPoints.forEach((cp, originalIndex) => {
      // Check if this connection point would conflict with solid walls
      if (this.wouldConflictWithSolidWall(cp, context)) {
        errors.push(`Connection point at (${cp.position.x}, ${cp.position.y}) conflicts with solid wall`);
        return;
      }
      
      // Check if connection point is in valid location
      if (!this.isConnectionPointPositionValid(cp, context)) {
        errors.push(`Connection point at (${cp.position.x}, ${cp.position.y}) is in invalid position`);
        return;
      }
      
      validConnectionPoints.push(cp);
      originalIndices.push(originalIndex);
    });
    
    return {
      isValid: errors.length === 0,
      validConnectionPoints,
      originalIndices,
      errors
    };
  }
  
  /**
   * Check if connection point would conflict with solid walls of existing elements
   */
  private static wouldConflictWithSolidWall(
    connectionPoint: ConnectionPoint,
    context: IntegrationContext
  ): boolean {
    const { sharedWallManager } = context;
    
    // Create a temporary connection point to test
    const tempCP = { ...connectionPoint };
    
    return sharedWallManager.wouldPlaceDoorAgainstSolidWall(tempCP);
  }
  
  /**
   * Check if connection point position is valid (within bounds, etc.)
   */
  private static isConnectionPointPositionValid(
    connectionPoint: ConnectionPoint,
    context: IntegrationContext
  ): boolean {
    const { gridManager } = context;
    
    return gridManager.isWithinBounds(connectionPoint.position);
  }
  
  /**
   * Check if grid has minimum required space
   */
  private static hasMinimumSpace(grid: boolean[][]): boolean {
    let availableSquares = 0;
    
    for (const row of grid) {
      for (const cell of row) {
        if (cell) availableSquares++;
      }
    }
    
    return availableSquares >= 1; // At least one square available
  }
  
  /**
   * Create a temporary room object for validation purposes
   */
  private static createTemporaryRoom(
    template: RoomTemplate,
    position: Position,
    context: IntegrationContext
  ): Room {
    return {
      id: `temp-room-${Date.now()}`,
      shape: template.shape,
      type: template.type,
      size: template.size,
      position,
      width: template.width,
      height: template.height,
      templateId: template.id,
      isGenerated: true,
      connectionPoints: template.connectionPoints.map(cp => ({
        ...cp,
        position: {
          x: position.x + cp.position.x,
          y: position.y + cp.position.y,
        },
        isConnected: false,
        isGenerated: false,
        state: ConnectionPointState.Ungenerated,
      })),
    };
  }
}