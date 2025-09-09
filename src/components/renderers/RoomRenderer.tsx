import React, { useMemo } from 'react';
import { Room, ConnectionPoint, ExplorationState, DoorOpening } from '../../types';
import { WallRenderer } from './WallRenderer';
import { DoorRenderer } from './DoorRenderer';
import { FONT_SIZES } from '../../constants';

interface RoomRendererProps {
  room: Room;
  gridSquareSize: number;
  isSelected: boolean;
  explorationState: ExplorationState | null;
  isGenerating: boolean;
  onRoomSelect: (roomId: string) => void;
  onDoorClick: (doorId: string, connectionPoint: ConnectionPoint, sourceElementId: string) => void;
}

export const RoomRenderer: React.FC<RoomRendererProps> = React.memo(({
  room,
  gridSquareSize,
  isSelected,
  explorationState,
  isGenerating,
  onRoomSelect,
  onDoorClick
}) => {
  // Calculate door openings for wall rendering
  const getDoorOpenings = (room: Room, elementId: string): DoorOpening[] => {
    return room.connectionPoints.map(cp => {
      const localX = cp.position.x - room.position.x;
      const localY = cp.position.y - room.position.y;
      
      let doorX, doorY, doorWidth, doorHeight;
      
      switch (cp.direction) {
        case 'north':
          doorX = localX * gridSquareSize + gridSquareSize * 0.2;
          doorY = localY * gridSquareSize - gridSquareSize * 0.1;
          doorWidth = gridSquareSize * 0.6;
          doorHeight = gridSquareSize * 0.2;
          break;
        case 'south':
          doorX = localX * gridSquareSize + gridSquareSize * 0.2;
          doorY = (localY + 1) * gridSquareSize - gridSquareSize * 0.1;
          doorWidth = gridSquareSize * 0.6;
          doorHeight = gridSquareSize * 0.2;
          break;
        case 'east':
          doorX = (localX + 1) * gridSquareSize - gridSquareSize * 0.1;
          doorY = localY * gridSquareSize + gridSquareSize * 0.2;
          doorWidth = gridSquareSize * 0.2;
          doorHeight = gridSquareSize * 0.6;
          break;
        case 'west':
          doorX = localX * gridSquareSize - gridSquareSize * 0.1;
          doorY = localY * gridSquareSize + gridSquareSize * 0.2;
          doorWidth = gridSquareSize * 0.2;
          doorHeight = gridSquareSize * 0.6;
          break;
        default:
          doorX = localX * gridSquareSize + gridSquareSize * 0.35;
          doorY = localY * gridSquareSize + gridSquareSize * 0.35;
          doorWidth = gridSquareSize * 0.3;
          doorHeight = gridSquareSize * 0.3;
      }
      
      return {
        x: doorX,
        y: doorY,
        width: doorWidth,
        height: doorHeight,
        direction: cp.direction
      };
    });
  };

  const handleRoomClick = () => {
    onRoomSelect(room.id);
  };

  // Memoize expensive calculations
  const x = useMemo(() => room.position.x * gridSquareSize, [room.position.x, gridSquareSize]);
  const y = useMemo(() => room.position.y * gridSquareSize, [room.position.y, gridSquareSize]);
  const doorOpenings = useMemo(() => getDoorOpenings(room, room.id), [room, gridSquareSize]);
  const centerX = useMemo(() => x + (room.width * gridSquareSize) / 2, [x, room.width, gridSquareSize]);
  const centerY = useMemo(() => y + (room.height * gridSquareSize) / 2, [y, room.height, gridSquareSize]);

  // Render individual doors
  const doors = room.connectionPoints.map((cp, index) => (
    <DoorRenderer
      key={`${room.id}-door-${index}`}
      elementId={room.id}
      connectionPoint={cp}
      index={index}
      gridSquareSize={gridSquareSize}
      sourceElementId={room.id}
      explorationState={explorationState}
      isGenerating={isGenerating}
      onDoorClick={onDoorClick}
    />
  ));

  // Add room number (already calculated above with memoization)
  
  return (
    <g key={room.id} onClick={handleRoomClick} style={{ cursor: 'pointer' }}>
      <WallRenderer
        room={room}
        gridSquareSize={gridSquareSize}
        doorOpenings={doorOpenings}
        isSelected={isSelected}
      />
      {doors}
      <text
        x={centerX}
        y={centerY}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={Math.max(FONT_SIZES.ROOM_NUMBER.MIN, gridSquareSize * FONT_SIZES.ROOM_NUMBER.RATIO)}
        fill="#000"
        fontWeight="bold"
        pointerEvents="none"
      >
        {room.id.split('-')[1]?.slice(0, 4) || 'R'}
      </text>
    </g>
  );
});