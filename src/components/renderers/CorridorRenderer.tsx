import React from 'react';
import { Corridor, ConnectionPoint, ExplorationState } from '../../types';
import { DoorRenderer } from './DoorRenderer';
import { CORRIDOR_COLORS } from '../../constants';

interface CorridorRendererProps {
  corridor: Corridor;
  gridSquareSize: number;
  explorationState: ExplorationState | null;
  isGenerating: boolean;
  onCorridorExplore: (connectionPoint: ConnectionPoint, sourceElementId: string) => void;
  onDoorClick: (doorId: string, connectionPoint: ConnectionPoint, sourceElementId: string) => void;
}

export const CorridorRenderer: React.FC<CorridorRendererProps> = ({
  corridor,
  gridSquareSize,
  explorationState,
  isGenerating,
  onCorridorExplore,
  onDoorClick
}) => {
  // Render corridor path as connected rectangles
  const pathElements = corridor.path.map((pos, index) => (
    <rect
      key={`${corridor.id}-path-${index}`}
      x={pos.x * gridSquareSize}
      y={pos.y * gridSquareSize}
      width={gridSquareSize}
      height={gridSquareSize}
      fill={CORRIDOR_COLORS.FILL}
      stroke={CORRIDOR_COLORS.STROKE}
      strokeWidth={CORRIDOR_COLORS.STROKE_WIDTH}
    />
  ));

  // Render corridor doors/connection points
  const doors = corridor.connectionPoints?.map((cp, index) => (
    <DoorRenderer
      key={`${corridor.id}-door-${index}`}
      elementId={corridor.id}
      connectionPoint={cp}
      index={index}
      gridSquareSize={gridSquareSize}
      sourceElementId={corridor.id}
      explorationState={explorationState}
      isGenerating={isGenerating}
      onDoorClick={onDoorClick}
    />
  )) || [];

  return (
    <g key={corridor.id}>
      {pathElements}
      {doors}
    </g>
  );
};