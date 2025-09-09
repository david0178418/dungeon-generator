import { 
  Position, 
  Room, 
  Corridor, 
  ConnectionPoint, 
  DoorState, 
  ExitDirection,
  WallOverlap,
  SharedWallLocation,
  SharedDoor 
} from '../types';
import { WallAnalyzer } from './WallAnalyzer';
import { DoorRegistry } from './DoorRegistry';
import { PositionCalculator } from './PositionCalculator';

export class SharedWallManager {
  private doorRegistry: DoorRegistry;
  private elements: (Room | Corridor)[] = [];

  constructor() {
    this.doorRegistry = new DoorRegistry();
  }

  /**
   * Add a new element to the shared wall system
   * Note: Elements should be pre-validated by RoomIntegrationValidator
   */
  addElement(element: Room | Corridor): ConnectionPoint[] {
    this.elements.push(element);

    // Check for existing doors that this element should connect to
    const updatedConnectionPoints = this.doorRegistry.connectElementToExistingDoors(
      element.id,
      element.connectionPoints
    );

    // Update element connection points with existing door connections
    element.connectionPoints = updatedConnectionPoints;

    // Register new doors for connection points that aren't connected to existing doors
    updatedConnectionPoints.forEach((cp, index) => {
      const existingDoor = this.doorRegistry.getDoorByLocation(cp.position, cp.direction);
      if (!existingDoor) {
        // Create new door
        this.doorRegistry.registerDoor(
          cp.position,
          cp.direction,
          element.id,
          DoorState.Closed,
          this.generateSeed(cp)
        );
      }
    });

    // Auto-open doors that now have both sides revealed
    this.autoOpenRevealedDoors();

    return updatedConnectionPoints;
  }

  /**
   * Remove an element from the shared wall system
   */
  removeElement(elementId: string): void {
    this.elements = this.elements.filter(element => element.id !== elementId);
    this.doorRegistry.removeElementFromDoors(elementId);
  }

  /**
   * Check if placing a new element at a position would conflict with existing doors
   */
  checkDoorConflicts(
    newElement: Room | Corridor,
    targetPosition: Position
  ): Array<{ position: Position; conflictType: 'unexpected_door' | 'missing_door' | 'misaligned_door' }> {
    const conflicts: Array<{ position: Position; conflictType: 'unexpected_door' | 'missing_door' | 'misaligned_door' }> = [];

    // Create a temporary element at the target position for analysis
    const tempElement = this.createTempElementAtPosition(newElement, targetPosition);

    // Check each connection point for conflicts
    tempElement.connectionPoints.forEach(cp => {
      const existingDoor = this.doorRegistry.getDoorByLocation(cp.position, cp.direction);
      
      if (existingDoor) {
        // Check if this is an expected connection
        const shouldConnect = this.shouldElementsConnect(tempElement, cp, existingDoor);
        if (!shouldConnect) {
          conflicts.push({
            position: cp.position,
            conflictType: 'unexpected_door'
          });
        }
      } else {
        // Check if there should be a door here based on adjacent elements
        const shouldHaveDoor = this.shouldHaveDoorAtPosition(cp.position, cp.direction);
        if (shouldHaveDoor) {
          conflicts.push({
            position: cp.position,
            conflictType: 'missing_door'
          });
        }
      }
    });

    return conflicts;
  }

  /**
   * Find shared wall locations between elements
   */
  findSharedWalls(): SharedWallLocation[] {
    const overlaps = WallAnalyzer.findWallOverlaps(this.elements);
    const sharedWalls: SharedWallLocation[] = [];

    overlaps.forEach(overlap => {
      if (overlap.elementIds.length >= 2) {
        // Determine the direction of the shared wall
        const direction = overlap.segmentType === 'horizontal' ? 
          ExitDirection.North : ExitDirection.East; // This is simplified - real direction depends on context

        sharedWalls.push({
          position: overlap.position,
          direction,
          elementIds: overlap.elementIds
        });
      }
    });

    return sharedWalls;
  }

  /**
   * Update door state globally
   */
  updateDoorState(position: Position, direction: ExitDirection, state: DoorState): boolean {
    const globalId = DoorRegistry.createDoorId(position, direction);
    return this.doorRegistry.updateDoorState(globalId, state);
  }

  /**
   * Mark door as generated and connected
   */
  markDoorAsGenerated(
    position: Position, 
    direction: ExitDirection, 
    connectedElementId: string
  ): boolean {
    const globalId = DoorRegistry.createDoorId(position, direction);
    return this.doorRegistry.markDoorAsGenerated(globalId, connectedElementId);
  }

  /**
   * Get door state for rendering
   */
  getDoorState(position: Position, direction: ExitDirection): DoorState {
    return this.doorRegistry.getDoorState(position, direction);
  }

  /**
   * Check if door is generated
   */
  isDoorGenerated(position: Position, direction: ExitDirection): boolean {
    return this.doorRegistry.isDoorGenerated(position, direction);
  }

  /**
   * Get all doors for an element
   */
  getElementDoors(elementId: string): Array<{ position: Position; direction: ExitDirection; state: DoorState; isGenerated: boolean }> {
    const doors = this.doorRegistry.getDoorsForElement(elementId);
    return doors.map(door => ({
      position: door.location.position,
      direction: door.location.direction,
      state: door.state,
      isGenerated: door.isGenerated
    }));
  }

  /**
   * Validate that doors are consistent across shared walls
   */
  validateDoorConsistency(): Array<{ position: Position; issue: string }> {
    const issues: Array<{ position: Position; issue: string }> = [];
    const allDoors = this.doorRegistry.getAllDoors();

    allDoors.forEach(door => {
      // Check if door has conflicting states across elements
      if (door.connectedElements.length > 1) {
        // For shared doors, ensure they're consistently open/closed
        const elements = door.connectedElements.map(id => 
          this.elements.find(el => el.id === id)
        ).filter(el => el !== undefined);

        if (elements.length !== door.connectedElements.length) {
          issues.push({
            position: door.location.position,
            issue: `Door references missing elements: ${door.connectedElements.join(', ')}`
          });
        }
      }

      // Check for conflicting doors at the same position
      if (this.doorRegistry.hasConflictingDoors(door.location.position)) {
        issues.push({
          position: door.location.position,
          issue: 'Conflicting doors in opposite directions at same position'
        });
      }
    });

    return issues;
  }

  /**
   * Reset the shared wall system
   */
  reset(): void {
    this.elements = [];
    this.doorRegistry.clear();
  }

  /**
   * Get door registry for advanced operations
   */
  getDoorRegistry(): DoorRegistry {
    return this.doorRegistry;
  }

  /**
   * Create a temporary element at a specific position for conflict checking
   */
  private createTempElementAtPosition(element: Room | Corridor, position: Position): Room | Corridor {
    if ('gridPattern' in element || 'templateId' in element) {
      // It's a room
      const room = element as Room;
      return {
        ...room,
        position,
        connectionPoints: room.connectionPoints.map(cp => ({
          ...cp,
          position: {
            x: position.x + (cp.position.x - room.position.x),
            y: position.y + (cp.position.y - room.position.y)
          }
        }))
      };
    } else {
      // It's a corridor
      const corridor = element as Corridor;
      const offsetX = position.x - corridor.position.x;
      const offsetY = position.y - corridor.position.y;
      
      return {
        ...corridor,
        position,
        path: corridor.path.map(pos => ({
          x: pos.x + offsetX,
          y: pos.y + offsetY
        })),
        connectionPoints: corridor.connectionPoints.map(cp => ({
          ...cp,
          position: {
            x: cp.position.x + offsetX,
            y: cp.position.y + offsetY
          }
        }))
      };
    }
  }

  /**
   * Check if two elements should connect through a door
   */
  private shouldElementsConnect(
    element: Room | Corridor,
    connectionPoint: ConnectionPoint,
    existingDoor: any
  ): boolean {
    // Check if there are adjacent elements that should naturally connect
    const adjacentElements = existingDoor.connectedElements
      .map((id: string) => this.elements.find(el => el.id === id))
      .filter((el: any) => el !== undefined);

    return adjacentElements.some((adjacentElement: Room | Corridor) => {
      return WallAnalyzer.isPositionAdjacentToElement(
        connectionPoint.position,
        PositionCalculator.getOppositeDirection(connectionPoint.direction),
        adjacentElement
      );
    });
  }

  /**
   * Check if there should be a door at a specific position
   */
  private shouldHaveDoorAtPosition(position: Position, direction: ExitDirection): boolean {
    // Check if there are adjacent elements that would naturally create a door here
    const oppositeDirection = PositionCalculator.getOppositeDirection(direction);
    
    // Check if there's an element on the opposite side that would need a door connection
    const hasAdjacentElement = this.elements.some(element => {
      return WallAnalyzer.isPositionAdjacentToElement(position, oppositeDirection, element);
    });
    
    // Only suggest a door should exist if there's an adjacent element AND that element has a door there
    if (!hasAdjacentElement) {
      return false;
    }
    
    // Check if the adjacent element actually has a door at this position
    const adjacentElement = this.elements.find(element => 
      WallAnalyzer.isPositionAdjacentToElement(position, oppositeDirection, element)
    );
    
    if (adjacentElement) {
      return adjacentElement.connectionPoints.some(cp => 
        cp.position.x === position.x && 
        cp.position.y === position.y && 
        cp.direction === direction
      );
    }
    
    return false;
  }

  /**
   * Auto-open doors that have both sides revealed
   */
  private autoOpenRevealedDoors(): void {
    const allDoors = this.doorRegistry.getAllDoors();
    
    allDoors.forEach(door => {
      // Skip if door is already open or if it doesn't have multiple connected elements
      if (door.state === DoorState.Open || door.connectedElements.length < 2) {
        return;
      }
      
      // Check if all connected elements exist (are revealed)
      const allElementsExist = door.connectedElements.every(elementId => 
        this.elements.some(element => element.id === elementId)
      );
      
      // If both sides are revealed, auto-open the door
      if (allElementsExist) {
        this.updateDoorState(door.location.position, door.location.direction, DoorState.Open);
        // Mark as generated so it's considered fully revealed
        this.markDoorAsGenerated(door.location.position, door.location.direction, door.connectedElements.join(','));
        
        // Update connection points on both connected elements
        this.updateConnectionPointsForAutoOpenedDoor(door);
      }
    });
  }

  /**
   * Update connection points for auto-opened doors to ensure consistency
   */
  private updateConnectionPointsForAutoOpenedDoor(door: SharedDoor): void {
    door.connectedElements.forEach((elementId: string) => {
      const element = this.elements.find(el => el.id === elementId);
      if (element) {
        element.connectionPoints.forEach(cp => {
          if (cp.position.x === door.location.position.x && 
              cp.position.y === door.location.position.y &&
              cp.direction === door.location.direction) {
            cp.isGenerated = true;
            cp.isConnected = true;
          }
        });
      }
    });
  }

  /**
   * Check if a connection point would place a door against a solid wall (no door should be there)
   */
  wouldPlaceDoorAgainstSolidWall(connectionPoint: ConnectionPoint): boolean {
    const oppositeDirection = PositionCalculator.getOppositeDirection(connectionPoint.direction);
    
    // Find elements that would be on the opposite side of this door
    const adjacentElements = this.elements.filter(element => 
      WallAnalyzer.isPositionAdjacentToElement(connectionPoint.position, oppositeDirection, element)
    );
    
    if (adjacentElements.length === 0) {
      return false; // No adjacent elements, so not against a solid wall
    }
    
    // Check if ANY adjacent element has a door at this position
    const hasAnyDoor = adjacentElements.some(element =>
      element.connectionPoints.some(cp => 
        cp.position.x === connectionPoint.position.x && 
        cp.position.y === connectionPoint.position.y && 
        cp.direction === connectionPoint.direction
      )
    );
    
    // If there's an adjacent element but no door, then we'd be placing a door against a solid wall
    return !hasAnyDoor;
  }

  /**
   * Generate a seed for a connection point
   */
  private generateSeed(connectionPoint: ConnectionPoint): string {
    return `${connectionPoint.position.x}-${connectionPoint.position.y}-${connectionPoint.direction}-${Date.now()}`;
  }
}