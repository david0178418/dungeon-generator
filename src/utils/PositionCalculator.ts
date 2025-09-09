import { 
  Position, 
  ConnectionPoint, 
  RoomTemplate,
  ExitDirection,
  RoomPositionCalculation,
  TemplateConnectionPoint
} from '../types';
import { DOOR_POSITION_ADJUSTMENTS } from '../constants';

export class PositionCalculator {
  /**
   * Calculate the position for a new room based on connection alignment
   */
  static calculateRoomPositionFromConnection(
    connectionPoint: ConnectionPoint,
    template: RoomTemplate
  ): RoomPositionCalculation {
    // Find a connection point in the template that can connect to the source
    const oppositeDirection = this.getOppositeDirection(connectionPoint.direction);
    
    const compatibleConnectionPoints = template.connectionPoints
      .map((cp, index) => ({ ...cp, index } as TemplateConnectionPoint))
      .filter((cp) => cp.direction === oppositeDirection);
    
    if (compatibleConnectionPoints.length === 0) {
      // Fallback if no compatible connection point found
      return { 
        roomPosition: { x: 0, y: 0 }, 
        connectingPointIndex: -1 
      };
    }
    
    // Use the first compatible connection point
    const templateCP = compatibleConnectionPoints[0];
    
    // Calculate room position so that templateCP aligns with connectionPoint
    let roomX = connectionPoint.position.x - templateCP.position.x;
    let roomY = connectionPoint.position.y - templateCP.position.y;
    
    // Adjust positioning based on door directions to avoid overlap
    // When doors face each other, they should be in adjacent grid squares
    const adjustment = this.getDoorPositionAdjustment(connectionPoint.direction, templateCP.direction);
    roomX += adjustment.x;
    roomY += adjustment.y;

    return { 
      roomPosition: { x: roomX, y: roomY }, 
      connectingPointIndex: templateCP.index || 0
    };
  }

  /**
   * Get the adjustment needed for proper door alignment
   */
  private static getDoorPositionAdjustment(sourceDirection: ExitDirection, templateDirection: ExitDirection): Position {
    if (sourceDirection === ExitDirection.West && templateDirection === ExitDirection.East) {
      return DOOR_POSITION_ADJUSTMENTS.WEST_TO_EAST;
    } else if (sourceDirection === ExitDirection.East && templateDirection === ExitDirection.West) {
      return DOOR_POSITION_ADJUSTMENTS.EAST_TO_WEST;
    } else if (sourceDirection === ExitDirection.North && templateDirection === ExitDirection.South) {
      return DOOR_POSITION_ADJUSTMENTS.NORTH_TO_SOUTH;
    } else if (sourceDirection === ExitDirection.South && templateDirection === ExitDirection.North) {
      return DOOR_POSITION_ADJUSTMENTS.SOUTH_TO_NORTH;
    }
    
    return { x: 0, y: 0 }; // No adjustment needed
  }

  /**
   * Get the opposite direction for connection alignment
   */
  static getOppositeDirection(direction: ExitDirection): ExitDirection {
    switch (direction) {
      case ExitDirection.North: return ExitDirection.South;
      case ExitDirection.South: return ExitDirection.North;
      case ExitDirection.East: return ExitDirection.West;
      case ExitDirection.West: return ExitDirection.East;
      default: return direction;
    }
  }

  /**
   * Convert direction to movement vector
   */
  static directionToVector(direction: ExitDirection): Position {
    switch (direction) {
      case ExitDirection.North: return { x: 0, y: -1 };
      case ExitDirection.South: return { x: 0, y: 1 };
      case ExitDirection.East: return { x: 1, y: 0 };
      case ExitDirection.West: return { x: -1, y: 0 };
      default: return { x: 0, y: 0 };
    }
  }

  /**
   * Check if two connection points can connect to each other
   */
  static areConnectionPointsConnectable(cp1: ConnectionPoint, cp2: ConnectionPoint): boolean {
    // Check if connection points are at the exact same position and facing opposite directions
    if (cp1.position.x !== cp2.position.x || cp1.position.y !== cp2.position.y) {
      return false;
    }
    
    // Check if they face opposite directions
    const oppositeDirection = this.getOppositeDirection(cp1.direction);
    return cp2.direction === oppositeDirection;
  }
}