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

export enum ConnectionType {
  Door = 'door',
  Archway = 'archway',
  Corridor = 'corridor',
  SecretDoor = 'secret-door',
  None = 'none',
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
  connectionPoints: Omit<ConnectionPoint, 'isConnected' | 'connectedElementId'>[];
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