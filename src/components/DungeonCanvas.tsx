import React from 'react';
import { Box, Paper } from '@mui/material';
import { DungeonMap, Room, Corridor } from '../types';
import { getRoomTemplateById } from '../data/roomTemplates';

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
    
    let roomElements: React.ReactElement[] = [];
    
    if (template) {
      // Render using template grid pattern
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
                fill={isSelected ? '#e3f2fd' : '#f8f8f8'}
                stroke={isSelected ? '#2196f3' : '#000'}
                strokeWidth={isSelected ? 3 : 2}
                style={{ cursor: 'pointer' }}
                onClick={() => onRoomSelect(room.id)}
              />
            );
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
          fill={isSelected ? '#e3f2fd' : '#f8f8f8'}
          stroke={isSelected ? '#2196f3' : '#000'}
          strokeWidth={isSelected ? 3 : 2}
          style={{ cursor: 'pointer' }}
          onClick={() => onRoomSelect(room.id)}
        />
      );
    }

    // Add doors (connection points as rectangles)
    const doors = room.connectionPoints?.map((cp, index) => 
      renderDoor(room.id, cp, index, gridSquareSize)
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

  const renderDoor = (roomId: string, cp: any, index: number, gridSquareSize: number) => {
    // Calculate door position centered on the edge of the specific grid cell
    let doorWidth, doorHeight, doorX, doorY;
    
    // Get the cell position
    const cellX = cp.position.x * gridSquareSize;
    const cellY = cp.position.y * gridSquareSize;
    
    switch (cp.direction) {
      case 'north':
        // Door centered on top edge of the cell
        doorWidth = gridSquareSize * 0.6;
        doorHeight = gridSquareSize * 0.2;
        doorX = cellX + (gridSquareSize - doorWidth) / 2;
        doorY = cellY - doorHeight / 2;
        break;
      case 'south':
        // Door centered on bottom edge of the cell
        doorWidth = gridSquareSize * 0.6;
        doorHeight = gridSquareSize * 0.2;
        doorX = cellX + (gridSquareSize - doorWidth) / 2;
        doorY = cellY + gridSquareSize - doorHeight / 2;
        break;
      case 'east':
        // Door centered on right edge of the cell
        doorWidth = gridSquareSize * 0.2;
        doorHeight = gridSquareSize * 0.6;
        doorX = cellX + gridSquareSize - doorWidth / 2;
        doorY = cellY + (gridSquareSize - doorHeight) / 2;
        break;
      case 'west':
        // Door centered on left edge of the cell
        doorWidth = gridSquareSize * 0.2;
        doorHeight = gridSquareSize * 0.6;
        doorX = cellX - doorWidth / 2;
        doorY = cellY + (gridSquareSize - doorHeight) / 2;
        break;
      default:
        // Default centered door
        doorWidth = gridSquareSize * 0.3;
        doorHeight = gridSquareSize * 0.3;
        doorX = cellX + (gridSquareSize - doorWidth) / 2;
        doorY = cellY + (gridSquareSize - doorHeight) / 2;
    }

    // Create door with appropriate styling
    const doorElements = [];
    
    // Main door opening (white fill)
    doorElements.push(
      <rect
        key={`${roomId}-door-${index}`}
        x={doorX}
        y={doorY}
        width={doorWidth}
        height={doorHeight}
        fill="#fff"
        stroke="#000"
        strokeWidth={1.5}
      />
    );
    
    // If unexplored (not connected), add visual indicator
    if (!cp.isConnected) {
      // Add a subtle pattern or different styling for unexplored doors
      doorElements.push(
        <rect
          key={`${roomId}-door-unexplored-${index}`}
          x={doorX + 1}
          y={doorY + 1}
          width={doorWidth - 2}
          height={doorHeight - 2}
          fill="none"
          stroke="#999"
          strokeWidth={1}
          strokeDasharray="2,2"
        />
      );
    }
    
    return <g key={`${roomId}-door-group-${index}`}>{doorElements}</g>;
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
          fill="#e0e0e0"
          stroke="#666"
          strokeWidth={1}
        />
      );
    });

    return <g key={corridor.id}>{elements}</g>;
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