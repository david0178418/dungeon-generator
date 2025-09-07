import {
  DungeonMap,
  Room,
  Corridor,
  Position,
  GenerationSettings,
  RoomType,
  ConnectionPoint,
  RoomTemplate,
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
  private corridorGenerator: CorridorGenerator;
  private occupiedPositions: Set<string> = new Set();

  constructor(settings: GenerationSettings) {
    this.settings = settings;
    this.corridorGenerator = new CorridorGenerator(settings.gridSize);
  }

  generateDungeon(): DungeonMap {
    this.reset();
    
    // Step 1: Generate entrance room
    this.generateEntranceRoom();
    
    // Step 2: Generate main rooms
    const targetRoomCount = this.determineRoomCount();
    this.generateMainRooms(targetRoomCount - 1); // -1 for entrance
    
    // Step 3: Connect rooms with corridors
    this.connectRoomsWithCorridors();
    
    // Step 4: Add some dead-end corridors for exploration
    this.addExplorationCorridors();
    
    return this.createDungeonMap();
  }

  private reset(): void {
    this.rooms = [];
    this.corridors = [];
    this.occupiedPositions.clear();
    this.corridorGenerator = new CorridorGenerator(this.settings.gridSize);
  }

  private determineRoomCount(): number {
    const { minRooms, maxRooms } = this.settings;
    return minRooms + Math.floor(Math.random() * (maxRooms - minRooms + 1));
  }

  private generateEntranceRoom(): void {
    const entranceTemplates = getRoomTemplatesByType(RoomType.Entrance);
    const template = entranceTemplates[Math.floor(Math.random() * entranceTemplates.length)];
    
    // Place entrance room near the edge of the grid
    const position: Position = {
      x: Math.floor(this.settings.gridSize * 0.1),
      y: Math.floor(this.settings.gridSize * 0.1),
    };
    
    const room = this.createRoomFromTemplate(template, position);
    this.rooms.push(room);
    this.markRoomAsOccupied(room);
  }

  private generateMainRooms(count: number): void {
    let attempts = 0;
    const maxAttempts = count * 10;
    
    while (this.rooms.length < count + 1 && attempts < maxAttempts) {
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
    connectedRooms.add(this.rooms[0].id); // Start with entrance

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