// Canvas and rendering constants
export const CANVAS_SIZE = 800;
export const DEFAULT_GRID_SQUARE_SIZE = 20;

// Door rendering constants
export const DOOR_WIDTH_RATIO = 0.6;
export const DOOR_HEIGHT_RATIO = 0.2;
export const DOOR_THICKNESS_RATIO = 0.2;

// Room generation constants
export const ROOM_GENERATION_PROBABILITY = 0.7; // 70% chance of room vs corridor
export const MIN_CORRIDOR_LENGTH = 3;
export const MAX_CORRIDOR_LENGTH_VARIANCE = 5;

// Grid overlay constants
export const GRID_OVERLAY_INTERVAL = 5;
export const GRID_LABEL_OFFSET = 15;
export const GRID_LABEL_FONT_SIZE = 12;

// Door colors and styles
export const DOOR_COLORS = {
  UNEXPLORED: {
    FILL: '#ffeb3b',
    STROKE: '#f57f17',
    STROKE_WIDTH: 2,
    OPACITY: 1,
  },
  CLOSED: {
    FILL: '#e0e0e0', 
    STROKE: '#757575',
    STROKE_WIDTH: 1.5,
    OPACITY: 1,
  },
  OPEN: {
    FILL: '#4caf50',
    STROKE: '#2e7d32', 
    STROKE_WIDTH: 2,
    OPACITY: 0.3,
  },
  DEFAULT: {
    FILL: '#fff',
    STROKE: '#000',
    STROKE_WIDTH: 1.5,
    OPACITY: 1,
  },
} as const;

// Room colors
export const ROOM_COLORS = {
  FILL: 'white',
  STROKE: '#000',
  STROKE_WIDTH: 1.5,
  SELECTED_STROKE: '#2196f3',
  SELECTED_STROKE_WIDTH: 3,
} as const;

// Corridor colors  
export const CORRIDOR_COLORS = {
  FILL: '#f5f5f5',
  STROKE: '#000', 
  STROKE_WIDTH: 1,
} as const;

// Font sizes
export const FONT_SIZES = {
  ROOM_NUMBER: {
    MIN: 10,
    RATIO: 1/3, // relative to grid square size
  },
  DOOR_QUESTION: {
    MIN: 8,
    RATIO: 1/4, // relative to grid square size  
  },
  DOOR_NUMBER: {
    MIN: 6,
    RATIO: 1/5, // relative to grid square size
  },
} as const;

// Animation and interaction
export const LOADING_SPINNER_SIZE = 40;
export const DEFAULT_CURSOR = 'default';
export const POINTER_CURSOR = 'pointer';

// Positioning adjustments for door alignment
export const DOOR_POSITION_ADJUSTMENTS = {
  WEST_TO_EAST: { x: -1, y: 0 },
  EAST_TO_WEST: { x: 1, y: 0 },
  NORTH_TO_SOUTH: { x: 0, y: -1 },
  SOUTH_TO_NORTH: { x: 0, y: 1 },
} as const;

// Generation settings
export const DEFAULT_GENERATION_SETTINGS = {
  maxRooms: 12,
  minRooms: 6,
  gridSize: 30, // 30x30 grid for graph paper compatibility
  allowIrregularRooms: true,
  forceConnectivity: true,
  maxExitsPerRoom: 4,
  roomSpacing: 1, // 1 grid square spacing
} as const;