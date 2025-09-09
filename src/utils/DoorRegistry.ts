import { 
  Position, 
  ExitDirection, 
  DoorState, 
  ConnectionPoint, 
  DoorLocation, 
  SharedDoor 
} from '../types';

export class DoorRegistry {
  private doors: Map<string, SharedDoor> = new Map();

  /**
   * Create a unique global ID for a door location
   */
  static createDoorId(position: Position, direction: ExitDirection): string {
    return `door-${position.x}-${position.y}-${direction}`;
  }

  /**
   * Register a door in the global registry
   */
  registerDoor(
    position: Position, 
    direction: ExitDirection, 
    elementId: string,
    initialState: DoorState = DoorState.Closed,
    generationSeed?: string
  ): string {
    const globalId = DoorRegistry.createDoorId(position, direction);
    
    const existingDoor = this.doors.get(globalId);
    if (existingDoor) {
      // Door already exists, add this element to the shared list
      if (!existingDoor.connectedElements.includes(elementId)) {
        existingDoor.connectedElements.push(elementId);
      }
      return globalId;
    }

    // Create new door
    const door: SharedDoor = {
      location: {
        position,
        direction,
        globalId
      },
      state: initialState,
      connectedElements: [elementId],
      isGenerated: false,
      generationSeed
    };

    this.doors.set(globalId, door);
    return globalId;
  }

  /**
   * Get door by global ID
   */
  getDoor(globalId: string): SharedDoor | undefined {
    return this.doors.get(globalId);
  }

  /**
   * Get door by position and direction
   */
  getDoorByLocation(position: Position, direction: ExitDirection): SharedDoor | undefined {
    const globalId = DoorRegistry.createDoorId(position, direction);
    return this.doors.get(globalId);
  }

  /**
   * Check if a door exists at the given location
   */
  hasDoor(position: Position, direction: ExitDirection): boolean {
    const globalId = DoorRegistry.createDoorId(position, direction);
    return this.doors.has(globalId);
  }

  /**
   * Update door state
   */
  updateDoorState(globalId: string, state: DoorState): boolean {
    const door = this.doors.get(globalId);
    if (door) {
      door.state = state;
      return true;
    }
    return false;
  }

  /**
   * Mark door as generated and connected
   */
  markDoorAsGenerated(
    globalId: string, 
    connectedElementId: string
  ): boolean {
    const door = this.doors.get(globalId);
    if (door) {
      door.isGenerated = true;
      door.connectedElementId = connectedElementId;
      return true;
    }
    return false;
  }

  /**
   * Get all doors for a specific element
   */
  getDoorsForElement(elementId: string): SharedDoor[] {
    const doors: SharedDoor[] = [];
    this.doors.forEach(door => {
      if (door.connectedElements.includes(elementId)) {
        doors.push(door);
      }
    });
    return doors;
  }

  /**
   * Get door state by position and direction
   */
  getDoorState(position: Position, direction: ExitDirection): DoorState {
    const door = this.getDoorByLocation(position, direction);
    return door ? door.state : DoorState.Closed;
  }

  /**
   * Check if door is generated
   */
  isDoorGenerated(position: Position, direction: ExitDirection): boolean {
    const door = this.getDoorByLocation(position, direction);
    return door ? door.isGenerated : false;
  }

  /**
   * Get generation seed for door
   */
  getDoorGenerationSeed(position: Position, direction: ExitDirection): string | undefined {
    const door = this.getDoorByLocation(position, direction);
    return door?.generationSeed;
  }

  /**
   * Find doors that should be automatically connected when placing a new element
   */
  findConnectableDoors(
    newElementId: string,
    connectionPoints: ConnectionPoint[]
  ): Array<{ connectionPoint: ConnectionPoint; existingDoor: SharedDoor }> {
    const connectableDoors: Array<{ connectionPoint: ConnectionPoint; existingDoor: SharedDoor }> = [];

    connectionPoints.forEach(cp => {
      const existingDoor = this.getDoorByLocation(cp.position, cp.direction);
      if (existingDoor && !existingDoor.connectedElements.includes(newElementId)) {
        connectableDoors.push({
          connectionPoint: cp,
          existingDoor
        });
      }
    });

    return connectableDoors;
  }

  /**
   * Automatically connect an element to existing doors
   */
  connectElementToExistingDoors(
    elementId: string,
    connectionPoints: ConnectionPoint[]
  ): ConnectionPoint[] {
    const updatedConnectionPoints = [...connectionPoints];

    connectionPoints.forEach((cp, index) => {
      const existingDoor = this.getDoorByLocation(cp.position, cp.direction);
      if (existingDoor) {
        // Add this element to the existing door
        if (!existingDoor.connectedElements.includes(elementId)) {
          existingDoor.connectedElements.push(elementId);
        }

        // Mark the connection point as connected if there's an existing door
        // The door will be auto-opened later if both sides are revealed
        updatedConnectionPoints[index] = {
          ...cp,
          isConnected: true, // Always true when door exists
          isGenerated: existingDoor.isGenerated,
          connectedElementId: existingDoor.connectedElements.length > 0 ? existingDoor.connectedElements[0] : undefined
        };
      }
    });

    return updatedConnectionPoints;
  }

  /**
   * Remove an element from all doors
   */
  removeElementFromDoors(elementId: string): void {
    this.doors.forEach((door, globalId) => {
      const index = door.connectedElements.indexOf(elementId);
      if (index !== -1) {
        door.connectedElements.splice(index, 1);
        
        // If no elements remain, remove the door
        if (door.connectedElements.length === 0) {
          this.doors.delete(globalId);
        }
      }
    });
  }

  /**
   * Get all doors in the registry
   */
  getAllDoors(): SharedDoor[] {
    return Array.from(this.doors.values());
  }

  /**
   * Clear all doors
   */
  clear(): void {
    this.doors.clear();
  }

  /**
   * Get door count
   */
  getDoorCount(): number {
    return this.doors.size;
  }

  /**
   * Check for door conflicts at a specific location
   * Returns true if there are conflicting doors that shouldn't coexist
   */
  hasConflictingDoors(position: Position): boolean {
    const doorDirections = [
      ExitDirection.North,
      ExitDirection.South, 
      ExitDirection.East,
      ExitDirection.West
    ];

    const doorsAtPosition = doorDirections
      .map(direction => this.getDoorByLocation(position, direction))
      .filter(door => door !== undefined);

    // Conflict if there are doors in opposite directions
    const hasNorth = doorsAtPosition.some(door => door!.location.direction === ExitDirection.North);
    const hasSouth = doorsAtPosition.some(door => door!.location.direction === ExitDirection.South);
    const hasEast = doorsAtPosition.some(door => door!.location.direction === ExitDirection.East);
    const hasWest = doorsAtPosition.some(door => door!.location.direction === ExitDirection.West);

    return (hasNorth && hasSouth) || (hasEast && hasWest);
  }
}