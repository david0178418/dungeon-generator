import { DungeonMap, GenerationSettings } from '../types';
import { generateGeomorphDungeon } from './geomorphDungeonGenerator';
import { GENERATION_DEFAULTS } from '../constants';

export function generateDungeon(settings: GenerationSettings): DungeonMap {
  return generateGeomorphDungeon(settings);
}

export const DEFAULT_GENERATION_SETTINGS: GenerationSettings = {
  maxRooms: GENERATION_DEFAULTS.MAX_ROOMS,
  minRooms: GENERATION_DEFAULTS.MIN_ROOMS,
  gridSize: GENERATION_DEFAULTS.GRID_SIZE, // 30x30 grid for graph paper compatibility
  maxExitsPerRoom: GENERATION_DEFAULTS.MAX_EXITS_PER_ROOM,
  roomSpacing: GENERATION_DEFAULTS.ROOM_SPACING, // 1 grid square spacing
};