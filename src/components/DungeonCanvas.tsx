import React from 'react';
import { Box, Paper } from '@mui/material';
import { DungeonMap, Room, Corridor, ConnectionPoint, RoomType, ExteriorDoor } from '../types';
import { getRoomTemplateById } from '../data/roomTemplates';
import { isConnectionPointConnected } from '../utils/connectionHelpers';
import {
  calculateDoorDimensions,
  generateGridPath,
  generateDarkGridPath,
  calculateRoomCenter
} from '../utils/renderingHelpers';
import { RENDERING, COLORS } from '../constants';

interface DungeonCanvasProps {
  dungeonMap: DungeonMap | null;
  selectedRoomId: string | null;
  onRoomSelect: (roomId: string) => void;
}

export const DungeonCanvas: React.FC<DungeonCanvasProps> = ({
  dungeonMap,
  selectedRoomId,
  onRoomSelect,
}) => {
  const canvasSize = 800;
  const gridSquareSize = dungeonMap ? canvasSize / dungeonMap.gridSize : 20;

  const renderRoom = (room: Room) => {
    const x = room.position.x * gridSquareSize;
    const y = room.position.y * gridSquareSize;
    const isSelected = room.id === selectedRoomId;

    // Get room template for accurate rendering
    const template = room.templateId ? getRoomTemplateById(room.templateId) : null;

    // Define colors based on selection state
    const colors = {
      fill: isSelected ? '#e3f2fd' : COLORS.ROOM_FILL,
      stroke: isSelected ? COLORS.ROOM_SELECTED : COLORS.ROOM_STROKE,
      strokeWidth: isSelected ? RENDERING.SELECTED_STROKE_WIDTH : RENDERING.ROOM_STROKE_WIDTH
    };
    let roomElements: React.ReactElement[] = [];
    
    if (template) {
      // Render room squares with light inner grid lines
      for (let row = 0; row < template.gridPattern.length; row++) {
        for (let col = 0; col < template.gridPattern[row].length; col++) {
          if (template.gridPattern[row][col]) {
            roomElements.push(
              <rect
                key={`${room.id}-${row}-${col}`}
                x={x + col * gridSquareSize}
                y={y + row * gridSquareSize}
                width={gridSquareSize}
                height={gridSquareSize}
                fill={colors.fill}
                stroke={COLORS.ROOM_INNER_GRID}
                strokeWidth={0.5}
                style={{ cursor: 'pointer' }}
                onClick={() => onRoomSelect(room.id)}
              />
            );
          }
        }
      }

      // Draw thick black outer wall edges
      for (let row = 0; row < template.gridPattern.length; row++) {
        for (let col = 0; col < template.gridPattern[row].length; col++) {
          if (template.gridPattern[row][col]) {
            const squareX = x + col * gridSquareSize;
            const squareY = y + row * gridSquareSize;

            // Check each edge and draw thick line if it's an outer wall

            // Top edge - if no room square above
            if (row === 0 || !template.gridPattern[row - 1]?.[col]) {
              roomElements.push(
                <line
                  key={`${room.id}-top-${row}-${col}`}
                  x1={squareX}
                  y1={squareY}
                  x2={squareX + gridSquareSize}
                  y2={squareY}
                  stroke={colors.stroke}
                  strokeWidth={colors.strokeWidth}
                />
              );
            }

            // Bottom edge - if no room square below
            if (row === template.gridPattern.length - 1 || !template.gridPattern[row + 1]?.[col]) {
              roomElements.push(
                <line
                  key={`${room.id}-bottom-${row}-${col}`}
                  x1={squareX}
                  y1={squareY + gridSquareSize}
                  x2={squareX + gridSquareSize}
                  y2={squareY + gridSquareSize}
                  stroke={colors.stroke}
                  strokeWidth={colors.strokeWidth}
                />
              );
            }

            // Left edge - if no room square to the left
            if (col === 0 || !template.gridPattern[row]?.[col - 1]) {
              roomElements.push(
                <line
                  key={`${room.id}-left-${row}-${col}`}
                  x1={squareX}
                  y1={squareY}
                  x2={squareX}
                  y2={squareY + gridSquareSize}
                  stroke={colors.stroke}
                  strokeWidth={colors.strokeWidth}
                />
              );
            }

            // Right edge - if no room square to the right
            if (col === template.gridPattern[row].length - 1 || !template.gridPattern[row]?.[col + 1]) {
              roomElements.push(
                <line
                  key={`${room.id}-right-${row}-${col}`}
                  x1={squareX + gridSquareSize}
                  y1={squareY}
                  x2={squareX + gridSquareSize}
                  y2={squareY + gridSquareSize}
                  stroke={colors.stroke}
                  strokeWidth={colors.strokeWidth}
                />
              );
            }
          }
        }
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
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={colors.strokeWidth}
          style={{ cursor: 'pointer' }}
          onClick={() => onRoomSelect(room.id)}
        />
      );
    }

    // Add doors (connection points as rectangles) - only for connected points
    const doors = room.connectionPoints?.filter(cp => isConnectionPointConnected(cp)).map((cp, index) =>
      renderDoor(room.id, cp, index, gridSquareSize)
    ) || [];

    // Add room number
    const center = calculateRoomCenter(x, y, room.width, room.height, gridSquareSize);

    return (
      <g key={room.id}>
        {roomElements}
        {doors}
        <text
          x={center.x}
          y={center.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={Math.max(10, gridSquareSize / 3)}
          fill={COLORS.TEXT_FILL}
          fontWeight="bold"
          pointerEvents="none"
        >
          {room.id.split('-')[1]?.slice(0, 4) || 'R'}
        </text>
      </g>
    );
  };

  const renderDoor = (roomId: string, cp: ConnectionPoint, index: number, gridSquareSize: number) => {
    const doorDims = calculateDoorDimensions(cp, gridSquareSize);

    return (
      <rect
        key={`${roomId}-door-${index}`}
        x={doorDims.x}
        y={doorDims.y}
        width={doorDims.width}
        height={doorDims.height}
        fill={COLORS.ROOM_FILL}
        stroke={COLORS.ROOM_STROKE}
        strokeWidth={RENDERING.STROKE_WIDTH + 0.5}
      />
    );
  };

  const renderCorridor = (corridor: Corridor) => {
    const elements: React.ReactElement[] = [];

    // Render corridor path
    corridor.path.forEach((pos, index) => {
      elements.push(
        <rect
          key={`${corridor.id}-${index}`}
          x={pos.x * gridSquareSize}
          y={pos.y * gridSquareSize}
          width={gridSquareSize}
          height={gridSquareSize}
          fill={COLORS.CORRIDOR_FILL}
          stroke={COLORS.CORRIDOR_STROKE}
          strokeWidth={RENDERING.STROKE_WIDTH}
        />
      );
    });

    return <g key={corridor.id}>{elements}</g>;
  };

  const renderExteriorEntrance = (entranceDoor: ExteriorDoor) => {
    const x = entranceDoor.position.x * gridSquareSize;
    const y = entranceDoor.position.y * gridSquareSize;

    // Create a larger, more prominent door for the entrance
    let doorWidth, doorHeight, doorX, doorY;

    switch (entranceDoor.direction) {
      case 'south': // Door faces south (into dungeon), so door is on north edge of square
        doorWidth = gridSquareSize * 0.8;
        doorHeight = gridSquareSize * 0.3;
        doorX = x + (gridSquareSize - doorWidth) / 2;
        doorY = y - doorHeight / 2;
        break;
      case 'north': // Door faces north (into dungeon), so door is on south edge of square
        doorWidth = gridSquareSize * 0.8;
        doorHeight = gridSquareSize * 0.3;
        doorX = x + (gridSquareSize - doorWidth) / 2;
        doorY = y + gridSquareSize - doorHeight / 2;
        break;
      case 'west': // Door faces west (into dungeon), so door is on east edge of square
        doorWidth = gridSquareSize * 0.3;
        doorHeight = gridSquareSize * 0.8;
        doorX = x + gridSquareSize - doorWidth / 2;
        doorY = y + (gridSquareSize - doorHeight) / 2;
        break;
      case 'east': // Door faces east (into dungeon), so door is on west edge of square
        doorWidth = gridSquareSize * 0.3;
        doorHeight = gridSquareSize * 0.8;
        doorX = x - doorWidth / 2;
        doorY = y + (gridSquareSize - doorHeight) / 2;
        break;
      default:
        doorWidth = gridSquareSize * 0.4;
        doorHeight = gridSquareSize * 0.4;
        doorX = x + (gridSquareSize - doorWidth) / 2;
        doorY = y + (gridSquareSize - doorHeight) / 2;
    }

    return (
      <g key="exterior-entrance">
        {/* Door opening */}
        <rect
          x={doorX}
          y={doorY}
          width={doorWidth}
          height={doorHeight}
          fill="#4caf50"
          stroke="#2e7d32"
          strokeWidth={3}
        />
        {/* "ENTRANCE" label */}
        <text
          x={x + gridSquareSize / 2}
          y={y + gridSquareSize / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={Math.max(8, gridSquareSize / 5)}
          fill="#fff"
          fontWeight="bold"
          pointerEvents="none"
        >
          ENT
        </text>
      </g>
    );
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

            {/* Exterior entrance door */}
            {dungeonMap.entranceDoor && renderExteriorEntrance(dungeonMap.entranceDoor)}
            
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