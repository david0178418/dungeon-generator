import {
  Corridor,
  CorridorType,
  CorridorDirection,
  Position,
  ConnectionPoint,
  ExitDirection,
  Room,
} from '../types';

export interface PathfindingNode {
  position: Position;
  gCost: number;
  hCost: number;
  fCost: number;
  parent?: PathfindingNode;
}

export class CorridorGenerator {
  private gridSize: number;
  private occupiedSpaces: Set<string> = new Set();

  constructor(gridSize: number) {
    this.gridSize = gridSize;
  }

  public markRoomAsOccupied(room: Room): void {
    const template = room.templateId;
    if (!template) {
      // Fallback for simple rooms
      for (let x = room.position.x; x < room.position.x + room.width; x++) {
        for (let y = room.position.y; y < room.position.y + room.height; y++) {
          this.occupiedSpaces.add(`${x},${y}`);
        }
      }
      return;
    }

    // Use room template grid pattern for more accurate marking
    for (let y = 0; y < room.height; y++) {
      for (let x = 0; x < room.width; x++) {
        this.occupiedSpaces.add(`${room.position.x + x},${room.position.y + y}`);
      }
    }
  }

  public generateCorridor(start: Position, end: Position): Corridor[] {
    const path = this.findPath(start, end);
    if (path.length === 0) {
      return [];
    }

    return this.pathToCorridors(path);
  }

  private findPath(start: Position, end: Position): Position[] {
    const openSet: PathfindingNode[] = [];
    const closedSet: Set<string> = new Set();
    
    const startNode: PathfindingNode = {
      position: start,
      gCost: 0,
      hCost: this.calculateHeuristic(start, end),
      fCost: 0,
    };
    startNode.fCost = startNode.gCost + startNode.hCost;
    
    openSet.push(startNode);

    while (openSet.length > 0) {
      // Find node with lowest fCost
      let currentNode = openSet[0];
      let currentIndex = 0;
      
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].fCost < currentNode.fCost) {
          currentNode = openSet[i];
          currentIndex = i;
        }
      }

      openSet.splice(currentIndex, 1);
      const positionKey = `${currentNode.position.x},${currentNode.position.y}`;
      closedSet.add(positionKey);

      // Check if we reached the goal
      if (currentNode.position.x === end.x && currentNode.position.y === end.y) {
        return this.reconstructPath(currentNode);
      }

      // Check neighbors
      const neighbors = this.getNeighbors(currentNode.position);
      
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        
        if (closedSet.has(neighborKey) || this.isBlocked(neighbor, start, end)) {
          continue;
        }

        const gCost = currentNode.gCost + 1;
        const hCost = this.calculateHeuristic(neighbor, end);
        const fCost = gCost + hCost;

        const existingNode = openSet.find(node => 
          node.position.x === neighbor.x && node.position.y === neighbor.y
        );

        if (!existingNode) {
          openSet.push({
            position: neighbor,
            gCost,
            hCost,
            fCost,
            parent: currentNode,
          });
        } else if (gCost < existingNode.gCost) {
          existingNode.gCost = gCost;
          existingNode.fCost = gCost + existingNode.hCost;
          existingNode.parent = currentNode;
        }
      }
    }

    return []; // No path found
  }

  private getNeighbors(position: Position): Position[] {
    const neighbors: Position[] = [];
    const directions = [
      { x: 0, y: -1 }, // North
      { x: 1, y: 0 },  // East
      { x: 0, y: 1 },  // South
      { x: -1, y: 0 }, // West
    ];

    for (const dir of directions) {
      const newPos = {
        x: position.x + dir.x,
        y: position.y + dir.y,
      };

      if (this.isValidPosition(newPos)) {
        neighbors.push(newPos);
      }
    }

    return neighbors;
  }

  private isValidPosition(position: Position): boolean {
    return position.x >= 0 && 
           position.x < this.gridSize && 
           position.y >= 0 && 
           position.y < this.gridSize;
  }

  private isBlocked(position: Position, start: Position, end: Position): boolean {
    const positionKey = `${position.x},${position.y}`;
    
    // Allow movement through start and end positions
    if ((position.x === start.x && position.y === start.y) ||
        (position.x === end.x && position.y === end.y)) {
      return false;
    }

    return this.occupiedSpaces.has(positionKey);
  }

  private calculateHeuristic(from: Position, to: Position): number {
    // Manhattan distance
    return Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
  }

  private reconstructPath(node: PathfindingNode): Position[] {
    const path: Position[] = [];
    let current: PathfindingNode | undefined = node;

    while (current) {
      path.unshift(current.position);
      current = current.parent;
    }

    return path;
  }

  private pathToCorridors(path: Position[]): Corridor[] {
    if (path.length < 2) return [];

    const corridors: Corridor[] = [];
    let currentSegmentStart = 0;

    for (let i = 1; i < path.length; i++) {
      const current = path[i];
      const previous = path[i - 1];
      const next = i + 1 < path.length ? path[i + 1] : null;

      // Check if direction changes or we're at the end
      if (next === null || this.getDirection(previous, current) !== this.getDirection(current, next)) {
        // Create corridor segment
        const segmentPath = path.slice(currentSegmentStart, i + 1);
        const corridor = this.createCorridorFromPath(segmentPath);
        if (corridor) {
          corridors.push(corridor);
          // Mark corridor spaces as occupied
          for (const pos of segmentPath) {
            this.occupiedSpaces.add(`${pos.x},${pos.y}`);
          }
        }
        currentSegmentStart = i;
      }
    }

    return corridors;
  }

  private getDirection(from: Position, to: Position): CorridorDirection {
    if (to.x > from.x) return CorridorDirection.Horizontal;
    if (to.x < from.x) return CorridorDirection.Horizontal;
    if (to.y > from.y) return CorridorDirection.Vertical;
    if (to.y < from.y) return CorridorDirection.Vertical;
    return CorridorDirection.Horizontal; // fallback
  }

  private createCorridorFromPath(path: Position[]): Corridor | null {
    if (path.length < 2) return null;

    const start = path[0];
    const end = path[path.length - 1];
    const direction = this.getDirection(start, end);
    const length = path.length;

    const corridor: Corridor = {
      id: `corridor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: CorridorType.Straight,
      direction,
      position: start,
      length,
      width: 1,
      isGenerated: true,
      connectionPoints: [
        {
          direction: this.positionToExitDirection(start, end),
          position: start,
          isConnected: false,
          isGenerated: false,
        },
        {
          direction: this.positionToExitDirection(end, start),
          position: end,
          isConnected: false,
          isGenerated: false,
        },
      ],
      path,
    };

    return corridor;
  }

  private positionToExitDirection(from: Position, to: Position): ExitDirection {
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? ExitDirection.East : ExitDirection.West;
    } else {
      return dy > 0 ? ExitDirection.South : ExitDirection.North;
    }
  }

  public createTJunction(position: Position): Corridor {
    return {
      id: `junction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: CorridorType.TJunction,
      direction: CorridorDirection.Horizontal,
      position,
      length: 1,
      width: 1,
      isGenerated: true,
      connectionPoints: [
        {
          direction: ExitDirection.North,
          position: { x: position.x, y: position.y - 1 },
          isConnected: false,
          isGenerated: false,
        },
        {
          direction: ExitDirection.East,
          position: { x: position.x + 1, y: position.y },
          isConnected: false,
          isGenerated: false,
        },
        {
          direction: ExitDirection.West,
          position: { x: position.x - 1, y: position.y },
          isConnected: false,
          isGenerated: false,
        },
      ],
      path: [position],
    };
  }

  public createCrossJunction(position: Position): Corridor {
    return {
      id: `cross-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: CorridorType.CrossJunction,
      direction: CorridorDirection.Horizontal,
      position,
      length: 1,
      width: 1,
      isGenerated: true,
      connectionPoints: [
        {
          direction: ExitDirection.North,
          position: { x: position.x, y: position.y - 1 },
          isConnected: false,
          isGenerated: false,
        },
        {
          direction: ExitDirection.South,
          position: { x: position.x, y: position.y + 1 },
          isConnected: false,
          isGenerated: false,
        },
        {
          direction: ExitDirection.East,
          position: { x: position.x + 1, y: position.y },
          isConnected: false,
          isGenerated: false,
        },
        {
          direction: ExitDirection.West,
          position: { x: position.x - 1, y: position.y },
          isConnected: false,
          isGenerated: false,
        },
      ],
      path: [position],
    };
  }
}