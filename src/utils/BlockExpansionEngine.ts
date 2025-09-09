import {
  Position,
  Room,
  Corridor,
  ConnectionPoint,
  RoomTemplate,
  ExitDirection,
  ConnectionPointState,
} from '../types';
import { GridManager } from './GridManager';
import { SharedWallManager } from './SharedWallManager';

export interface ExpansionContext {
  entryPoint: Position;
  entryDirection: ExitDirection;
  sourceConnectionPoint: ConnectionPoint;
  sourceElementId: string;
  geomorphBounds: RoomTemplate;
  targetPosition: Position; // Where the geomorph would be placed
  existingRooms: Room[];
  existingCorridors: Corridor[];
  gridManager: GridManager;
  sharedWallManager: SharedWallManager;
}

export interface ExpansionResult {
  expandedBlocks: Position[];
  finalConnectionPoints: ConnectionPoint[];
  roomBounds: { width: number; height: number };
}

export class BlockExpansionEngine {
  /**
   * Expand room block-by-block within geomorph bounds, starting from entry point
   */
  static expandRoom(context: ExpansionContext): ExpansionResult {
    const { entryPoint, entryDirection, geomorphBounds, targetPosition } = context;
    
    console.log('BlockExpansionEngine.expandRoom called:', {
      entryPoint,
      entryDirection,
      targetPosition,
      geomorphBounds: { width: geomorphBounds.width, height: geomorphBounds.height }
    });
    
    // Track expanded blocks and frontier for expansion
    const expandedBlocks = new Set<string>();
    const frontier: Position[] = [];
    
    // Start with entry point
    expandedBlocks.add(this.positionKey(entryPoint));
    frontier.push(entryPoint);
    
    console.log('Starting expansion from entry point:', entryPoint);
    
    // Expand away from entry direction
    const expansionBias = this.getExpansionBias(entryDirection);
    
    while (frontier.length > 0) {
      // Sort frontier by distance from entry and expansion bias
      frontier.sort((a, b) => {
        const distA = this.getDistanceFromEntry(a, entryPoint, expansionBias);
        const distB = this.getDistanceFromEntry(b, entryPoint, expansionBias);
        return distA - distB;
      });
      
      const currentPos = frontier.shift()!;
      
      // Try to expand in all directions from current position
      const neighbors = this.getNeighbors(currentPos);
      
      for (const neighbor of neighbors) {
        if (!this.canExpandTo(neighbor, context, expandedBlocks)) {
          continue;
        }
        
        const neighborKey = this.positionKey(neighbor);
        if (!expandedBlocks.has(neighborKey)) {
          expandedBlocks.add(neighborKey);
          frontier.push(neighbor);
        }
      }
    }
    
    // Convert expanded blocks back to positions
    const expandedPositions = Array.from(expandedBlocks).map(key => {
      const [x, y] = key.split(',').map(Number);
      return { x, y };
    });
    
    // Calculate room bounds
    const minX = Math.min(...expandedPositions.map(p => p.x));
    const maxX = Math.max(...expandedPositions.map(p => p.x));
    const minY = Math.min(...expandedPositions.map(p => p.y));
    const maxY = Math.max(...expandedPositions.map(p => p.y));
    
    const roomBounds = {
      width: maxX - minX + 1,
      height: maxY - minY + 1
    };
    
    // Generate connection points based on perimeter and contacts with existing features
    const connectionPoints = this.generateConnectionPoints(
      expandedPositions,
      context,
      { x: minX, y: minY }
    );
    
    console.log('Expansion complete. Expanded blocks:', expandedPositions.length, 'Connection points:', connectionPoints.length);
    
    return {
      expandedBlocks: expandedPositions,
      finalConnectionPoints: connectionPoints,
      roomBounds
    };
  }
  
  /**
   * Check if we can expand to a given position
   */
  private static canExpandTo(
    position: Position,
    context: ExpansionContext,
    currentBlocks: Set<string>
  ): boolean {
    const { geomorphBounds, targetPosition, gridManager } = context;
    
    // Check if position is within geomorph bounds
    const relativeX = position.x - targetPosition.x;
    const relativeY = position.y - targetPosition.y;
    
    if (relativeX < 0 || relativeX >= geomorphBounds.width ||
        relativeY < 0 || relativeY >= geomorphBounds.height) {
      console.log(`Position ${position.x},${position.y} outside geomorph bounds. Relative: ${relativeX},${relativeY}, Bounds: ${geomorphBounds.width}x${geomorphBounds.height}`);
      return false;
    }
    
    // Check if geomorph template allows this position
    if (!geomorphBounds.gridPattern[relativeY][relativeX]) {
      console.log(`Position ${position.x},${position.y} blocked by geomorph template at relative ${relativeX},${relativeY}`);
      return false;
    }
    
    // Check if position is within grid bounds
    if (!gridManager.isWithinBounds(position)) {
      console.log(`Position ${position.x},${position.y} outside grid bounds`);
      return false;
    }
    
    // Check if position is already occupied by existing features
    if (gridManager.isPositionOccupied(position)) {
      // Occupied positions cannot be expanded into, even if they have doors
      // Doors are connection points BETWEEN rooms, not part of rooms
      console.log(`Position ${position.x},${position.y} occupied - cannot expand into`);
      return false;
    }
    
    console.log(`Position ${position.x},${position.y} is available for expansion`);
    return true;
  }
  
  /**
   * Check if position represents a valid contact with existing features
   */
  private static isValidContactPoint(
    position: Position,
    context: ExpansionContext
  ): boolean {
    const { existingRooms, existingCorridors, sharedWallManager } = context;
    
    // Find what element occupies this position
    const occupyingElement = [...existingRooms, ...existingCorridors].find(element => {
      if ('gridPattern' in element) {
        // Room with grid pattern
        const room = element as Room;
        const relX = position.x - room.position.x;
        const relY = position.y - room.position.y;
        return relX >= 0 && relX < room.width && 
               relY >= 0 && relY < room.height &&
               (room.gridPattern?.[relY]?.[relX] ?? true);
      } else {
        // Corridor
        const corridor = element as Corridor;
        return corridor.path?.some(p => p.x === position.x && p.y === position.y) ?? false;
      }
    });
    
    if (!occupyingElement) {
      return false;
    }
    
    // Check if the occupying element has a connection point at this position
    // that would allow connection
    return occupyingElement.connectionPoints.some(cp => 
      cp.position.x === position.x && 
      cp.position.y === position.y &&
      !cp.isConnected
    );
  }
  
  /**
   * Generate connection points for the expanded room
   */
  private static generateConnectionPoints(
    expandedBlocks: Position[],
    context: ExpansionContext,
    roomOrigin: Position
  ): ConnectionPoint[] {
    const connectionPoints: ConnectionPoint[] = [];
    const { sourceConnectionPoint, sourceElementId } = context;
    
    // Add the entry connection point
    // The room's connection point should face back toward the source element
    connectionPoints.push({
      direction: this.getOppositeDirection(sourceConnectionPoint.direction),
      position: context.entryPoint,
      isConnected: true,
      connectedElementId: sourceElementId,
      isGenerated: true,
      state: ConnectionPointState.Connected
    });
    
    // Find perimeter positions that could have doors
    const perimeterPositions = this.findPerimeterPositions(expandedBlocks);
    
    for (const perimeterPos of perimeterPositions) {
      // Skip the entry point (already added)
      if (perimeterPos.x === context.entryPoint.x && 
          perimeterPos.y === context.entryPoint.y) {
        continue;
      }
      
      // Check each direction from this perimeter position
      const directions = [
        ExitDirection.North,
        ExitDirection.South, 
        ExitDirection.East,
        ExitDirection.West
      ];
      
      for (const direction of directions) {
        const adjacentPos = this.getAdjacentPosition(perimeterPos, direction);
        
        // Check if there's a valid reason to place a door here
        if (this.shouldPlaceDoor(perimeterPos, direction, adjacentPos, context)) {
          connectionPoints.push({
            direction,
            position: perimeterPos,
            isConnected: false,
            isGenerated: false,
            state: ConnectionPointState.Ungenerated
          });
        }
      }
    }
    
    return connectionPoints;
  }
  
  /**
   * Determine if a door should be placed at a specific position and direction
   */
  private static shouldPlaceDoor(
    roomPosition: Position,
    direction: ExitDirection,
    adjacentPosition: Position,
    context: ExpansionContext
  ): boolean {
    const { existingRooms, existingCorridors, geomorphBounds, targetPosition } = context;
    
    // Check if there's an existing feature at the adjacent position that has a door
    const adjacentElement = [...existingRooms, ...existingCorridors].find(element => {
      return element.connectionPoints.some(cp =>
        cp.position.x === adjacentPosition.x &&
        cp.position.y === adjacentPosition.y &&
        cp.direction === this.getOppositeDirection(direction)
      );
    });
    
    if (adjacentElement) {
      // There's an existing door we should connect to
      console.log(`Creating connection to existing door at ${adjacentPosition.x},${adjacentPosition.y}`);
      return true;
    }
    
    // Check if the original geomorph template had a door at this position
    const relativeX = roomPosition.x - targetPosition.x;
    const relativeY = roomPosition.y - targetPosition.y;
    
    const templateHasDoor = geomorphBounds.connectionPoints.some(cp => 
      cp.position.x === relativeX && 
      cp.position.y === relativeY && 
      cp.direction === direction
    );
    
    if (templateHasDoor) {
      // Original template had a door here, and the position is on our perimeter
      // Check that the adjacent position is not blocked by existing elements
      const adjacentBlocked = [...existingRooms, ...existingCorridors].some(element => {
        if ('gridPattern' in element) {
          const room = element as Room;
          const relX = adjacentPosition.x - room.position.x;
          const relY = adjacentPosition.y - room.position.y;
          return relX >= 0 && relX < room.width && 
                 relY >= 0 && relY < room.height &&
                 (room.gridPattern?.[relY]?.[relX] ?? true);
        } else {
          const corridor = element as Corridor;
          return corridor.path?.some(p => p.x === adjacentPosition.x && p.y === adjacentPosition.y) ?? false;
        }
      });
      
      // Place door if template had one and adjacent space is free
      return !adjacentBlocked;
    }
    
    return false;
  }
  
  /**
   * Get positions on the perimeter of the expanded room
   */
  private static findPerimeterPositions(expandedBlocks: Position[]): Position[] {
    const blockSet = new Set(expandedBlocks.map(p => this.positionKey(p)));
    const perimeter: Position[] = [];
    
    for (const block of expandedBlocks) {
      const neighbors = this.getNeighbors(block);
      let isPerimeter = false;
      
      for (const neighbor of neighbors) {
        if (!blockSet.has(this.positionKey(neighbor))) {
          isPerimeter = true;
          break;
        }
      }
      
      if (isPerimeter) {
        perimeter.push(block);
      }
    }
    
    return perimeter;
  }
  
  /**
   * Get expansion bias based on entry direction (expand away from entry)
   */
  private static getExpansionBias(entryDirection: ExitDirection): Position {
    switch (entryDirection) {
      case ExitDirection.North: return { x: 0, y: 1 };  // Expand south
      case ExitDirection.South: return { x: 0, y: -1 }; // Expand north
      case ExitDirection.East: return { x: -1, y: 0 };  // Expand west
      case ExitDirection.West: return { x: 1, y: 0 };   // Expand east
      default: return { x: 0, y: 0 };
    }
  }
  
  /**
   * Calculate distance from entry with directional bias
   */
  private static getDistanceFromEntry(
    position: Position,
    entryPoint: Position,
    bias: Position
  ): number {
    const dx = position.x - entryPoint.x;
    const dy = position.y - entryPoint.y;
    
    // Encourage expansion in bias direction
    const biasedDistance = Math.abs(dx) + Math.abs(dy) - 
                          (dx * bias.x + dy * bias.y) * 0.5;
    
    return biasedDistance;
  }
  
  /**
   * Get neighboring positions (4-directional)
   */
  private static getNeighbors(position: Position): Position[] {
    return [
      { x: position.x, y: position.y - 1 }, // North
      { x: position.x, y: position.y + 1 }, // South
      { x: position.x + 1, y: position.y }, // East
      { x: position.x - 1, y: position.y }, // West
    ];
  }
  
  /**
   * Get adjacent position in a specific direction
   */
  private static getAdjacentPosition(position: Position, direction: ExitDirection): Position {
    switch (direction) {
      case ExitDirection.North: return { x: position.x, y: position.y - 1 };
      case ExitDirection.South: return { x: position.x, y: position.y + 1 };
      case ExitDirection.East: return { x: position.x + 1, y: position.y };
      case ExitDirection.West: return { x: position.x - 1, y: position.y };
      default: return position;
    }
  }
  
  /**
   * Get opposite direction
   */
  private static getOppositeDirection(direction: ExitDirection): ExitDirection {
    switch (direction) {
      case ExitDirection.North: return ExitDirection.South;
      case ExitDirection.South: return ExitDirection.North;
      case ExitDirection.East: return ExitDirection.West;
      case ExitDirection.West: return ExitDirection.East;
      default: return direction;
    }
  }
  
  /**
   * Convert position to string key for Set operations
   */
  private static positionKey(position: Position): string {
    return `${position.x},${position.y}`;
  }
}