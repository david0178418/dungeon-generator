import React, { useMemo } from 'react';
import { ConnectionPoint, DoorState, ExplorationState, DoorRenderInfo } from '../../types';
import { 
  DOOR_WIDTH_RATIO, 
  DOOR_HEIGHT_RATIO, 
  DOOR_THICKNESS_RATIO,
  DOOR_COLORS,
  FONT_SIZES,
  DEFAULT_CURSOR,
  POINTER_CURSOR 
} from '../../constants';

interface DoorRendererProps {
  elementId: string;
  connectionPoint: ConnectionPoint;
  index: number;
  gridSquareSize: number;
  sourceElementId: string;
  explorationState: ExplorationState | null;
  isGenerating: boolean;
  onDoorClick: (doorId: string, connectionPoint: ConnectionPoint, sourceElementId: string) => void;
}

export const DoorRenderer: React.FC<DoorRendererProps> = React.memo(({
  elementId,
  connectionPoint: cp,
  index,
  gridSquareSize,
  sourceElementId,
  explorationState,
  isGenerating,
  onDoorClick
}) => {
  const doorId = `${elementId}-door-${index}`;
  const doorState = explorationState?.doorStates.get(doorId) || DoorState.Closed;

  // Calculate door position and dimensions based on direction
  const calculateDoorInfo = (): DoorRenderInfo => {
    const cellX = cp.position.x * gridSquareSize;
    const cellY = cp.position.y * gridSquareSize;
    
    let doorWidth, doorHeight, doorX, doorY;
    
    switch (cp.direction) {
      case 'north':
        doorWidth = gridSquareSize * DOOR_WIDTH_RATIO;
        doorHeight = gridSquareSize * DOOR_HEIGHT_RATIO;
        doorX = cellX + (gridSquareSize - doorWidth) / 2;
        doorY = cellY - doorHeight / 2;
        break;
      case 'south':
        doorWidth = gridSquareSize * DOOR_WIDTH_RATIO;
        doorHeight = gridSquareSize * DOOR_HEIGHT_RATIO;
        doorX = cellX + (gridSquareSize - doorWidth) / 2;
        doorY = cellY + gridSquareSize - doorHeight / 2;
        break;
      case 'east':
        doorWidth = gridSquareSize * DOOR_THICKNESS_RATIO;
        doorHeight = gridSquareSize * DOOR_WIDTH_RATIO;
        doorX = cellX + gridSquareSize - doorWidth / 2;
        doorY = cellY + (gridSquareSize - doorHeight) / 2;
        break;
      case 'west':
        doorWidth = gridSquareSize * DOOR_THICKNESS_RATIO;
        doorHeight = gridSquareSize * DOOR_WIDTH_RATIO;
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
    let fill: string = DOOR_COLORS.DEFAULT.FILL;
    let stroke: string = DOOR_COLORS.DEFAULT.STROKE; 
    let strokeWidth: number = DOOR_COLORS.DEFAULT.STROKE_WIDTH;
    let cursor: string = DEFAULT_CURSOR;
    let opacity: number = DOOR_COLORS.DEFAULT.OPACITY;

    if (doorState === DoorState.Closed) {
      if (!cp.isGenerated) {
        // Unexplored door - show as clickable
        fill = DOOR_COLORS.UNEXPLORED.FILL;
        stroke = DOOR_COLORS.UNEXPLORED.STROKE;
        strokeWidth = DOOR_COLORS.UNEXPLORED.STROKE_WIDTH;
        opacity = DOOR_COLORS.UNEXPLORED.OPACITY;
        cursor = POINTER_CURSOR;
      } else {
        // Closed but explored door
        fill = DOOR_COLORS.CLOSED.FILL;
        stroke = DOOR_COLORS.CLOSED.STROKE;
        strokeWidth = DOOR_COLORS.CLOSED.STROKE_WIDTH;
        opacity = DOOR_COLORS.CLOSED.OPACITY;
        cursor = POINTER_CURSOR;
      }
    } else if (doorState === DoorState.Open) {
      // Open door - show as green/transparent to indicate it's open
      fill = DOOR_COLORS.OPEN.FILL;
      stroke = DOOR_COLORS.OPEN.STROKE;
      strokeWidth = DOOR_COLORS.OPEN.STROKE_WIDTH;
      opacity = DOOR_COLORS.OPEN.OPACITY;
    }

    return {
      x: doorX,
      y: doorY,
      width: doorWidth,
      height: doorHeight,
      fill,
      stroke,
      strokeWidth,
      opacity,
      cursor
    };
  };

  const handleDoorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (doorState === DoorState.Closed && !isGenerating) {
      onDoorClick(doorId, cp, sourceElementId);
    }
  };

  const doorInfo = useMemo(() => calculateDoorInfo(), [cp.position, cp.direction, gridSquareSize, doorState]);
  const doorElements = [];
  
  // Main door rectangle
  doorElements.push(
    <rect
      key={`${elementId}-door-${index}`}
      x={doorInfo.x}
      y={doorInfo.y}
      width={doorInfo.width}
      height={doorInfo.height}
      fill={doorInfo.fill}
      stroke={doorInfo.stroke}
      strokeWidth={doorInfo.strokeWidth}
      opacity={doorInfo.opacity}
      style={{ cursor: doorInfo.cursor }}
      onClick={handleDoorClick}
    />
  );
  
  // Add question mark for unexplored doors
  if (!cp.isGenerated && doorState === DoorState.Closed) {
    const textX = doorInfo.x + doorInfo.width / 2;
    const textY = doorInfo.y + doorInfo.height / 2;
    doorElements.push(
      <text
        key={`${elementId}-door-question-${index}`}
        x={textX}
        y={textY}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={Math.max(FONT_SIZES.DOOR_QUESTION.MIN, gridSquareSize * FONT_SIZES.DOOR_QUESTION.RATIO)}
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
    const textX = doorInfo.x + doorInfo.width / 2;
    const textY = doorInfo.y + doorInfo.height / 2;
    doorElements.push(
      <text
        key={`${elementId}-door-number-${index}`}
        x={textX}
        y={textY}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={Math.max(FONT_SIZES.DOOR_NUMBER.MIN, gridSquareSize * FONT_SIZES.DOOR_NUMBER.RATIO)}
        fill="#fff"
        fontWeight="bold"
        pointerEvents="none"
      >
        {index}
      </text>
    );
  }

  return <>{doorElements}</>;
});