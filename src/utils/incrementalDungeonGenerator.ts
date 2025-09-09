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
  ConnectionPointState,
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
import { SharedWallManager } from './SharedWallManager';
import { RoomIntegrationValidator } from './RoomIntegrationValidator';
import { BlockExpansionEngine } from './BlockExpansionEngine';
import { ROOM_GENERATION_PROBABILITY, MIN_CORRIDOR_LENGTH, MAX_CORRIDOR_LENGTH_VARIANCE } from '../constants';

export class IncrementalDungeonGenerator {
  private settings: GenerationSettings;
  private rooms: Room[] = [];
  private corridors: Corridor[] = [];
  private corridorGenerator: CorridorGenerator;
  private gridManager: GridManager;
  private sharedWallManager: SharedWallManager;
  private explorationState: ExplorationState;
  private roomCounter = 0;

  constructor(settings: GenerationSettings) {
    this.settings = settings;
    this.corridorGenerator = new CorridorGenerator(settings.gridSize);
    this.gridManager = new GridManager(settings.gridSize);
    this.sharedWallManager = new SharedWallManager();
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
    
    // Register room with shared wall manager and get updated connection points
    const updatedConnectionPoints = this.sharedWallManager.addElement(entranceRoom);
    entranceRoom.connectionPoints = updatedConnectionPoints;
    
    // Initialize door states for entrance room connections using shared wall manager
    entranceRoom.connectionPoints.forEach((cp, index) => {
      const doorId = `${entranceRoom.id}-door-${index}`;
      const globalDoorState = this.sharedWallManager.getDoorState(cp.position, cp.direction);
      this.explorationState.doorStates.set(doorId, globalDoorState);
      
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
    
    // Create state snapshot for rollback capability
    const stateSnapshot = this.createStateSnapshot();
    
    try {
      // Use the generation seed to ensure consistent results
      const seed = connectionPoint.generationSeed || this.generateSeed(connectionPoint);
      
      // Generate new room or corridor based on the seed and context
      const generatedElements = this.generateConnectedContent(connectionPoint, seed, sourceElementId);
      
      // Check if generation failed (empty result)
      if (generatedElements.rooms.length === 0 && generatedElements.corridors.length === 0) {
        return this.createDungeonMap();
      }
      
      // ATOMIC INTEGRATION: Add all elements or rollback on failure
      this.integrateGeneratedElements(generatedElements, connectionPoint, sourceElementId);
      
      return this.createDungeonMap();
    } catch (error) {
      // Rollback on any failure
      console.warn('Generation failed, rolling back:', error);
      this.rollbackToSnapshot(stateSnapshot);
      return this.createDungeonMap();
    }
  }
  
  /**
   * Atomically integrate generated elements into the dungeon
   */
  private integrateGeneratedElements(
    generatedElements: { rooms: Room[]; corridors: Corridor[] },
    connectionPoint: ConnectionPoint,
    sourceElementId: string
  ): void {
    // Add generated elements to the dungeon (rooms are pre-validated)
    generatedElements.rooms.forEach(room => {
      this.rooms.push(room);
      this.explorationState.discoveredRoomIds.add(room.id);
      this.gridManager.markRoomAsOccupied(room);
      
      // Register room with shared wall manager (validation already done during generation)
      this.sharedWallManager.addElement(room);
      
      // Initialize door states for new room connections using shared wall manager
      room.connectionPoints.forEach((cp, index) => {
        const doorId = `${room.id}-door-${index}`;
        const globalDoorState = this.sharedWallManager.getDoorState(cp.position, cp.direction);
        this.explorationState.doorStates.set(doorId, globalDoorState);
        
        // Only add to unexplored if not generated and not auto-opened
        if (!cp.isGenerated && globalDoorState !== DoorState.Open) {
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
      
      // Register corridor with shared wall manager
      this.sharedWallManager.addElement(corridor);
      
      // Initialize door states for new corridor connections using shared wall manager
      corridor.connectionPoints.forEach((cp, index) => {
        const doorId = `${corridor.id}-door-${index}`;
        const globalDoorState = this.sharedWallManager.getDoorState(cp.position, cp.direction);
        this.explorationState.doorStates.set(doorId, globalDoorState);
        
        // Only add to unexplored if not generated and not auto-opened
        if (!cp.isGenerated && globalDoorState !== DoorState.Open) {
          this.explorationState.unexploredConnectionPoints.push({
            ...cp,
            generationSeed: this.generateSeed(cp),
          });
        }
      });
    });

    // Update the connection point as generated
    ConnectionPointValidator.updateConnectionPointAsGenerated(connectionPoint, sourceElementId, this.rooms, this.corridors);
    
    // Sync door states across all elements to handle auto-opened doors
    this.syncAllDoorStates();
    
    // Remove from unexplored list (including doors that were auto-opened)
    this.explorationState.unexploredConnectionPoints = 
      this.explorationState.unexploredConnectionPoints.filter(
        cp => {
          const doorState = this.sharedWallManager.getDoorState(cp.position, cp.direction);
          return cp.generationSeed !== connectionPoint.generationSeed && doorState !== DoorState.Open;
        }
      );
  }

  // Open a door and reveal what's behind it
  openDoor(doorId: string, connectionPoint: ConnectionPoint, sourceElementId: string): DungeonMap {
    this.explorationState.doorStates.set(doorId, DoorState.Open);
    
    // Check if connection point is already being generated or is already connected
    if (connectionPoint.state === ConnectionPointState.Generating || 
        connectionPoint.state === ConnectionPointState.Connected) {
      // Already in progress or completed, just sync states and return
      this.syncAllDoorStates();
      return this.createDungeonMap();
    }
    
    // Check if door was already auto-opened by SharedWallManager
    const globalDoorState = this.sharedWallManager.getDoorState(connectionPoint.position, connectionPoint.direction);
    const isAlreadyGenerated = this.sharedWallManager.isDoorGenerated(connectionPoint.position, connectionPoint.direction);
    
    // If door is already open globally or already generated, don't generate again
    if (globalDoorState === DoorState.Open || isAlreadyGenerated || connectionPoint.isGenerated) {
      // Mark as connected and sync states
      connectionPoint.state = ConnectionPointState.Connected;
      this.syncAllDoorStates();
      return this.createDungeonMap();
    }
    
    // Mark as generating to prevent double-clicks
    connectionPoint.state = ConnectionPointState.Generating;
    
    // If this connection hasn't been generated yet, generate it
    if (!connectionPoint.isGenerated) {
      try {
        const result = this.generateFromConnectionPoint({
          connectionPoint,
          sourceElementId,
          settings: this.settings,
        });
        
        // Mark as connected after successful generation
        connectionPoint.state = ConnectionPointState.Connected;
        return result;
      } catch (error) {
        // Rollback to ungenerated state on failure
        connectionPoint.state = ConnectionPointState.Ungenerated;
        throw error;
      }
    }
    
    // Mark as connected
    connectionPoint.state = ConnectionPointState.Connected;
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
    this.sharedWallManager.reset();
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
        state: ConnectionPointState.Ungenerated,
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
    // Select geomorph template that will define expansion bounds
    const templates = getRoomTemplatesByType(RoomType.Standard);
    const seedNum = this.seedToNumber(seed);
    const template = templates[seedNum % templates.length];
    
    // Calculate where the geomorph would be placed
    const { roomPosition, connectingPointIndex } = PositionCalculator.calculateRoomPositionFromConnection(connectionPoint, template);
    
    if (connectingPointIndex === -1) {
      return this.generateConnectedCorridor(connectionPoint, seed);
    }
    
    // Calculate entry point in world coordinates
    const templateConnectionPoint = template.connectionPoints[connectingPointIndex];
    const entryPoint = {
      x: roomPosition.x + templateConnectionPoint.position.x,
      y: roomPosition.y + templateConnectionPoint.position.y
    };
    
    // Set up expansion context
    const expansionContext = {
      entryPoint,
      entryDirection: connectionPoint.direction, // Direction from source toward room
      sourceConnectionPoint: connectionPoint,
      sourceElementId: connectionPoint.connectedElementId || 'unknown',
      geomorphBounds: template,
      targetPosition: roomPosition,
      existingRooms: this.rooms,
      existingCorridors: this.corridors,
      gridManager: this.gridManager,
      sharedWallManager: this.sharedWallManager
    };
    
    // Use block expansion engine to grow room organically within geomorph bounds
    const expansionResult = BlockExpansionEngine.expandRoom(expansionContext);
    
    if (expansionResult.expandedBlocks.length === 0) {
      // No space to expand - create a minimal 1-block room at the entry point
      console.log('No space to expand room - creating 1-block room at entry point');
      
      const minimalRoom: Room = {
        id: `room-${String(this.roomCounter++).padStart(2, '0')}`,
        shape: template.shape,
        type: template.type, 
        size: template.size,
        position: entryPoint,
        width: 1,
        height: 1,
        templateId: template.id,
        gridPattern: [[true]], // Single block
        isGenerated: true,
        connectionPoints: [{
          direction: PositionCalculator.getOppositeDirection(connectionPoint.direction),
          position: entryPoint,
          isConnected: true,
          connectedElementId: connectionPoint.connectedElementId || 'unknown',
          isGenerated: true,
          state: ConnectionPointState.Connected
        }],
      };
      
      return { rooms: [minimalRoom], corridors: [] };
    }
    
    // Calculate room bounds from expanded blocks
    const minX = Math.min(...expansionResult.expandedBlocks.map(p => p.x));
    const minY = Math.min(...expansionResult.expandedBlocks.map(p => p.y));
    const maxX = Math.max(...expansionResult.expandedBlocks.map(p => p.x));
    const maxY = Math.max(...expansionResult.expandedBlocks.map(p => p.y));
    
    // Create grid pattern from expanded blocks
    const roomWidth = maxX - minX + 1;
    const roomHeight = maxY - minY + 1;
    const gridPattern: boolean[][] = [];
    
    for (let y = 0; y < roomHeight; y++) {
      gridPattern[y] = [];
      for (let x = 0; x < roomWidth; x++) {
        const worldX = minX + x;
        const worldY = minY + y;
        gridPattern[y][x] = expansionResult.expandedBlocks.some(
          block => block.x === worldX && block.y === worldY
        );
      }
    }
    
    // Create the room with organically expanded shape
    const newRoom: Room = {
      id: `room-${String(this.roomCounter++).padStart(2, '0')}`,
      shape: template.shape, // Keep original shape classification
      type: template.type,
      size: template.size,
      position: { x: minX, y: minY }, // Room position is the top-left of expanded area
      width: roomWidth,
      height: roomHeight,
      templateId: template.id, // Keep reference to source geomorph
      gridPattern, // Use organically expanded pattern
      isGenerated: true,
      connectionPoints: expansionResult.finalConnectionPoints,
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
          state: ConnectionPointState.Connected,
        },
        {
          direction: connectionPoint.direction,
          position: corridorPath[corridorPath.length - 1],
          isConnected: false,
          isGenerated: false,
          state: ConnectionPointState.Ungenerated,
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

  private syncAllDoorStates(): void {
    // Update door states for all rooms
    this.rooms.forEach(room => {
      room.connectionPoints.forEach((cp, index) => {
        const doorId = `${room.id}-door-${index}`;
        const globalDoorState = this.sharedWallManager.getDoorState(cp.position, cp.direction);
        this.explorationState.doorStates.set(doorId, globalDoorState);
      });
    });

    // Update door states for all corridors
    this.corridors.forEach(corridor => {
      corridor.connectionPoints.forEach((cp, index) => {
        const doorId = `${corridor.id}-door-${index}`;
        const globalDoorState = this.sharedWallManager.getDoorState(cp.position, cp.direction);
        this.explorationState.doorStates.set(doorId, globalDoorState);
      });
    });
  }

  /**
   * Create a state snapshot for rollback capability
   */
  private createStateSnapshot() {
    return {
      rooms: [...this.rooms],
      corridors: [...this.corridors],
      roomCounter: this.roomCounter,
      explorationState: {
        discoveredRoomIds: new Set(this.explorationState.discoveredRoomIds),
        discoveredCorridorIds: new Set(this.explorationState.discoveredCorridorIds),
        doorStates: new Map(this.explorationState.doorStates),
        unexploredConnectionPoints: [...this.explorationState.unexploredConnectionPoints],
      },
      // Note: GridManager and SharedWallManager would need snapshot support for full rollback
    };
  }
  
  /**
   * Rollback to a previous state snapshot
   */
  private rollbackToSnapshot(snapshot: ReturnType<typeof this.createStateSnapshot>): void {
    this.rooms = snapshot.rooms;
    this.corridors = snapshot.corridors;
    this.roomCounter = snapshot.roomCounter;
    this.explorationState = snapshot.explorationState;
    
    // Reset managers to match rolled back state
    this.gridManager.reset();
    this.sharedWallManager.reset();
    
    // Re-register all elements with managers
    this.rooms.forEach(room => {
      this.gridManager.markRoomAsOccupied(room);
      this.sharedWallManager.addElement(room);
    });
    
    this.corridors.forEach(corridor => {
      this.gridManager.markCorridorAsOccupied(corridor);
      this.sharedWallManager.addElement(corridor);
    });
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