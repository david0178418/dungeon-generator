export enum RoomShape {
  Square = 'square',
  Rectangle = 'rectangle',
  Circle = 'circle',
  LShape = 'l-shape',
  TShape = 't-shape',
  Cross = 'cross',
  Octagon = 'octagon',
  Irregular = 'irregular',
}

export enum RoomType {
  Entrance = 'entrance',
  Standard = 'standard',
  Junction = 'junction',
  Special = 'special',
}

export enum RoomSize {
  Small = 'small',
  Medium = 'medium',
  Large = 'large',
  Huge = 'huge',
}

export enum ExitDirection {
  North = 'north',
  South = 'south',
  East = 'east',
  West = 'west',
  Northeast = 'northeast',
  Northwest = 'northwest',
  Southeast = 'southeast',
  Southwest = 'southwest',
}


export enum CorridorType {
  Straight = 'straight',
  Corner = 'corner',
  TJunction = 't-junction',
  CrossJunction = 'cross-junction',
  DeadEnd = 'dead-end',
}

export enum CorridorDirection {
  Horizontal = 'horizontal',
  Vertical = 'vertical',
  NorthEast = 'northeast',
  NorthWest = 'northwest',
  SouthEast = 'southeast',
  SouthWest = 'southwest',
}

export interface Position {
  x: number;
  y: number;
}

export interface ConnectionPoint {
  direction: ExitDirection;
  position: Position;
  isConnected: boolean;
  connectedElementId?: string; // Can connect to room or corridor
  isGenerated: boolean; // Whether this connection has been explored/generated
  generationSeed?: string; // Seed for consistent generation when explored
}

export interface Room {
  id: string;
  shape: RoomShape;
  type: RoomType;
  size: RoomSize;
  position: Position;
  width: number;
  height: number;
  connectionPoints: ConnectionPoint[];
  description?: string;
  contents?: string;
  templateId?: string;
  isGenerated: boolean; // Whether this room has been generated/revealed
  gridPattern?: boolean[][]; // Custom grid pattern if room was trimmed to fit
}

export interface Corridor {
  id: string;
  type: CorridorType;
  direction: CorridorDirection;
  position: Position;
  length: number;
  width: number;
  connectionPoints: ConnectionPoint[];
  path: Position[];
  isGenerated: boolean; // Whether this corridor has been generated/revealed
}

export interface DungeonMap {
  id: string;
  name: string;
  rooms: Room[];
  corridors: Corridor[];
  createdAt: Date;
  gridSize: number;
  totalRooms: number;
}

export interface RoomTemplate {
  id: string;
  name: string;
  shape: RoomShape;
  type: RoomType;
  size: RoomSize;
  width: number;
  height: number;
  connectionPoints: Omit<ConnectionPoint, 'isConnected' | 'connectedElementId' | 'isGenerated' | 'generationSeed'>[];
  gridPattern: boolean[][]; // 2D array representing occupied squares
}

export interface GenerationSettings {
  maxRooms: number;
  minRooms: number;
  gridSize: number;
  allowIrregularRooms: boolean;
  forceConnectivity: boolean;
  maxExitsPerRoom: number;
  roomSpacing: number;
}

export enum DoorState {
  Closed = 'closed',
  Open = 'open',
  Locked = 'locked',
}

export interface ExplorationState {
  discoveredRoomIds: Set<string>;
  discoveredCorridorIds: Set<string>;
  doorStates: Map<string, DoorState>; // connectionPointId -> DoorState
  unexploredConnectionPoints: ConnectionPoint[];
}

export interface GenerationRequest {
  connectionPoint: ConnectionPoint;
  sourceElementId: string; // Room or corridor ID that contains the connection point
  settings: GenerationSettings;
}

// Rendering-related types
export interface WallSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface DoorOpening {
  x: number;
  y: number;
  width: number;
  height: number;
  direction: string;
}

export interface DoorRenderInfo {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  cursor: string;
}

// Position calculation types
export interface PositionAdjustment {
  x: number;
  y: number;
}

export interface RoomPositionCalculation {
  roomPosition: Position;
  connectingPointIndex: number;
}

// Template connection point (before world positioning)
export interface TemplateConnectionPoint {
  direction: ExitDirection;
  position: Position;
  index?: number;
}

// Grid management types  
export interface GridAvailability {
  grid: boolean[][];
  width: number;
  height: number;
}