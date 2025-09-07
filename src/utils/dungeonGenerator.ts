import { DungeonMap, GenerationSettings } from '../types';
import { generateGeomorphDungeon } from './geomorphDungeonGenerator';

export function generateDungeon(settings: GenerationSettings): DungeonMap {
  return generateGeomorphDungeon(settings);
}

export const DEFAULT_GENERATION_SETTINGS: GenerationSettings = {
  maxRooms: 12,
  minRooms: 6,
  gridSize: 30, // 30x30 grid for graph paper compatibility
  allowIrregularRooms: true,
  forceConnectivity: true,
  maxExitsPerRoom: 4,
  roomSpacing: 1, // 1 grid square spacing
};