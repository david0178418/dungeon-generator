import { ConnectionPoint, ExitDirection } from '../types';
import { RENDERING, COLORS } from '../constants';

export interface DoorDimensions {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculate door position and dimensions based on connection point direction
 */
export function calculateDoorDimensions(
  cp: ConnectionPoint,
  gridSquareSize: number = RENDERING.GRID_SQUARE_SIZE
): DoorDimensions {
  const cellX = cp.position.x * gridSquareSize;
  const cellY = cp.position.y * gridSquareSize;

  switch (cp.direction) {
    case 'north':
      return {
        x: cellX + (gridSquareSize - gridSquareSize * RENDERING.DOOR_WIDTH_RATIO) / 2,
        y: cellY - (gridSquareSize * RENDERING.DOOR_HEIGHT_RATIO) / 2,
        width: gridSquareSize * RENDERING.DOOR_WIDTH_RATIO,
        height: gridSquareSize * RENDERING.DOOR_HEIGHT_RATIO,
      };

    case 'south':
      return {
        x: cellX + (gridSquareSize - gridSquareSize * RENDERING.DOOR_WIDTH_RATIO) / 2,
        y: cellY + gridSquareSize - (gridSquareSize * RENDERING.DOOR_HEIGHT_RATIO) / 2,
        width: gridSquareSize * RENDERING.DOOR_WIDTH_RATIO,
        height: gridSquareSize * RENDERING.DOOR_HEIGHT_RATIO,
      };

    case 'east':
      return {
        x: cellX + gridSquareSize - (gridSquareSize * RENDERING.DOOR_HEIGHT_RATIO) / 2,
        y: cellY + (gridSquareSize - gridSquareSize * RENDERING.DOOR_WIDTH_RATIO) / 2,
        width: gridSquareSize * RENDERING.DOOR_HEIGHT_RATIO,
        height: gridSquareSize * RENDERING.DOOR_WIDTH_RATIO,
      };

    case 'west':
      return {
        x: cellX - (gridSquareSize * RENDERING.DOOR_HEIGHT_RATIO) / 2,
        y: cellY + (gridSquareSize - gridSquareSize * RENDERING.DOOR_WIDTH_RATIO) / 2,
        width: gridSquareSize * RENDERING.DOOR_HEIGHT_RATIO,
        height: gridSquareSize * RENDERING.DOOR_WIDTH_RATIO,
      };

    default:
      // For diagonal directions, use a square door
      return {
        x: cellX + (gridSquareSize - gridSquareSize * RENDERING.DOOR_HEIGHT_RATIO) / 2,
        y: cellY + (gridSquareSize - gridSquareSize * RENDERING.DOOR_HEIGHT_RATIO) / 2,
        width: gridSquareSize * RENDERING.DOOR_HEIGHT_RATIO,
        height: gridSquareSize * RENDERING.DOOR_HEIGHT_RATIO,
      };
  }
}

/**
 * Generate grid background path
 */
export function generateGridPath(
  gridSize: number,
  gridSquareSize: number = RENDERING.GRID_SQUARE_SIZE
): string {
  const totalSize = gridSize * gridSquareSize;
  let path = '';

  // Vertical lines
  for (let i = 0; i <= gridSize; i++) {
    const x = i * gridSquareSize;
    path += `M ${x} 0 L ${x} ${totalSize} `;
  }

  // Horizontal lines
  for (let i = 0; i <= gridSize; i++) {
    const y = i * gridSquareSize;
    path += `M 0 ${y} L ${totalSize} ${y} `;
  }

  return path;
}

/**
 * Generate dark grid lines path (every 5th line)
 */
export function generateDarkGridPath(
  gridSize: number,
  gridSquareSize: number = RENDERING.GRID_SQUARE_SIZE
): string {
  const totalSize = gridSize * gridSquareSize;
  let path = '';

  // Vertical lines (every 5th)
  for (let i = 0; i <= gridSize; i += 5) {
    const x = i * gridSquareSize;
    path += `M ${x} 0 L ${x} ${totalSize} `;
  }

  // Horizontal lines (every 5th)
  for (let i = 0; i <= gridSize; i += 5) {
    const y = i * gridSquareSize;
    path += `M 0 ${y} L ${totalSize} ${y} `;
  }

  return path;
}

/**
 * Calculate room center position
 */
export function calculateRoomCenter(
  x: number,
  y: number,
  width: number,
  height: number,
  gridSquareSize: number = RENDERING.GRID_SQUARE_SIZE
): { x: number; y: number } {
  return {
    x: x + (width * gridSquareSize) / 2,
    y: y + (height * gridSquareSize) / 2,
  };
}