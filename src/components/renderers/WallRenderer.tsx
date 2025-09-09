import React, { useMemo } from 'react';
import { Room, WallSegment, DoorOpening } from '../../types';
import { getRoomTemplateById } from '../../data/roomTemplates';
import { ROOM_COLORS } from '../../constants';

interface WallRendererProps {
  room: Room;
  gridSquareSize: number;
  doorOpenings: DoorOpening[];
  isSelected: boolean;
}

export const WallRenderer: React.FC<WallRendererProps> = React.memo(({
  room,
  gridSquareSize,
  doorOpenings,
  isSelected
}) => {
  // Helper function to calculate room perimeter from gridPattern
  const calculateRoomPerimeter = (gridPattern: boolean[][]): WallSegment[] => {
    const walls: WallSegment[] = [];
    const height = gridPattern.length;
    const width = gridPattern[0]?.length || 0;
    
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        if (gridPattern[row][col]) {
          // Check each edge of this cell
          
          // North edge
          if (row === 0 || !gridPattern[row - 1][col]) {
            walls.push({
              x1: col,
              y1: row,
              x2: col + 1,
              y2: row
            });
          }
          
          // South edge
          if (row === height - 1 || !gridPattern[row + 1][col]) {
            walls.push({
              x1: col,
              y1: row + 1,
              x2: col + 1,
              y2: row + 1
            });
          }
          
          // West edge
          if (col === 0 || !gridPattern[row][col - 1]) {
            walls.push({
              x1: col,
              y1: row,
              x2: col,
              y2: row + 1
            });
          }
          
          // East edge
          if (col === width - 1 || !gridPattern[row][col + 1]) {
            walls.push({
              x1: col + 1,
              y1: row,
              x2: col + 1,
              y2: row + 1
            });
          }
        }
      }
    }
    
    return walls;
  };

  // Create wall path with openings for doors
  const createWallPath = (walls: WallSegment[], doorOpenings: DoorOpening[]): string => {
    if (walls.length === 0) return '';
    
    let path = '';
    const processedWalls: boolean[] = new Array(walls.length).fill(false);
    
    // Group walls into connected segments
    for (let i = 0; i < walls.length; i++) {
      if (processedWalls[i]) continue;
      
      const currentSegment = walls[i];
      path += `M ${currentSegment.x1 * gridSquareSize} ${currentSegment.y1 * gridSquareSize}`;
      
      // Check if this wall segment intersects with any door opening
      let shouldDrawWall = true;
      for (const door of doorOpenings) {
        const doorLeft = door.x;
        const doorRight = door.x + door.width;
        const doorTop = door.y;
        const doorBottom = door.y + door.height;
        
        const wallLeft = Math.min(currentSegment.x1, currentSegment.x2) * gridSquareSize;
        const wallRight = Math.max(currentSegment.x1, currentSegment.x2) * gridSquareSize;
        const wallTop = Math.min(currentSegment.y1, currentSegment.y2) * gridSquareSize;
        const wallBottom = Math.max(currentSegment.y1, currentSegment.y2) * gridSquareSize;
        
        // Check for intersection
        if (!(doorRight <= wallLeft || doorLeft >= wallRight || 
              doorBottom <= wallTop || doorTop >= wallBottom)) {
          shouldDrawWall = false;
          break;
        }
      }
      
      if (shouldDrawWall) {
        path += ` L ${currentSegment.x2 * gridSquareSize} ${currentSegment.y2 * gridSquareSize}`;
      } else {
        // Create wall segments around the door opening
        // This is a simplified approach - in practice you'd want more sophisticated door opening logic
        path += ` L ${currentSegment.x2 * gridSquareSize} ${currentSegment.y2 * gridSquareSize}`;
      }
      
      processedWalls[i] = true;
    }
    
    return path;
  };

  // Get the grid pattern for the room
  const getGridPattern = (): boolean[][] => {
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
  };

  // Memoize expensive calculations
  const gridPattern = useMemo(() => getGridPattern(), [room.gridPattern, room.templateId, room.width, room.height]);
  const walls = useMemo(() => calculateRoomPerimeter(gridPattern), [gridPattern]);
  const wallPath = useMemo(() => createWallPath(walls, doorOpenings), [walls, doorOpenings, gridSquareSize]);
  
  const x = useMemo(() => room.position.x * gridSquareSize, [room.position.x, gridSquareSize]);
  const y = useMemo(() => room.position.y * gridSquareSize, [room.position.y, gridSquareSize]);

  // Create room fill rectangles based on grid pattern
  const roomElements: React.ReactElement[] = [];
  
  gridPattern.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell) {
        roomElements.push(
          <rect
            key={`${room.id}-cell-${rowIndex}-${colIndex}`}
            x={x + colIndex * gridSquareSize}
            y={y + rowIndex * gridSquareSize}
            width={gridSquareSize}
            height={gridSquareSize}
            fill={ROOM_COLORS.FILL}
            stroke="none"
          />
        );
      }
    });
  });

  return (
    <g>
      {/* Room fill */}
      {roomElements}
      
      {/* Room walls */}
      {wallPath && (
        <path
          d={wallPath}
          fill="none"
          stroke={isSelected ? ROOM_COLORS.SELECTED_STROKE : ROOM_COLORS.STROKE}
          strokeWidth={isSelected ? ROOM_COLORS.SELECTED_STROKE_WIDTH : ROOM_COLORS.STROKE_WIDTH}
          transform={`translate(${x}, ${y})`}
        />
      )}
    </g>
  );
});