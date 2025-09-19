import {
  DungeonMap,
  Room,
  Corridor,
  Position,
  GenerationSettings,
  RoomType,
  ConnectionPoint,
  RoomTemplate,
  ExteriorDoor,
  ExitDirection,
} from '../types';
import { CorridorGenerator } from './corridorGenerator';
import {
  getRandomRoomTemplate,
  getRoomTemplatesByType,
  ALL_ROOM_TEMPLATES,
} from '../data/roomTemplates';

export class GeomorphDungeonGenerator {
  private settings: GenerationSettings;
  private rooms: Room[] = [];
  private corridors: Corridor[] = [];
  private entranceDoor: ExteriorDoor | undefined;
  private corridorGenerator: CorridorGenerator;
  private occupiedPositions: Set<string> = new Set();

  constructor(settings: GenerationSettings) {
    this.settings = settings;
    this.corridorGenerator = new CorridorGenerator(settings.gridSize);
  }

  generateDungeon(): DungeonMap {
    this.reset();

    // Step 1: Generate main rooms (no entrance room)
    const targetRoomCount = this.determineRoomCount();
    this.generateMainRooms(targetRoomCount);

    // Step 2: Connect rooms with corridors
    this.connectRoomsWithCorridors();

    // Step 3: Add some dead-end corridors for exploration
    this.addExplorationCorridors();

    // Step 4: Create exterior entrance door
    this.createExteriorEntrance();

    return this.createDungeonMap();
  }

  private reset(): void {
    this.rooms = [];
    this.corridors = [];
    this.entranceDoor = undefined;
    this.occupiedPositions.clear();
    this.corridorGenerator = new CorridorGenerator(this.settings.gridSize);
  }

  private determineRoomCount(): number {
    const { minRooms, maxRooms } = this.settings;
    return minRooms + Math.floor(Math.random() * (maxRooms - minRooms + 1));
  }

  private createExteriorEntrance(): void {
    if (this.rooms.length === 0) return;

    // Find a room near an edge to connect the entrance to
    const edgeRooms = this.findRoomsNearEdges();

    if (edgeRooms.length === 0) return;

    // Pick a random room near an edge
    const targetRoom = edgeRooms[Math.floor(Math.random() * edgeRooms.length)];

    // Find the best edge position for the entrance
    const entrancePosition = this.findBestEntrancePosition(targetRoom);

    if (entrancePosition) {
      this.entranceDoor = {
        position: entrancePosition.position,
        direction: entrancePosition.direction,
        connectedElementId: targetRoom.id,
      };

      // Create a corridor from the entrance to the room if needed
      this.connectEntranceToRoom(this.entranceDoor, targetRoom);
    }
  }

  private findRoomsNearEdges(): Room[] {
    const edgeBuffer = 5; // Consider rooms within 5 squares of an edge as "near edge"
    return this.rooms.filter(room => {
      return room.position.x <= edgeBuffer ||
             room.position.y <= edgeBuffer ||
             room.position.x + room.width >= this.settings.gridSize - edgeBuffer ||
             room.position.y + room.height >= this.settings.gridSize - edgeBuffer;
    });
  }

  private findBestEntrancePosition(targetRoom: Room): { position: Position; direction: ExitDirection } | null {
    const candidates: { position: Position; direction: ExitDirection; distance: number }[] = [];

    // Check each edge of the map
    const edges = [
      { side: 'north', pos: { x: targetRoom.position.x + Math.floor(targetRoom.width / 2), y: 0 }, dir: ExitDirection.South },
      { side: 'south', pos: { x: targetRoom.position.x + Math.floor(targetRoom.width / 2), y: this.settings.gridSize - 1 }, dir: ExitDirection.North },
      { side: 'east', pos: { x: this.settings.gridSize - 1, y: targetRoom.position.y + Math.floor(targetRoom.height / 2) }, dir: ExitDirection.West },
      { side: 'west', pos: { x: 0, y: targetRoom.position.y + Math.floor(targetRoom.height / 2) }, dir: ExitDirection.East },
    ];

    for (const edge of edges) {
      const distance = this.calculateDistance(edge.pos, {
        x: targetRoom.position.x + Math.floor(targetRoom.width / 2),
        y: targetRoom.position.y + Math.floor(targetRoom.height / 2)
      });

      candidates.push({
        position: edge.pos,
        direction: edge.dir,
        distance
      });
    }

    // Return the closest edge position
    candidates.sort((a, b) => a.distance - b.distance);
    return candidates.length > 0 ? candidates[0] : null;
  }

  private connectEntranceToRoom(entrance: ExteriorDoor, targetRoom: Room): void {
    // Find the closest connection point on the target room
    let closestConnectionPoint: ConnectionPoint | null = null;
    let minDistance = Infinity;

    for (const cp of targetRoom.connectionPoints) {
      if (!cp.isConnected) {
        const distance = this.calculateDistance(entrance.position, cp.position);
        if (distance < minDistance) {
          minDistance = distance;
          closestConnectionPoint = cp;
        }
      }
    }

    // If we found a connection point, create a corridor
    if (closestConnectionPoint) {
      const corridorSegments = this.corridorGenerator.generateCorridor(
        entrance.position,
        closestConnectionPoint.position
      );

      this.corridors.push(...corridorSegments);
      closestConnectionPoint.isConnected = true;
    }
  }

  private generateMainRooms(count: number): void {
    let attempts = 0;
    const maxAttempts = count * 10;

    while (this.rooms.length < count && attempts < maxAttempts) {
      attempts++;
      
      const template = getRandomRoomTemplate(RoomType.Standard);
      const position = this.findValidRoomPosition(template);
      
      if (position) {
        const room = this.createRoomFromTemplate(template, position);
        this.rooms.push(room);
        this.markRoomAsOccupied(room);
      }
    }
  }

  private findValidRoomPosition(template: RoomTemplate): Position | null {
    const attempts = 50;
    
    for (let i = 0; i < attempts; i++) {
      const position: Position = {
        x: Math.floor(Math.random() * (this.settings.gridSize - template.width - 2)) + 1,
        y: Math.floor(Math.random() * (this.settings.gridSize - template.height - 2)) + 1,
      };
      
      if (this.isValidRoomPosition(template, position)) {
        return position;
      }
    }
    
    return null;
  }

  private isValidRoomPosition(template: RoomTemplate, position: Position): boolean {
    // Check bounds
    if (position.x + template.width >= this.settings.gridSize || 
        position.y + template.height >= this.settings.gridSize) {
      return false;
    }

    // Check for overlaps with some padding
    const padding = this.settings.roomSpacing;
    for (let x = position.x - padding; x < position.x + template.width + padding; x++) {
      for (let y = position.y - padding; y < position.y + template.height + padding; y++) {
        if (this.occupiedPositions.has(`${x},${y}`)) {
          return false;
        }
      }
    }

    return true;
  }

  private createRoomFromTemplate(template: RoomTemplate, position: Position): Room {
    const connectionPoints: ConnectionPoint[] = template.connectionPoints.map(cp => ({
      ...cp,
      position: {
        x: position.x + cp.position.x,
        y: position.y + cp.position.y,
      },
      isConnected: false,
    }));

    return {
      id: `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      shape: template.shape,
      type: template.type,
      size: template.size,
      position,
      width: template.width,
      height: template.height,
      connectionPoints,
      templateId: template.id,
    };
  }

  private markRoomAsOccupied(room: Room): void {
    // Mark all grid squares occupied by this room
    for (let x = room.position.x; x < room.position.x + room.width; x++) {
      for (let y = room.position.y; y < room.position.y + room.height; y++) {
        this.occupiedPositions.add(`${x},${y}`);
      }
    }
    
    // Also tell the corridor generator
    this.corridorGenerator.markRoomAsOccupied(room);
  }

  private connectRoomsWithCorridors(): void {
    if (this.rooms.length < 2) return;

    // Connect all rooms to ensure reachability
    const connectedRooms = new Set<string>();
    connectedRooms.add(this.rooms[0].id); // Start with first room

    // Connect each unconnected room to the nearest connected room
    while (connectedRooms.size < this.rooms.length) {
      let bestConnection: { from: Room; to: Room; distance: number } | null = null;

      for (const unconnectedRoom of this.rooms) {
        if (connectedRooms.has(unconnectedRoom.id)) continue;

        for (const connectedRoom of this.rooms) {
          if (!connectedRooms.has(connectedRoom.id)) continue;

          const distance = this.calculateDistance(
            unconnectedRoom.position,
            connectedRoom.position
          );

          if (!bestConnection || distance < bestConnection.distance) {
            bestConnection = {
              from: connectedRoom,
              to: unconnectedRoom,
              distance,
            };
          }
        }
      }

      if (bestConnection) {
        this.connectTwoRooms(bestConnection.from, bestConnection.to);
        connectedRooms.add(bestConnection.to.id);
      } else {
        break; // Safety break
      }
    }

    // Add some additional connections for more interesting layout
    const additionalConnections = Math.floor(this.rooms.length / 3);
    for (let i = 0; i < additionalConnections; i++) {
      const room1 = this.rooms[Math.floor(Math.random() * this.rooms.length)];
      const room2 = this.rooms[Math.floor(Math.random() * this.rooms.length)];
      
      if (room1.id !== room2.id) {
        this.connectTwoRooms(room1, room2);
      }
    }
  }

  private connectTwoRooms(room1: Room, room2: Room): void {
    // Find closest connection points between rooms
    let bestConnection: {
      point1: ConnectionPoint;
      point2: ConnectionPoint;
      distance: number;
    } | null = null;

    for (const cp1 of room1.connectionPoints) {
      if (cp1.isConnected) continue;
      
      for (const cp2 of room2.connectionPoints) {
        if (cp2.isConnected) continue;
        
        const distance = this.calculateDistance(cp1.position, cp2.position);
        
        if (!bestConnection || distance < bestConnection.distance) {
          bestConnection = {
            point1: cp1,
            point2: cp2,
            distance,
          };
        }
      }
    }

    if (bestConnection) {
      // Generate corridor between connection points
      const corridorSegments = this.corridorGenerator.generateCorridor(
        bestConnection.point1.position,
        bestConnection.point2.position
      );

      // Add corridors to the dungeon
      this.corridors.push(...corridorSegments);

      // Mark connection points as connected
      bestConnection.point1.isConnected = true;
      bestConnection.point2.isConnected = true;
    }
  }

  private calculateDistance(pos1: Position, pos2: Position): number {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  }

  private addExplorationCorridors(): void {
    // Add some dead-end corridors and additional branches
    const explorationCount = Math.floor(this.rooms.length / 2);
    
    for (let i = 0; i < explorationCount; i++) {
      // Find an unconnected connection point
      const availablePoints: { room: Room; point: ConnectionPoint }[] = [];
      
      for (const room of this.rooms) {
        for (const cp of room.connectionPoints) {
          if (!cp.isConnected) {
            availablePoints.push({ room, point: cp });
          }
        }
      }

      if (availablePoints.length > 0) {
        const selected = availablePoints[Math.floor(Math.random() * availablePoints.length)];
        
        // Create a short dead-end corridor
        const deadEndLength = 3 + Math.floor(Math.random() * 5);
        const direction = this.getRandomDirection();
        
        const endPosition: Position = {
          x: selected.point.position.x + (direction.x * deadEndLength),
          y: selected.point.position.y + (direction.y * deadEndLength),
        };

        // Check if the dead-end position is valid
        if (this.isValidPosition(endPosition)) {
          const corridorSegments = this.corridorGenerator.generateCorridor(
            selected.point.position,
            endPosition
          );

          this.corridors.push(...corridorSegments);
          selected.point.isConnected = true;
        }
      }
    }
  }

  private getRandomDirection(): { x: number; y: number } {
    const directions = [
      { x: 0, y: -1 }, // North
      { x: 1, y: 0 },  // East
      { x: 0, y: 1 },  // South
      { x: -1, y: 0 }, // West
    ];
    
    return directions[Math.floor(Math.random() * directions.length)];
  }

  private isValidPosition(position: Position): boolean {
    return position.x >= 0 && 
           position.x < this.settings.gridSize && 
           position.y >= 0 && 
           position.y < this.settings.gridSize;
  }

  private createDungeonMap(): DungeonMap {
    return {
      id: `geomorph-dungeon-${Date.now()}`,
      name: `Geomorph Dungeon ${new Date().toLocaleDateString()}`,
      rooms: this.rooms,
      corridors: this.corridors,
      entranceDoor: this.entranceDoor,
      createdAt: new Date(),
      gridSize: this.settings.gridSize,
      totalRooms: this.rooms.length,
    };
  }
}

export function generateGeomorphDungeon(settings: GenerationSettings): DungeonMap {
  const generator = new GeomorphDungeonGenerator(settings);
  return generator.generateDungeon();
}