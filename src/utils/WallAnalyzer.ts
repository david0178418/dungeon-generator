import { 
  Position, 
  Room, 
  Corridor, 
  WallSegment, 
  WallOverlap, 
  ExitDirection 
} from '../types';
import { getRoomTemplateById } from '../data/roomTemplates';

export class WallAnalyzer {
  /**
   * Get all wall segments for a room based on its grid pattern
   */
  static getRoomWallSegments(room: Room): WallSegment[] {
    const segments: WallSegment[] = [];
    const gridPattern = this.getRoomGridPattern(room);
    
    if (!gridPattern || gridPattern.length === 0) {
      return segments;
    }

    const height = gridPattern.length;
    const width = gridPattern[0]?.length || 0;
    
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        if (gridPattern[row][col]) {
          const worldX = room.position.x + col;
          const worldY = room.position.y + row;
          
          // North wall segment
          if (row === 0 || !gridPattern[row - 1][col]) {
            segments.push({
              start: { x: worldX, y: worldY },
              end: { x: worldX + 1, y: worldY },
              direction: 'horizontal',
              elementId: room.id,
              elementType: 'room'
            });
          }
          
          // South wall segment
          if (row === height - 1 || !gridPattern[row + 1][col]) {
            segments.push({
              start: { x: worldX, y: worldY + 1 },
              end: { x: worldX + 1, y: worldY + 1 },
              direction: 'horizontal',
              elementId: room.id,
              elementType: 'room'
            });
          }
          
          // West wall segment
          if (col === 0 || !gridPattern[row][col - 1]) {
            segments.push({
              start: { x: worldX, y: worldY },
              end: { x: worldX, y: worldY + 1 },
              direction: 'vertical',
              elementId: room.id,
              elementType: 'room'
            });
          }
          
          // East wall segment
          if (col === width - 1 || !gridPattern[row][col + 1]) {
            segments.push({
              start: { x: worldX + 1, y: worldY },
              end: { x: worldX + 1, y: worldY + 1 },
              direction: 'vertical',
              elementId: room.id,
              elementType: 'room'
            });
          }
        }
      }
    }
    
    return segments;
  }

  /**
   * Get wall segments for a corridor based on its path
   */
  static getCorridorWallSegments(corridor: Corridor): WallSegment[] {
    const segments: WallSegment[] = [];
    
    if (!corridor.path || corridor.path.length === 0) {
      return segments;
    }

    // For each position in the corridor path, create wall segments around it
    corridor.path.forEach(pos => {
      // North wall
      segments.push({
        start: { x: pos.x, y: pos.y },
        end: { x: pos.x + 1, y: pos.y },
        direction: 'horizontal',
        elementId: corridor.id,
        elementType: 'corridor'
      });
      
      // South wall
      segments.push({
        start: { x: pos.x, y: pos.y + 1 },
        end: { x: pos.x + 1, y: pos.y + 1 },
        direction: 'horizontal',
        elementId: corridor.id,
        elementType: 'corridor'
      });
      
      // West wall
      segments.push({
        start: { x: pos.x, y: pos.y },
        end: { x: pos.x, y: pos.y + 1 },
        direction: 'vertical',
        elementId: corridor.id,
        elementType: 'corridor'
      });
      
      // East wall
      segments.push({
        start: { x: pos.x + 1, y: pos.y },
        end: { x: pos.x + 1, y: pos.y + 1 },
        direction: 'vertical',
        elementId: corridor.id,
        elementType: 'corridor'
      });
    });
    
    return segments;
  }

  /**
   * Find overlapping wall segments between elements
   */
  static findWallOverlaps(elements: (Room | Corridor)[]): WallOverlap[] {
    const allSegments: WallSegment[] = [];
    const overlaps: WallOverlap[] = [];
    
    // Collect all wall segments
    elements.forEach(element => {
      if ('gridPattern' in element || 'templateId' in element) {
        // It's a room
        allSegments.push(...this.getRoomWallSegments(element as Room));
      } else {
        // It's a corridor
        allSegments.push(...this.getCorridorWallSegments(element as Corridor));
      }
    });

    // Find overlapping segments
    for (let i = 0; i < allSegments.length; i++) {
      for (let j = i + 1; j < allSegments.length; j++) {
        const segment1 = allSegments[i];
        const segment2 = allSegments[j];
        
        // Skip if same element
        if (segment1.elementId === segment2.elementId) {
          continue;
        }
        
        // Check if segments overlap
        if (this.doSegmentsOverlap(segment1, segment2)) {
          const overlapPosition = this.getOverlapPosition(segment1, segment2);
          if (overlapPosition) {
            // Check if we already have this overlap
            const existingOverlap = overlaps.find(overlap => 
              overlap.position.x === overlapPosition.x && 
              overlap.position.y === overlapPosition.y
            );
            
            if (existingOverlap) {
              // Add element IDs if not already present
              if (!existingOverlap.elementIds.includes(segment1.elementId)) {
                existingOverlap.elementIds.push(segment1.elementId);
              }
              if (!existingOverlap.elementIds.includes(segment2.elementId)) {
                existingOverlap.elementIds.push(segment2.elementId);
              }
            } else {
              overlaps.push({
                position: overlapPosition,
                elementIds: [segment1.elementId, segment2.elementId],
                segmentType: segment1.direction
              });
            }
          }
        }
      }
    }
    
    return overlaps;
  }

  /**
   * Check if two wall segments overlap
   */
  private static doSegmentsOverlap(segment1: WallSegment, segment2: WallSegment): boolean {
    // Segments must be the same direction to overlap
    if (segment1.direction !== segment2.direction) {
      return false;
    }
    
    if (segment1.direction === 'horizontal') {
      // Horizontal segments: same Y coordinate and overlapping X ranges
      return segment1.start.y === segment2.start.y &&
             this.rangesOverlap(
               segment1.start.x, segment1.end.x,
               segment2.start.x, segment2.end.x
             );
    } else {
      // Vertical segments: same X coordinate and overlapping Y ranges
      return segment1.start.x === segment2.start.x &&
             this.rangesOverlap(
               segment1.start.y, segment1.end.y,
               segment2.start.y, segment2.end.y
             );
    }
  }

  /**
   * Check if two 1D ranges overlap
   */
  private static rangesOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
    return Math.max(start1, start2) < Math.min(end1, end2);
  }

  /**
   * Get the position where two segments overlap
   */
  private static getOverlapPosition(segment1: WallSegment, segment2: WallSegment): Position | null {
    if (!this.doSegmentsOverlap(segment1, segment2)) {
      return null;
    }

    if (segment1.direction === 'horizontal') {
      return {
        x: Math.max(segment1.start.x, segment2.start.x),
        y: segment1.start.y
      };
    } else {
      return {
        x: segment1.start.x,
        y: Math.max(segment1.start.y, segment2.start.y)
      };
    }
  }

  /**
   * Get the grid pattern for a room
   */
  private static getRoomGridPattern(room: Room): boolean[][] | null {
    if (room.gridPattern) {
      return room.gridPattern;
    }
    
    const template = getRoomTemplateById(room.templateId || '');
    if (template?.gridPattern) {
      return template.gridPattern;
    }
    
    // Fallback: create a solid rectangle pattern
    const pattern: boolean[][] = [];
    for (let y = 0; y < room.height; y++) {
      pattern[y] = [];
      for (let x = 0; x < room.width; x++) {
        pattern[y][x] = true;
      }
    }
    return pattern;
  }

  /**
   * Check if a position is adjacent to an element
   */
  static isPositionAdjacentToElement(
    position: Position, 
    direction: ExitDirection, 
    element: Room | Corridor
  ): boolean {
    if ('gridPattern' in element || 'templateId' in element) {
      return this.isPositionAdjacentToRoom(position, direction, element as Room);
    } else {
      return this.isPositionAdjacentToCorridor(position, direction, element as Corridor);
    }
  }

  /**
   * Check if a position is adjacent to a room
   */
  private static isPositionAdjacentToRoom(
    position: Position, 
    direction: ExitDirection, 
    room: Room
  ): boolean {
    const gridPattern = this.getRoomGridPattern(room);
    if (!gridPattern) return false;

    // Check if the position is on the room's perimeter in the given direction
    const relativeX = position.x - room.position.x;
    const relativeY = position.y - room.position.y;
    
    // Position must be within or adjacent to room bounds
    if (relativeX < -1 || relativeX > room.width || 
        relativeY < -1 || relativeY > room.height) {
      return false;
    }

    switch (direction) {
      case ExitDirection.North:
        return relativeY === 0 && relativeX >= 0 && relativeX < room.width &&
               gridPattern[0] && gridPattern[0][relativeX];
      case ExitDirection.South:
        return relativeY === room.height - 1 && relativeX >= 0 && relativeX < room.width &&
               gridPattern[room.height - 1] && gridPattern[room.height - 1][relativeX];
      case ExitDirection.West:
        return relativeX === 0 && relativeY >= 0 && relativeY < room.height &&
               gridPattern[relativeY] && gridPattern[relativeY][0];
      case ExitDirection.East:
        return relativeX === room.width - 1 && relativeY >= 0 && relativeY < room.height &&
               gridPattern[relativeY] && gridPattern[relativeY][room.width - 1];
      default:
        return false;
    }
  }

  /**
   * Check if a position is adjacent to a corridor
   */
  private static isPositionAdjacentToCorridor(
    position: Position, 
    direction: ExitDirection, 
    corridor: Corridor
  ): boolean {
    if (!corridor.path) return false;

    // Check if any corridor path position is adjacent to the given position
    return corridor.path.some(pathPos => {
      switch (direction) {
        case ExitDirection.North:
          return pathPos.x === position.x && pathPos.y === position.y - 1;
        case ExitDirection.South:
          return pathPos.x === position.x && pathPos.y === position.y + 1;
        case ExitDirection.West:
          return pathPos.x === position.x - 1 && pathPos.y === position.y;
        case ExitDirection.East:
          return pathPos.x === position.x + 1 && pathPos.y === position.y;
        default:
          return false;
      }
    });
  }
}