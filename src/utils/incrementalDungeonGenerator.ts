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
} from '../types';
import { CorridorGenerator } from './corridorGenerator';
import {
  getRandomRoomTemplate,
  getRoomTemplatesByType,
  getRoomTemplateById,
} from '../data/roomTemplates';

export class IncrementalDungeonGenerator {
  private settings: GenerationSettings;
  private rooms: Room[] = [];
  private corridors: Corridor[] = [];
  private corridorGenerator: CorridorGenerator;
  private occupiedPositions: Set<string> = new Set();
  private explorationState: ExplorationState;
  private roomCounter = 0;

  constructor(settings: GenerationSettings) {
    this.settings = settings;
    this.corridorGenerator = new CorridorGenerator(settings.gridSize);
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
    this.markRoomAsOccupied(entranceRoom);
    
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
      this.markRoomAsOccupied(room);
      
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
      this.markCorridorAsOccupied(corridor);
    });

    // Update the connection point as generated
    this.updateConnectionPointAsGenerated(connectionPoint, sourceElementId);
    
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
    this.occupiedPositions = new Set();
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
    
    // Simple decision: 70% chance of room, 30% chance of corridor
    if (seedNum % 10 < 7) {
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
    const { roomPosition, connectingPointIndex } = this.calculateRoomPositionFromConnection(connectionPoint, template);
    
    if (connectingPointIndex === -1) {
      return this.generateConnectedCorridor(connectionPoint, seed);
    }
    
    // Check what area is available and trim the room to fit
    const availableGrid = this.getAvailableRoomArea(roomPosition, template.width, template.height);
    const trimmedTemplate = this.trimRoomToFit(template, roomPosition, availableGrid);
    
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
      connectionPoints: trimmedTemplate.connectionPoints.map((cp: any, index: number) => ({
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
    const corridorLength = 3 + (seedNum % 5); // 3-7 squares long
    
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
          direction: this.getOppositeDirection(connectionPoint.direction),
          position: corridorPath[0],
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

  private calculateRoomPositionFromConnection(
    connectionPoint: ConnectionPoint,
    template: any
  ): { roomPosition: Position; connectingPointIndex: number } {
    // Find a connection point in the template that can connect to the source
    const oppositeDirection = this.getOppositeDirection(connectionPoint.direction);
    
    const compatibleConnectionPoints = template.connectionPoints
      .map((cp: any, index: number) => ({ ...cp, index }))
      .filter((cp: any) => cp.direction === oppositeDirection);
    
    if (compatibleConnectionPoints.length === 0) {
      // Fallback if no compatible connection point found
      return { 
        roomPosition: { x: 0, y: 0 }, 
        connectingPointIndex: -1 
      };
    }
    
    // Use the first compatible connection point
    const templateCP = compatibleConnectionPoints[0];
    
    // Calculate room position so that templateCP aligns with connectionPoint
    let roomX = connectionPoint.position.x - templateCP.position.x;
    let roomY = connectionPoint.position.y - templateCP.position.y;

    return { 
      roomPosition: { x: roomX, y: roomY }, 
      connectingPointIndex: templateCP.index 
    };
  }

  private getAvailableRoomArea(position: Position, width: number, height: number): boolean[][] {
    const availableGrid: boolean[][] = [];
    
    for (let y = 0; y < height; y++) {
      availableGrid[y] = [];
      for (let x = 0; x < width; x++) {
        const worldX = position.x + x;
        const worldY = position.y + y;
        
        // Check bounds and occupancy
        const isAvailable = worldX >= 0 && 
                           worldX < this.settings.gridSize && 
                           worldY >= 0 && 
                           worldY < this.settings.gridSize && 
                           !this.occupiedPositions.has(`${worldX},${worldY}`);
        
        availableGrid[y][x] = isAvailable;
      }
    }
    
    return availableGrid;
  }

  private trimRoomToFit(template: any, position: Position, availableGrid: boolean[][]): any {
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
    
    // Filter connection points to only include those in available areas
    const validConnectionPoints = template.connectionPoints.filter((cp: any) => {
      const localX = cp.position.x;
      const localY = cp.position.y;
      return localX >= 0 && localX < template.width && 
             localY >= 0 && localY < template.height && 
             availableGrid[localY] && availableGrid[localY][localX];
    });
    
    console.log('Room trimmed:', template.id, '- kept', trimmedPattern.flat().filter(x => x).length, 'of', template.gridPattern.flat().filter((x: boolean) => x).length, 'squares');
    
    return {
      ...template,
      gridPattern: trimmedPattern,
      connectionPoints: validConnectionPoints
    };
  }

  private markRoomAsOccupied(room: Room): void {
    // Mark the actual occupied squares based on the room's current state
    // If the room has a custom gridPattern (from trimming), use that
    // Otherwise, use the original template pattern
    
    if (room.gridPattern) {
      // Room has been trimmed, use its custom pattern
      for (let y = 0; y < room.gridPattern.length; y++) {
        for (let x = 0; x < room.gridPattern[y].length; x++) {
          if (room.gridPattern[y][x]) {
            const worldX = room.position.x + x;
            const worldY = room.position.y + y;
            this.occupiedPositions.add(`${worldX},${worldY}`);
          }
        }
      }
    } else {
      // Use original template pattern
      const template = room.templateId ? this.getRoomTemplateById(room.templateId) : null;
      
      if (template && template.gridPattern) {
        for (let y = 0; y < template.gridPattern.length; y++) {
          for (let x = 0; x < template.gridPattern[y].length; x++) {
            if (template.gridPattern[y][x]) {
              const worldX = room.position.x + x;
              const worldY = room.position.y + y;
              this.occupiedPositions.add(`${worldX},${worldY}`);
            }
          }
        }
      } else {
        // Fallback to full rectangle if no template pattern available
        for (let x = room.position.x; x < room.position.x + room.width; x++) {
          for (let y = room.position.y; y < room.position.y + room.height; y++) {
            this.occupiedPositions.add(`${x},${y}`);
          }
        }
      }
    }
  }

  private getRoomTemplateById(templateId: string): any {
    return getRoomTemplateById(templateId);
  }

  private markCorridorAsOccupied(corridor: Corridor): void {
    corridor.path.forEach(pos => {
      this.occupiedPositions.add(`${pos.x},${pos.y}`);
    });
  }

  private updateConnectionPointAsGenerated(connectionPoint: ConnectionPoint, sourceElementId: string): void {
    // Find and update the connection point in rooms or corridors
    for (const room of this.rooms) {
      if (room.id === sourceElementId) {
        const cp = room.connectionPoints.find(p => 
          p.position.x === connectionPoint.position.x && 
          p.position.y === connectionPoint.position.y &&
          p.direction === connectionPoint.direction
        );
        if (cp) {
          cp.isGenerated = true;
          cp.isConnected = true;
        }
      }
    }
    
    for (const corridor of this.corridors) {
      if (corridor.id === sourceElementId) {
        const cp = corridor.connectionPoints.find(p => 
          p.position.x === connectionPoint.position.x && 
          p.position.y === connectionPoint.position.y &&
          p.direction === connectionPoint.direction
        );
        if (cp) {
          cp.isGenerated = true;
          cp.isConnected = true;
        }
      }
    }
  }

  private generateCorridorPath(connectionPoint: ConnectionPoint, maxLength: number): Position[] {
    const path: Position[] = [];
    let currentPos = { ...connectionPoint.position };
    
    const direction = connectionPoint.direction;
    const moveVector = this.directionToVector(direction);
    
    // Start from the connection point position and extend in the direction
    for (let i = 0; i < maxLength; i++) {
      // Move in the direction (skip first iteration to include starting position)
      if (i > 0) {
        currentPos = {
          x: currentPos.x + moveVector.x,
          y: currentPos.y + moveVector.y,
        };
      }
      
      // Check bounds
      if (currentPos.x < 0 || currentPos.x >= this.settings.gridSize ||
          currentPos.y < 0 || currentPos.y >= this.settings.gridSize) {
        break;
      }
      
      // Check occupancy (but allow the first position which might be the door itself)
      if (i > 0 && this.occupiedPositions.has(`${currentPos.x},${currentPos.y}`)) {
        break;
      }
      
      path.push({ ...currentPos });
    }
    
    return path;
  }

  private directionToVector(direction: ExitDirection): Position {
    switch (direction) {
      case ExitDirection.North: return { x: 0, y: -1 };
      case ExitDirection.South: return { x: 0, y: 1 };
      case ExitDirection.East: return { x: 1, y: 0 };
      case ExitDirection.West: return { x: -1, y: 0 };
      default: return { x: 0, y: 0 };
    }
  }

  private getOppositeDirection(direction: ExitDirection): ExitDirection {
    switch (direction) {
      case ExitDirection.North: return ExitDirection.South;
      case ExitDirection.South: return ExitDirection.North;
      case ExitDirection.East: return ExitDirection.West;
      case ExitDirection.West: return ExitDirection.East;
      default: return direction;
    }
  }

  private determineCorridorType(path: Position[]): any {
    // Simple logic for now - all straight corridors
    return 'straight';
  }

  private getCorridorDirection(from: Position, to: Position): any {
    if (to.x > from.x || to.x < from.x) return 'horizontal';
    return 'vertical';
  }

  private isConnectionPointConnectable(cp1: ConnectionPoint, cp2: ConnectionPoint): boolean {
    // Check if connection points are at the exact same position and facing opposite directions
    if (cp1.position.x !== cp2.position.x || cp1.position.y !== cp2.position.y) {
      return false;
    }
    
    // Check if they face opposite directions
    const oppositeDirection = this.getOppositeDirection(cp1.direction);
    return cp2.direction === oppositeDirection;
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