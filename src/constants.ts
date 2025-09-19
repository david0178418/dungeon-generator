/**
 * Application constants and configuration values
 */

// Generation defaults
export const GENERATION_DEFAULTS = {
  MAX_ROOMS: 12,
  MIN_ROOMS: 6,
  GRID_SIZE: 30,
  MAX_EXITS_PER_ROOM: 4,
  ROOM_SPACING: 1,
} as const;

// Generation limits
export const GENERATION_LIMITS = {
  MIN_ROOMS_LIMIT: 1,
  MAX_ROOMS_LIMIT: 50,
  MIN_GRID_SIZE: 20,
  MAX_GRID_SIZE: 50,
  MIN_ROOM_SPACING: 1,
  MAX_ROOM_SPACING: 5,
  MAX_EXITS_LIMIT: 8,
} as const;

// Room generation
export const ROOM_GENERATION = {
  PLACEMENT_ATTEMPTS: 100,
  DEAD_END_MIN_LENGTH: 3,
  DEAD_END_MAX_ADDITIONAL: 5,
} as const;

// Rendering constants
export const RENDERING = {
  GRID_SQUARE_SIZE: 20,
  DOOR_WIDTH_RATIO: 0.6,
  DOOR_HEIGHT_RATIO: 0.2,
  STROKE_WIDTH: 1,
  ROOM_STROKE_WIDTH: 2, // Twice as thick for room outlines
  SELECTED_STROKE_WIDTH: 3,
} as const;

// Colors
export const COLORS = {
  ROOM_FILL: '#ffffff',
  ROOM_STROKE: '#000000',
  ROOM_INNER_GRID: '#cccccc', // 50% lighter grid lines inside rooms
  ROOM_SELECTED: '#ff6b6b',
  CORRIDOR_FILL: '#f0f0f0',
  CORRIDOR_STROKE: '#666666',
  DOOR_FILL: '#8B4513',
  ENTRANCE_FILL: '#228B22',
  GRID_LIGHT: '#e0e0e0',
  GRID_DARK: '#cccccc',
  TEXT_FILL: '#333333',
} as const;

// Theme colors
export const THEME_COLORS = {
  PRIMARY: '#1976d2',
  SECONDARY: '#dc004e',
  BACKGROUND: '#f5f5f5',
} as const;