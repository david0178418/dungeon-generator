import {
  DungeonMap,
  Room,
  Corridor,
  Position,
  GenerationSettings,
  RoomType,
  ConnectionPoint,
  ExitDirection,
  GenerationRequest,
  DoorState,
  ExplorationState,
  RoomTemplate,
  CorridorType,
  CorridorDirection,
} from '../types';
import { CorridorGenerator } from './corridorGenerator';
import {
  getRandomRoomTemplate,
  getRoomTemplatesByType,
  getRoomTemplateById,
} from '../data/roomTemplates';
import { PositionCalculator } from './PositionCalculator';
import { GridManager } from './GridManager';
import { ConnectionPointValidator } from './ConnectionPointValidator';
import { ROOM_GENERATION_PROBABILITY, MIN_CORRIDOR_LENGTH, MAX_CORRIDOR_LENGTH_VARIANCE } from '../constants';

export class IncrementalDungeonGenerator {
  private settings: GenerationSettings;
  private rooms: Room[] = [];
  private corridors: Corridor[] = [];
  private corridorGenerator: CorridorGenerator;
  private gridManager: GridManager;
  private explorationState: ExplorationState;
  private roomCounter = 0;

  constructor(settings: GenerationSettings) {
    this.settings = settings;
    this.corridorGenerator = new CorridorGenerator(settings.gridSize);
    this.gridManager = new GridManager(settings.gridSize);
    this.explorationState = {
      discoveredRoomIds: new Set(),
      discoveredCorridorIds: new Set(),
      doorStates: new Map(),
      unexploredConnectionPoints: [],
    };
  }

  // Generate initial dungeon with just the entrance room
  generateInitialDungeon(): DungeonMap {
    this.reset();
    
    const entranceRoom = this.generateEntranceRoom();
    this.rooms.push(entranceRoom);
    this.explorationState.discoveredRoomIds.add(entranceRoom.id);
    
    // Mark entrance room as occupied
    this.gridManager.markRoomAsOccupied(entranceRoom);
    
    // Initialize door states for entrance room connections
    entranceRoom.connectionPoints.forEach((cp, index) => {
      const doorId = `${entranceRoom.id}-door-${index}`;
      this.explorationState.doorStates.set(doorId, DoorState.Closed);
      if (!cp.isGenerated) {
        this.explorationState.unexploredConnectionPoints.push({
          ...cp,
          generationSeed: this.generateSeed(cp),
        });
      }
    });

    return this.createDungeonMap();
  }

  // Generate new content when a connection point is explored
  generateFromConnectionPoint(request: GenerationRequest): DungeonMap {
    const { connectionPoint, sourceElementId, settings } = request;
    
    // Use the generation seed to ensure consistent results
    const seed = connectionPoint.generationSeed || this.generateSeed(connectionPoint);
    
    // Generate new room or corridor based on the seed and context
    const generatedElements = this.generateConnectedContent(connectionPoint, seed, sourceElementId);
    
    // Add generated elements to the dungeon
    generatedElements.rooms.forEach(room => {
      this.rooms.push(room);
      this.explorationState.discoveredRoomIds.add(room.id);
      this.gridManager.markRoomAsOccupied(room);
      
      // Initialize door states for new room connections
      room.connectionPoints.forEach((cp, index) => {
        const doorId = `${room.id}-door-${index}`;
        this.explorationState.doorStates.set(doorId, DoorState.Closed);
        if (!cp.isGenerated) {
          this.explorationState.unexploredConnectionPoints.push({
            ...cp,
            generationSeed: this.generateSeed(cp),
          });
        }
      });
    });

    generatedElements.corridors.forEach(corridor => {
      this.corridors.push(corridor);
      this.explorationState.discoveredCorridorIds.add(corridor.id);
      this.gridManager.markCorridorAsOccupied(corridor);
      
      // Initialize door states for new corridor connections
      corridor.connectionPoints.forEach((cp, index) => {
        const doorId = `${corridor.id}-door-${index}`;
        this.explorationState.doorStates.set(doorId, DoorState.Closed);
        if (!cp.isGenerated) {
          this.explorationState.unexploredConnectionPoints.push({
            ...cp,
            generationSeed: this.generateSeed(cp),
          });
        }
      });
    });

    // Update the connection point as generated
    ConnectionPointValidator.updateConnectionPointAsGenerated(connectionPoint, sourceElementId, this.rooms, this.corridors);
    
    // Remove from unexplored list
    this.explorationState.unexploredConnectionPoints = 
      this.explorationState.unexploredConnectionPoints.filter(
        cp => cp.generationSeed !== connectionPoint.generationSeed
      );

    return this.createDungeonMap();
  }

  // Open a door and reveal what's behind it
  openDoor(doorId: string, connectionPoint: ConnectionPoint, sourceElementId: string): DungeonMap {
    this.explorationState.doorStates.set(doorId, DoorState.Open);
    
    // If this connection hasn't been generated yet, generate it
    if (!connectionPoint.isGenerated) {
      return this.generateFromConnectionPoint({
        connectionPoint,
        sourceElementId,
        settings: this.settings,
      });
    }
    
    return this.createDungeonMap();
  }

  // Get current exploration state
  getExplorationState(): ExplorationState {
    return this.explorationState;
  }

  private reset(): void {
    this.rooms = [];
    this.corridors = [];
    this.gridManager.reset();
    this.roomCounter = 0;
    this.explorationState = {
      discoveredRoomIds: new Set(),
      discoveredCorridorIds: new Set(),
      doorStates: new Map(),
      unexploredConnectionPoints: [],
    };
  }

  private generateEntranceRoom(): Room {
    const templates = getRoomTemplatesByType(RoomType.Entrance);
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    const startPosition = this.findEntrancePosition();
    
    return {
      id: `room-${String(this.roomCounter++).padStart(2, '0')}`,
      shape: template.shape,
      type: RoomType.Entrance,
      size: template.size,
      position: startPosition,
      width: template.width,
      height: template.height,
      templateId: template.id,
      isGenerated: true,
      connectionPoints: template.connectionPoints.map(cp => ({
        ...cp,
        position: {
          x: startPosition.x + cp.position.x,
          y: startPosition.y + cp.position.y,
        },
        isConnected: false,
        isGenerated: false,
      })),
    };
  }

  private generateConnectedContent(
    connectionPoint: ConnectionPoint, 
    seed: string, 
    sourceElementId: string
  ): { rooms: Room[]; corridors: Corridor[] } {
    // Use seed to determine what to generate
    const seedNum = this.seedToNumber(seed);
    
    // Simple decision: configurable chance of room vs corridor
    if (seedNum % 10 < ROOM_GENERATION_PROBABILITY * 10) {
      return this.generateConnectedRoom(connectionPoint, seed);
    } else {
      return this.generateConnectedCorridor(connectionPoint, seed);
    }
  }

  private generateConnectedRoom(
    connectionPoint: ConnectionPoint, 
    seed: string
  ): { rooms: Room[]; corridors: Corridor[] } {
    const templates = getRoomTemplatesByType(RoomType.Standard);
    const seedNum = this.seedToNumber(seed);
    const template = templates[seedNum % templates.length];
    
    // Calculate position based on connection direction and find the connecting point
    const { roomPosition, connectingPointIndex } = PositionCalculator.calculateRoomPositionFromConnection(connectionPoint, template);
    
    if (connectingPointIndex === -1) {
      return this.generateConnectedCorridor(connectionPoint, seed);
    }
    
    // Check what area is available and trim the room to fit
    const availableGridInfo = this.gridManager.getAvailableRoomArea(roomPosition, template.width, template.height);
    
    // Ensure the connecting point is available by marking its square as available
    const connectingCP = template.connectionPoints[connectingPointIndex];
    this.gridManager.markPositionAsAvailable(
      connectingCP.position, 
      availableGridInfo.grid, 
      template.width, 
      template.height
    );
    
    const trimmedTemplate = this.trimRoomToFit(template, roomPosition, availableGridInfo.grid, connectingPointIndex);
    
    if (!trimmedTemplate) {
      return this.generateConnectedCorridor(connectionPoint, seed);
    }

    
    const newRoom: Room = {
      id: `room-${String(this.roomCounter++).padStart(2, '0')}`,
      shape: trimmedTemplate.shape,
      type: trimmedTemplate.type,
      size: trimmedTemplate.size,
      position: roomPosition,
      width: trimmedTemplate.width,
      height: trimmedTemplate.height,
      templateId: template.id, // Keep original template ID for reference
      gridPattern: trimmedTemplate.gridPattern, // Store the trimmed pattern
      isGenerated: true,
      connectionPoints: trimmedTemplate.connectionPoints.map((cp, index: number) => ({
        ...cp,
        position: {
          x: roomPosition.x + cp.position.x,
          y: roomPosition.y + cp.position.y,
        },
        isConnected: index === connectingPointIndex, // Mark the connecting point as connected
        connectedElementId: index === connectingPointIndex ? (connectionPoint.connectedElementId || 'unknown') : undefined,
        isGenerated: false,
      })),
    };


    return { rooms: [newRoom], corridors: [] };
  }

  private generateConnectedCorridor(
    connectionPoint: ConnectionPoint, 
    seed: string
  ): { rooms: Room[]; corridors: Corridor[] } {
    const seedNum = this.seedToNumber(seed);
    const corridorLength = MIN_CORRIDOR_LENGTH + (seedNum % MAX_CORRIDOR_LENGTH_VARIANCE);
    
    const corridorPath = this.generateCorridorPath(connectionPoint, corridorLength);
    
    if (corridorPath.length < 1) {
      return { rooms: [], corridors: [] };
    }

    const corridor: Corridor = {
      id: `corridor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: this.determineCorridorType(corridorPath),
      direction: this.getCorridorDirection(corridorPath[0], corridorPath[1]),
      position: corridorPath[0],
      length: corridorPath.length,
      width: 1,
      isGenerated: true,
      connectionPoints: [
        {
          direction: PositionCalculator.getOppositeDirection(connectionPoint.direction),
          position: corridorPath[0], // Use the first position of the corridor path for proper alignment
          isConnected: true,
          connectedElementId: connectionPoint.connectedElementId || 'unknown',
          isGenerated: true,
        },
        {
          direction: connectionPoint.direction,
          position: corridorPath[corridorPath.length - 1],
          isConnected: false,
          isGenerated: false,
        },
      ],
      path: corridorPath,
    };

    return { rooms: [], corridors: [corridor] };
  }

  private findEntrancePosition(): Position {
    // Place entrance room near the center
    const centerX = Math.floor(this.settings.gridSize / 2);
    const centerY = Math.floor(this.settings.gridSize / 2);
    
    return { x: centerX - 3, y: centerY - 2 };
  }

  private generateSeed(connectionPoint: ConnectionPoint): string {
    return `${connectionPoint.position.x}-${connectionPoint.position.y}-${connectionPoint.direction}-${Date.now()}`;
  }

  private seedToNumber(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }



  private trimRoomToFit(template: RoomTemplate, position: Position, availableGrid: boolean[][], preserveConnectionIndex?: number): RoomTemplate | null {
    // Create a modified template with only the available squares
    const trimmedPattern: boolean[][] = [];
    let hasAnySquares = false;
    
    for (let y = 0; y < template.height; y++) {
      trimmedPattern[y] = [];
      for (let x = 0; x < template.width; x++) {
        // Keep the square if both template wants it AND it's available
        const shouldKeep = template.gridPattern[y][x] && availableGrid[y][x];
        trimmedPattern[y][x] = shouldKeep;
        if (shouldKeep) hasAnySquares = true;
      }
    }
    
    if (!hasAnySquares) {
      return null; // No usable area
    }
    
    
    // Filter connection points using the validator
    const validConnectionPoints = ConnectionPointValidator.validateConnectionPoints(
      template,
      availableGrid,
      trimmedPattern,
      preserveConnectionIndex
    );
    
    
    return {
      ...template,
      gridPattern: trimmedPattern,
      connectionPoints: validConnectionPoints
    };
  }





  private generateCorridorPath(connectionPoint: ConnectionPoint, maxLength: number): Position[] {
    const path: Position[] = [];
    const direction = connectionPoint.direction;
    const moveVector = PositionCalculator.directionToVector(direction);
    
    // Apply door positioning adjustment for corridor-to-corridor connections
    // This ensures proper alignment similar to room-to-room connections
    const adjustment = this.getCorridorPositionAdjustment(connectionPoint.direction);
    let currentPos = {
      x: connectionPoint.position.x + adjustment.x,
      y: connectionPoint.position.y + adjustment.y,
    };
    
    // Generate corridor path extending in the direction
    for (let i = 0; i < maxLength; i++) {
      // Move in the direction for subsequent positions
      if (i > 0) {
        currentPos = {
          x: currentPos.x + moveVector.x,
          y: currentPos.y + moveVector.y,
        };
      }
      
      // Check bounds
      if (!this.gridManager.isWithinBounds(currentPos)) {
        break;
      }
      
      // Check occupancy (but allow the first position which might be the door itself)
      if (i > 0 && this.gridManager.isPositionOccupied(currentPos)) {
        break;
      }
      
      path.push({ ...currentPos });
    }
    
    return path;
  }



  private determineCorridorType(path: Position[]): CorridorType {
    // Simple logic for now - all straight corridors
    return CorridorType.Straight;
  }

  private getCorridorDirection(from: Position, to: Position): CorridorDirection {
    if (to.x > from.x || to.x < from.x) return CorridorDirection.Horizontal;
    return CorridorDirection.Vertical;
  }

  private isConnectionPointConnectable(cp1: ConnectionPoint, cp2: ConnectionPoint): boolean {
    return PositionCalculator.areConnectionPointsConnectable(cp1, cp2);
  }

  private getCorridorPositionAdjustment(direction: ExitDirection): Position {
    // Apply the same positioning logic as rooms to ensure proper door alignment
    // Corridors should start in adjacent squares to avoid overlap with source doors
    switch (direction) {
      case ExitDirection.North: return { x: 0, y: -1 };
      case ExitDirection.South: return { x: 0, y: 1 };
      case ExitDirection.East: return { x: 1, y: 0 };
      case ExitDirection.West: return { x: -1, y: 0 };
      default: return { x: 0, y: 0 };
    }
  }

  private createDungeonMap(): DungeonMap {
    return {
      id: `dungeon-${Date.now()}`,
      name: `Incremental Dungeon`,
      rooms: this.rooms,
      corridors: this.corridors,
      createdAt: new Date(),
      gridSize: this.settings.gridSize,
      totalRooms: this.rooms.length,
    };
  }
}