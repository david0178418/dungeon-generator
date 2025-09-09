import React from 'react';
import { Box, Paper, CircularProgress } from '@mui/material';
import { DungeonMap, ConnectionPoint, ExplorationState } from '../types';
import { RoomRenderer } from './renderers/RoomRenderer';
import { CorridorRenderer } from './renderers/CorridorRenderer';
import { 
  CANVAS_SIZE, 
  DEFAULT_GRID_SQUARE_SIZE,
  GRID_OVERLAY_INTERVAL, 
  GRID_LABEL_OFFSET, 
  GRID_LABEL_FONT_SIZE,
  LOADING_SPINNER_SIZE 
} from '../constants';

interface DungeonCanvasProps {
  dungeonMap: DungeonMap | null;
  selectedRoomId: string | null;
  explorationState: ExplorationState | null;
  onRoomSelect: (roomId: string) => void;
  onDoorClick: (doorId: string, connectionPoint: ConnectionPoint, sourceElementId: string) => void;
  onCorridorExplore: (connectionPoint: ConnectionPoint, sourceElementId: string) => void;
  isGenerating: boolean;
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
  const canvasSize = CANVAS_SIZE;
  const gridSquareSize = dungeonMap ? canvasSize / dungeonMap.gridSize : DEFAULT_GRID_SQUARE_SIZE;

  // Render rooms using the new RoomRenderer component
  const renderRoom = (room: any) => (
    <RoomRenderer
      key={room.id}
      room={room}
      gridSquareSize={gridSquareSize}
      isSelected={selectedRoomId === room.id}
      explorationState={explorationState}
      isGenerating={isGenerating}
      onRoomSelect={onRoomSelect}
      onDoorClick={onDoorClick}
    />
  );

  // Render corridors using the new CorridorRenderer component  
  const renderCorridor = (corridor: any) => (
    <CorridorRenderer
      key={corridor.id}
      corridor={corridor}
      gridSquareSize={gridSquareSize}
      explorationState={explorationState}
      isGenerating={isGenerating}
      onCorridorExplore={onCorridorExplore}
      onDoorClick={onDoorClick}
    />
  );

  if (isGenerating) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: canvasSize,
          backgroundColor: '#f5f5f5',
        }}
      >
        <CircularProgress size={LOADING_SPINNER_SIZE} />
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ padding: 2 }}>
      {dungeonMap ? (
        <svg
          width={canvasSize}
          height={canvasSize}
          viewBox={`0 0 ${canvasSize} ${canvasSize}`}
          style={{ border: '1px solid #ccc', backgroundColor: 'white' }}
        >
          {/* Grid lines */}
          {Array.from({ length: dungeonMap.gridSize + 1 }, (_, i) => (
            <g key={`grid-${i}`}>
              {/* Vertical lines */}
              <line
                x1={i * gridSquareSize}
                y1={0}
                x2={i * gridSquareSize}
                y2={canvasSize}
                stroke="#e0e0e0"
                strokeWidth={0.5}
              />
              {/* Horizontal lines */}
              <line
                x1={0}
                y1={i * gridSquareSize}
                x2={canvasSize}
                y2={i * gridSquareSize}
                stroke="#e0e0e0"
                strokeWidth={0.5}
              />
              
              {/* Grid coordinates (every 5th line) */}
              {i % GRID_OVERLAY_INTERVAL === 0 && (
                <g key={`grid-labels-${i}`}>
                  {/* X-axis labels */}
                  {i <= dungeonMap.gridSize && (
                    <text
                      x={i * gridSquareSize}
                      y={-GRID_LABEL_OFFSET / 2}
                      textAnchor="middle"
                      fontSize={GRID_LABEL_FONT_SIZE}
                      fill="#333"
                      fontWeight="bold"
                    >
                      {i}
                    </text>
                  )}
                  {/* Y-axis labels */}
                  {i <= dungeonMap.gridSize && (
                    <text
                      x={-GRID_LABEL_OFFSET / 2}
                      y={i * gridSquareSize + GRID_LABEL_FONT_SIZE / 3}
                      textAnchor="middle"
                      fontSize={GRID_LABEL_FONT_SIZE}
                      fill="#333"
                      fontWeight="bold"
                    >
                      {i}
                    </text>
                  )}
                </g>
              )}
            </g>
          ))}
          
          {/* Corridors (render first so rooms appear on top) */}
          {dungeonMap.corridors?.map(renderCorridor)}
          
          {/* Rooms */}
          {dungeonMap.rooms.map(renderRoom)}
        </svg>
      ) : (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: canvasSize,
            backgroundColor: '#f5f5f5',
          }}
        >
          <span>No dungeon data available</span>
        </Box>
      )}
    </Paper>
  );
};