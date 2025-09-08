import React from 'react';
import { Box, Paper, CircularProgress } from '@mui/material';
import { DungeonMap, Room, Corridor, ConnectionPoint, ExplorationState, DoorState, Position } from '../types';
import { getRoomTemplateById } from '../data/roomTemplates';

interface DungeonCanvasProps {
  dungeonMap: DungeonMap | null;
  selectedRoomId: string | null;
  explorationState: ExplorationState | null;
  onRoomSelect: (roomId: string) => void;
  onDoorClick: (doorId: string, connectionPoint: ConnectionPoint, sourceElementId: string) => void;
  onCorridorExplore: (connectionPoint: ConnectionPoint, sourceElementId: string) => void;
  isGenerating: boolean;
}

interface WallSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface DoorOpening {
  x: number;
  y: number;
  width: number;
  height: number;
  direction: string;
}

export const DungeonCanvas: React.FC<DungeonCanvasProps> = ({
  dungeonMap,
  selectedRoomId,
  explorationState,
  onRoomSelect,
  onDoorClick,
  onCorridorExplore,
  isGenerating,
}) => {
  const canvasSize = 800;
  const gridSquareSize = dungeonMap ? canvasSize / dungeonMap.gridSize : 20;

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

  // Helper function to convert connection points to door openings for rooms
  // Always create openings for all connection points - door visibility is handled separately
  const getDoorOpenings = (room: Room, elementId: string): DoorOpening[] => {
    return room.connectionPoints.map(cp => {
      const localX = cp.position.x - room.position.x;
      const localY = cp.position.y - room.position.y;
      
      switch (cp.direction) {
        case 'north':
          return { x: localX, y: localY, width: 0.6, height: 0.2, direction: 'north' };
        case 'south':
          return { x: localX, y: localY + 1, width: 0.6, height: 0.2, direction: 'south' };
        case 'east':
          return { x: localX + 1, y: localY, width: 0.2, height: 0.6, direction: 'east' };
        case 'west':
          return { x: localX, y: localY, width: 0.2, height: 0.6, direction: 'west' };
        default:
          return { x: localX, y: localY, width: 0.3, height: 0.3, direction: 'unknown' };
      }
    });
  };

  // Helper function to check if a wall segment intersects with a door opening
  const wallIntersectsDoor = (wall: WallSegment, door: DoorOpening): boolean => {
    const doorLeft = door.x - door.width / 2;
    const doorRight = door.x + door.width / 2;
    const doorTop = door.y - door.height / 2;
    const doorBottom = door.y + door.height / 2;
    
    // Check if wall segment overlaps with door opening
    if (wall.x1 === wall.x2) {
      // Vertical wall
      const wallX = wall.x1;
      const wallTop = Math.min(wall.y1, wall.y2);
      const wallBottom = Math.max(wall.y1, wall.y2);
      
      return wallX >= doorLeft && wallX <= doorRight && 
             wallTop < doorBottom && wallBottom > doorTop;
    } else {
      // Horizontal wall
      const wallY = wall.y1;
      const wallLeft = Math.min(wall.x1, wall.x2);
      const wallRight = Math.max(wall.x1, wall.x2);
      
      return wallY >= doorTop && wallY <= doorBottom &&
             wallLeft < doorRight && wallRight > doorLeft;
    }
  };

  // Helper function to generate wall path with door openings
  const generateWallPath = (walls: WallSegment[], doors: DoorOpening[], gridSquareSize: number, roomX: number, roomY: number): string => {
    // Direction-specific door-wall intersection: remove walls based on exact door positioning
    const filteredWalls = walls.filter(wall => {
      return !doors.some(door => {
        const doorGridX = Math.floor(door.x);
        const doorGridY = Math.floor(door.y);
        
        // Direction-specific intersection logic
        switch (door.direction) {
          case 'north':
            // North doors are at the top edge, remove horizontal walls at that position
            return wall.y1 === wall.y2 && wall.y1 === doorGridY &&
                   doorGridX >= Math.min(wall.x1, wall.x2) && doorGridX < Math.max(wall.x1, wall.x2);
          
          case 'south':
            // South doors are at the bottom edge, remove horizontal walls at doorY + 1
            return wall.y1 === wall.y2 && wall.y1 === doorGridY &&
                   doorGridX >= Math.min(wall.x1, wall.x2) && doorGridX < Math.max(wall.x1, wall.x2);
          
          case 'west':
            // West doors are at the left edge, remove vertical walls at that position
            return wall.x1 === wall.x2 && wall.x1 === doorGridX &&
                   doorGridY >= Math.min(wall.y1, wall.y2) && doorGridY < Math.max(wall.y1, wall.y2);
          
          case 'east':
            // East doors are at the right edge, remove vertical walls at doorX
            return wall.x1 === wall.x2 && wall.x1 === doorGridX &&
                   doorGridY >= Math.min(wall.y1, wall.y2) && doorGridY < Math.max(wall.y1, wall.y2);
          
          default:
            // Fallback to original logic for unknown directions
            if (wall.y1 === wall.y2) {
              return (wall.y1 === doorGridY || wall.y1 === doorGridY + 1) &&
                     doorGridX >= Math.min(wall.x1, wall.x2) && doorGridX < Math.max(wall.x1, wall.x2);
            }
            if (wall.x1 === wall.x2) {
              return (wall.x1 === doorGridX || wall.x1 === doorGridX + 1) &&
                     doorGridY >= Math.min(wall.y1, wall.y2) && doorGridY < Math.max(wall.y1, wall.y2);
            }
            return false;
        }
      });
    });
    
    if (filteredWalls.length === 0) return '';
    
    // Convert wall segments to screen coordinates and create path
    const pathSegments = filteredWalls.map(wall => {
      const x1 = roomX + wall.x1 * gridSquareSize;
      const y1 = roomY + wall.y1 * gridSquareSize;
      const x2 = roomX + wall.x2 * gridSquareSize;
      const y2 = roomY + wall.y2 * gridSquareSize;
      
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    });
    
    return pathSegments.join(' ');
  };

  // Helper function to create default grid pattern for rooms without custom pattern
  const getDefaultGridPattern = (room: Room): boolean[][] => {
    const pattern: boolean[][] = [];
    for (let row = 0; row < room.height; row++) {
      pattern[row] = [];
      for (let col = 0; col < room.width; col++) {
        pattern[row][col] = true; // All squares occupied by default
      }
    }
    return pattern;
  };

  const renderRoom = (room: Room) => {
    const x = room.position.x * gridSquareSize;
    const y = room.position.y * gridSquareSize;
    const isSelected = room.id === selectedRoomId;

    // Use room's custom gridPattern if it exists, otherwise get template pattern
    let gridPattern = room.gridPattern;
    if (!gridPattern && room.templateId) {
      const template = getRoomTemplateById(room.templateId);
      gridPattern = template?.gridPattern;
    }
    
    let roomElements: React.ReactElement[] = [];
    
    if (gridPattern) {
      // Create room interior (filled squares without borders)
      for (let row = 0; row < gridPattern.length; row++) {
        for (let col = 0; col < gridPattern[row].length; col++) {
          if (gridPattern[row][col]) {
            roomElements.push(
              <rect
                key={`${room.id}-fill-${row}-${col}`}
                x={x + col * gridSquareSize}
                y={y + row * gridSquareSize}
                width={gridSquareSize}
                height={gridSquareSize}
                fill={isSelected ? '#e3f2fd' : '#f8f8f8'}
                stroke="none"
                style={{ cursor: 'pointer' }}
                onClick={() => onRoomSelect(room.id)}
              />
            );
          }
        }
      }

      // Create room walls (bold perimeter strokes with door openings)
      const walls = calculateRoomPerimeter(gridPattern);
      const doorOpenings = getDoorOpenings(room, room.id);
      const wallPath = generateWallPath(walls, doorOpenings, gridSquareSize, x, y);
      
      if (wallPath) {
        roomElements.push(
          <path
            key={`${room.id}-walls`}
            d={wallPath}
            fill="none"
            stroke={isSelected ? '#2196f3' : '#000'}
            strokeWidth={isSelected ? 4 : 3}
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="none"
          />
        );
      }
    } else {
      // Fallback to simple rectangle
      roomElements.push(
        <rect
          key={room.id}
          x={x}
          y={y}
          width={room.width * gridSquareSize}
          height={room.height * gridSquareSize}
          fill={isSelected ? '#e3f2fd' : '#f8f8f8'}
          stroke={isSelected ? '#2196f3' : '#000'}
          strokeWidth={isSelected ? 4 : 3}
          style={{ cursor: 'pointer' }}
          onClick={() => onRoomSelect(room.id)}
        />
      );
    }

    // Add doors (connection points as rectangles)
    const doors = room.connectionPoints?.map((cp, index) => 
      renderDoor(room.id, cp, index, gridSquareSize, room.id)
    ) || [];

    // Add room number
    const centerX = x + (room.width * gridSquareSize) / 2;
    const centerY = y + (room.height * gridSquareSize) / 2;
    
    return (
      <g key={room.id}>
        {roomElements}
        {doors}
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={Math.max(10, gridSquareSize / 3)}
          fill="#000"
          fontWeight="bold"
          pointerEvents="none"
        >
          {room.id.split('-')[1]?.slice(0, 4) || 'R'}
        </text>
      </g>
    );
  };

  const renderDoor = (
    elementId: string, 
    cp: ConnectionPoint, 
    index: number, 
    gridSquareSize: number,
    sourceElementId: string
  ) => {
    const doorId = `${elementId}-door-${index}`;
    const doorState = explorationState?.doorStates.get(doorId) || DoorState.Closed;
    
    // Calculate door position centered on the edge of the specific grid cell
    let doorWidth, doorHeight, doorX, doorY;
    
    // Get the cell position
    const cellX = cp.position.x * gridSquareSize;
    const cellY = cp.position.y * gridSquareSize;
    
    switch (cp.direction) {
      case 'north':
        doorWidth = gridSquareSize * 0.6;
        doorHeight = gridSquareSize * 0.2;
        doorX = cellX + (gridSquareSize - doorWidth) / 2;
        doorY = cellY - doorHeight / 2;
        break;
      case 'south':
        doorWidth = gridSquareSize * 0.6;
        doorHeight = gridSquareSize * 0.2;
        doorX = cellX + (gridSquareSize - doorWidth) / 2;
        doorY = cellY + gridSquareSize - doorHeight / 2;
        break;
      case 'east':
        doorWidth = gridSquareSize * 0.2;
        doorHeight = gridSquareSize * 0.6;
        doorX = cellX + gridSquareSize - doorWidth / 2;
        doorY = cellY + (gridSquareSize - doorHeight) / 2;
        break;
      case 'west':
        doorWidth = gridSquareSize * 0.2;
        doorHeight = gridSquareSize * 0.6;
        doorX = cellX - doorWidth / 2;
        doorY = cellY + (gridSquareSize - doorHeight) / 2;
        break;
      default:
        doorWidth = gridSquareSize * 0.3;
        doorHeight = gridSquareSize * 0.3;
        doorX = cellX + (gridSquareSize - doorWidth) / 2;
        doorY = cellY + (gridSquareSize - doorHeight) / 2;
    }

    // Determine door appearance based on state
    let doorFill = '#fff';
    let doorStroke = '#000';
    let doorStrokeWidth = 1.5;
    let cursor = 'default';
    let doorOpacity = 1;

    if (doorState === DoorState.Closed) {
      if (!cp.isGenerated) {
        // Unexplored door - show as clickable
        doorFill = '#ffeb3b';
        doorStroke = '#f57f17';
        doorStrokeWidth = 2;
        cursor = 'pointer';
      } else {
        // Closed but explored door
        doorFill = '#e0e0e0';
        doorStroke = '#757575';
        cursor = 'pointer';
      }
    } else if (doorState === DoorState.Open) {
      // Open door - show as green/transparent to indicate it's open
      doorFill = '#4caf50';
      doorStroke = '#2e7d32';
      doorStrokeWidth = 2;
      doorOpacity = 0.3;
    }

    const handleDoorClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (doorState === DoorState.Closed && !isGenerating) {
        onDoorClick(doorId, cp, sourceElementId);
      }
    };

    // Create door elements
    const doorElements = [];
    
    // Main door rectangle
    doorElements.push(
      <rect
        key={`${elementId}-door-${index}`}
        x={doorX}
        y={doorY}
        width={doorWidth}
        height={doorHeight}
        fill={doorFill}
        stroke={doorStroke}
        strokeWidth={doorStrokeWidth}
        opacity={doorOpacity}
        style={{ cursor }}
        onClick={handleDoorClick}
      />
    );
    
    // Add question mark for unexplored doors
    if (!cp.isGenerated && doorState === DoorState.Closed) {
      const textX = doorX + doorWidth / 2;
      const textY = doorY + doorHeight / 2;
      doorElements.push(
        <text
          key={`${elementId}-door-question-${index}`}
          x={textX}
          y={textY}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={Math.max(8, gridSquareSize / 4)}
          fill="#f57f17"
          fontWeight="bold"
          pointerEvents="none"
        >
          ?
        </text>
      );
    }
    
    // Add door number for open doors
    if (doorState === DoorState.Open) {
      const textX = doorX + doorWidth / 2;
      const textY = doorY + doorHeight / 2;
      doorElements.push(
        <text
          key={`${elementId}-door-number-${index}`}
          x={textX}
          y={textY}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={Math.max(6, gridSquareSize / 6)}
          fill="#666"
          fontWeight="bold"
          pointerEvents="none"
        >
          {index + 1}
        </text>
      );
    }
    
    return <g key={`${elementId}-door-group-${index}`}>{doorElements}</g>;
  };

  const renderCorridor = (corridor: Corridor) => {
    const elements: React.ReactElement[] = [];

    // Create corridor interior (filled squares without borders)
    corridor.path.forEach((pos, index) => {
      elements.push(
        <rect
          key={`${corridor.id}-fill-${index}`}
          x={pos.x * gridSquareSize}
          y={pos.y * gridSquareSize}
          width={gridSquareSize}
          height={gridSquareSize}
          fill="#e0e0e0"
          stroke="none"
        />
      );
    });

    // Create corridor walls (simple rectangular perimeter)
    if (corridor.path.length > 0) {
      const minX = Math.min(...corridor.path.map(p => p.x));
      const maxX = Math.max(...corridor.path.map(p => p.x));
      const minY = Math.min(...corridor.path.map(p => p.y));
      const maxY = Math.max(...corridor.path.map(p => p.y));
      
      // Create a simple grid pattern for the corridor
      const corridorWidth = maxX - minX + 1;
      const corridorHeight = maxY - minY + 1;
      const corridorPattern: boolean[][] = [];
      
      // Initialize pattern
      for (let y = 0; y < corridorHeight; y++) {
        corridorPattern[y] = new Array(corridorWidth).fill(false);
      }
      
      // Fill pattern based on corridor path
      corridor.path.forEach(pos => {
        corridorPattern[pos.y - minY][pos.x - minX] = true;
      });
      
      // Calculate walls for corridor
      const walls = calculateRoomPerimeter(corridorPattern);
      const doorOpenings = corridor.connectionPoints.map(cp => {
        const localX = cp.position.x - minX;
        const localY = cp.position.y - minY;
        
        // Use same door sizing logic as rooms
        switch (cp.direction) {
          case 'north':
            return { x: localX, y: localY, width: 0.6, height: 0.2, direction: 'north' };
          case 'south':
            return { x: localX, y: localY + 1, width: 0.6, height: 0.2, direction: 'south' };
          case 'east':
            return { x: localX + 1, y: localY, width: 0.2, height: 0.6, direction: 'east' };
          case 'west':
            return { x: localX, y: localY, width: 0.2, height: 0.6, direction: 'west' };
          default:
            return { x: localX, y: localY, width: 0.3, height: 0.3, direction: 'unknown' };
        }
      });
      
      const wallPath = generateWallPath(
        walls,
        doorOpenings,
        gridSquareSize,
        minX * gridSquareSize,
        minY * gridSquareSize
      );
      
      if (wallPath) {
        elements.push(
          <path
            key={`${corridor.id}-walls`}
            d={wallPath}
            fill="none"
            stroke="#333"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="none"
          />
        );
      }
    }

    // Add corridor doors/connection points
    const doors = corridor.connectionPoints?.map((cp, index) => 
      renderDoor(corridor.id, cp, index, gridSquareSize, corridor.id)
    ) || [];
    
    // Add corridor exploration indicators for unexplored ends
    corridor.connectionPoints?.forEach((cp, index) => {
      if (!cp.isGenerated && !cp.isConnected) {
        const indicatorX = cp.position.x * gridSquareSize + gridSquareSize / 2;
        const indicatorY = cp.position.y * gridSquareSize + gridSquareSize / 2;
        
        elements.push(
          <circle
            key={`${corridor.id}-explore-${index}`}
            cx={indicatorX}
            cy={indicatorY}
            r={gridSquareSize / 8}
            fill="#ff9800"
            stroke="#e65100"
            strokeWidth={2}
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              if (!isGenerating) {
                onCorridorExplore(cp, corridor.id);
              }
            }}
          />
        );
        
        // Add "?" text to exploration indicator
        elements.push(
          <text
            key={`${corridor.id}-explore-text-${index}`}
            x={indicatorX}
            y={indicatorY}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={Math.max(6, gridSquareSize / 6)}
            fill="#e65100"
            fontWeight="bold"
            pointerEvents="none"
          >
            ?
          </text>
        );
      }
    });

    return <g key={corridor.id}>{[...elements, ...doors]}</g>;
  };


  return (
    <Paper elevation={3} sx={{ p: 2, height: canvasSize + 40, overflow: 'hidden' }}>
      <Box
        sx={{
          width: canvasSize,
          height: canvasSize,
          border: '1px solid #ccc',
          backgroundColor: '#fafafa',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Loading overlay */}
        {isGenerating && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={40} />
              <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                Generating...
              </Box>
            </Box>
          </Box>
        )}
        {dungeonMap ? (
          <svg width={canvasSize} height={canvasSize}>
            {/* Grid background */}
            <rect width="100%" height="100%" fill="#ffffff" stroke="#000" strokeWidth="2" />
            
            {/* Grid lines - major (every 5 squares) */}
            <defs>
              <pattern id="majorGrid" width={gridSquareSize * 5} height={gridSquareSize * 5} patternUnits="userSpaceOnUse">
                <path
                  d={`M ${gridSquareSize * 5} 0 L 0 0 0 ${gridSquareSize * 5}`}
                  fill="none"
                  stroke="#666666"
                  strokeWidth="1"
                />
              </pattern>
              <pattern id="minorGrid" width={gridSquareSize} height={gridSquareSize} patternUnits="userSpaceOnUse">
                <path
                  d={`M ${gridSquareSize} 0 L 0 0 0 ${gridSquareSize}`}
                  fill="none"
                  stroke="#dddddd"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            
            {/* Apply grid patterns */}
            <rect width="100%" height="100%" fill="url(#minorGrid)" />
            <rect width="100%" height="100%" fill="url(#majorGrid)" />
            
            {/* Grid coordinates */}
            {Array.from({ length: Math.ceil(dungeonMap.gridSize / 5) + 1 }, (_, i) => i * 5).map(i => (
              <g key={`coords-${i}`}>
                {/* X-axis labels */}
                {i <= dungeonMap.gridSize && (
                  <text
                    x={i * gridSquareSize}
                    y={-5}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#666"
                  >
                    {i}
                  </text>
                )}
                {/* Y-axis labels */}
                {i <= dungeonMap.gridSize && (
                  <text
                    x={-5}
                    y={i * gridSquareSize + 4}
                    textAnchor="end"
                    fontSize="10"
                    fill="#666"
                  >
                    {i}
                  </text>
                )}
              </g>
            ))}
            
            {/* Corridors (render first so rooms appear on top) */}
            {dungeonMap.corridors?.map(renderCorridor)}
            
            {/* Rooms */}
            {dungeonMap.rooms.map(renderRoom)}
            
            {/* Grid coordinates overlay */}
            <g transform="translate(-15, -15)">
              {Array.from({ length: Math.ceil(dungeonMap.gridSize / 5) + 1 }, (_, i) => i * 5).map(i => (
                <g key={`overlay-coords-${i}`}>
                  {/* X-axis labels */}
                  {i <= dungeonMap.gridSize && (
                    <text
                      x={i * gridSquareSize + 15}
                      y={10}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#333"
                      fontWeight="bold"
                    >
                      {i}
                    </text>
                  )}
                  {/* Y-axis labels */}
                  {i <= dungeonMap.gridSize && (
                    <text
                      x={10}
                      y={i * gridSquareSize + 19}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#333"
                      fontWeight="bold"
                    >
                      {i}
                    </text>
                  )}
                </g>
              ))}
            </g>
          </svg>
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'text.secondary',
              fontSize: '1.2rem',
            }}
          >
            Generate a dungeon to see the map
          </Box>
        )}
      </Box>
    </Paper>
  );
};