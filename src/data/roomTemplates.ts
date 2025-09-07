import {
  RoomTemplate,
  RoomShape,
  RoomType,
  RoomSize,
  ExitDirection,
} from '../types';

// Helper function to create grid patterns
function createGridPattern(width: number, height: number, pattern: string[]): boolean[][] {
  const grid: boolean[][] = [];
  for (let y = 0; y < height; y++) {
    grid[y] = [];
    for (let x = 0; x < width; x++) {
      grid[y][x] = pattern[y] ? pattern[y][x] === '#' : false;
    }
  }
  return grid;
}

// Entrance room templates
export const ENTRANCE_ROOM_TEMPLATES: RoomTemplate[] = [
  {
    id: 'entrance-01',
    name: 'Simple Entrance',
    shape: RoomShape.Rectangle,
    type: RoomType.Entrance,
    size: RoomSize.Medium,
    width: 6,
    height: 4,
    connectionPoints: [
      { direction: ExitDirection.North, position: { x: 3, y: 0 } },
      { direction: ExitDirection.South, position: { x: 3, y: 4 } },
    ],
    gridPattern: createGridPattern(6, 4, [
      '######',
      '######',
      '######',
      '######',
    ]),
  },
  {
    id: 'entrance-02',
    name: 'T-Entrance',
    shape: RoomShape.TShape,
    type: RoomType.Entrance,
    size: RoomSize.Medium,
    width: 7,
    height: 5,
    connectionPoints: [
      { direction: ExitDirection.North, position: { x: 3, y: 0 } },
      { direction: ExitDirection.East, position: { x: 7, y: 2 } },
      { direction: ExitDirection.West, position: { x: 0, y: 2 } },
    ],
    gridPattern: createGridPattern(7, 5, [
      '   #   ',
      '   #   ',
      '#######',
      '   #   ',
      '   #   ',
    ]),
  },
  {
    id: 'entrance-03',
    name: 'L-Entrance',
    shape: RoomShape.LShape,
    type: RoomType.Entrance,
    size: RoomSize.Large,
    width: 6,
    height: 6,
    connectionPoints: [
      { direction: ExitDirection.North, position: { x: 2, y: 0 } },
      { direction: ExitDirection.East, position: { x: 6, y: 3 } },
      { direction: ExitDirection.South, position: { x: 5, y: 6 } },
    ],
    gridPattern: createGridPattern(6, 6, [
      '####  ',
      '####  ',
      '####  ',
      '######',
      '######',
      '######',
    ]),
  },
];

// Standard room templates
export const STANDARD_ROOM_TEMPLATES: RoomTemplate[] = [
  {
    id: 'room-square-small',
    name: 'Small Square Room',
    shape: RoomShape.Square,
    type: RoomType.Standard,
    size: RoomSize.Small,
    width: 4,
    height: 4,
    connectionPoints: [
      { direction: ExitDirection.North, position: { x: 2, y: 0 } },
      { direction: ExitDirection.South, position: { x: 2, y: 4 } },
      { direction: ExitDirection.East, position: { x: 4, y: 2 } },
      { direction: ExitDirection.West, position: { x: 0, y: 2 } },
    ],
    gridPattern: createGridPattern(4, 4, [
      '####',
      '####',
      '####',
      '####',
    ]),
  },
  {
    id: 'room-rectangle-medium',
    name: 'Medium Rectangle Room',
    shape: RoomShape.Rectangle,
    type: RoomType.Standard,
    size: RoomSize.Medium,
    width: 6,
    height: 4,
    connectionPoints: [
      { direction: ExitDirection.North, position: { x: 3, y: 0 } },
      { direction: ExitDirection.South, position: { x: 3, y: 4 } },
      { direction: ExitDirection.East, position: { x: 6, y: 2 } },
      { direction: ExitDirection.West, position: { x: 0, y: 2 } },
    ],
    gridPattern: createGridPattern(6, 4, [
      '######',
      '######',
      '######',
      '######',
    ]),
  },
  {
    id: 'room-circle-medium',
    name: 'Circular Room',
    shape: RoomShape.Circle,
    type: RoomType.Standard,
    size: RoomSize.Medium,
    width: 5,
    height: 5,
    connectionPoints: [
      { direction: ExitDirection.North, position: { x: 2, y: 0 } },
      { direction: ExitDirection.South, position: { x: 2, y: 5 } },
      { direction: ExitDirection.East, position: { x: 5, y: 2 } },
      { direction: ExitDirection.West, position: { x: 0, y: 2 } },
    ],
    gridPattern: createGridPattern(5, 5, [
      ' ### ',
      '#####',
      '#####',
      '#####',
      ' ### ',
    ]),
  },
  {
    id: 'room-l-large',
    name: 'L-Shaped Room',
    shape: RoomShape.LShape,
    type: RoomType.Standard,
    size: RoomSize.Large,
    width: 6,
    height: 6,
    connectionPoints: [
      { direction: ExitDirection.North, position: { x: 2, y: 0 } },
      { direction: ExitDirection.East, position: { x: 6, y: 4 } },
      { direction: ExitDirection.South, position: { x: 5, y: 6 } },
      { direction: ExitDirection.West, position: { x: 0, y: 1 } },
    ],
    gridPattern: createGridPattern(6, 6, [
      '####  ',
      '####  ',
      '####  ',
      '######',
      '######',
      '######',
    ]),
  },
  {
    id: 'room-t-large',
    name: 'T-Shaped Room',
    shape: RoomShape.TShape,
    type: RoomType.Standard,
    size: RoomSize.Large,
    width: 7,
    height: 5,
    connectionPoints: [
      { direction: ExitDirection.North, position: { x: 3, y: 0 } },
      { direction: ExitDirection.South, position: { x: 3, y: 5 } },
      { direction: ExitDirection.East, position: { x: 7, y: 2 } },
      { direction: ExitDirection.West, position: { x: 0, y: 2 } },
    ],
    gridPattern: createGridPattern(7, 5, [
      '  ###  ',
      '  ###  ',
      '#######',
      '  ###  ',
      '  ###  ',
    ]),
  },
  {
    id: 'room-cross-large',
    name: 'Cross-Shaped Room',
    shape: RoomShape.Cross,
    type: RoomType.Standard,
    size: RoomSize.Large,
    width: 7,
    height: 7,
    connectionPoints: [
      { direction: ExitDirection.North, position: { x: 3, y: 0 } },
      { direction: ExitDirection.South, position: { x: 3, y: 7 } },
      { direction: ExitDirection.East, position: { x: 7, y: 3 } },
      { direction: ExitDirection.West, position: { x: 0, y: 3 } },
    ],
    gridPattern: createGridPattern(7, 7, [
      '  ###  ',
      '  ###  ',
      '  ###  ',
      '#######',
      '  ###  ',
      '  ###  ',
      '  ###  ',
    ]),
  },
  {
    id: 'room-octagon-large',
    name: 'Octagonal Room',
    shape: RoomShape.Octagon,
    type: RoomType.Standard,
    size: RoomSize.Large,
    width: 6,
    height: 6,
    connectionPoints: [
      { direction: ExitDirection.North, position: { x: 3, y: 0 } },
      { direction: ExitDirection.South, position: { x: 3, y: 6 } },
      { direction: ExitDirection.East, position: { x: 6, y: 3 } },
      { direction: ExitDirection.West, position: { x: 0, y: 3 } },
    ],
    gridPattern: createGridPattern(6, 6, [
      ' #### ',
      '######',
      '######',
      '######',
      '######',
      ' #### ',
    ]),
  },
];

// Junction room templates for connecting multiple corridors
export const JUNCTION_ROOM_TEMPLATES: RoomTemplate[] = [
  {
    id: 'junction-cross',
    name: 'Cross Junction',
    shape: RoomShape.Cross,
    type: RoomType.Junction,
    size: RoomSize.Small,
    width: 3,
    height: 3,
    connectionPoints: [
      { direction: ExitDirection.North, position: { x: 1, y: 0 } },
      { direction: ExitDirection.South, position: { x: 1, y: 3 } },
      { direction: ExitDirection.East, position: { x: 3, y: 1 } },
      { direction: ExitDirection.West, position: { x: 0, y: 1 } },
    ],
    gridPattern: createGridPattern(3, 3, [
      ' # ',
      '###',
      ' # ',
    ]),
  },
  {
    id: 'junction-t',
    name: 'T Junction',
    shape: RoomShape.TShape,
    type: RoomType.Junction,
    size: RoomSize.Small,
    width: 3,
    height: 3,
    connectionPoints: [
      { direction: ExitDirection.North, position: { x: 1, y: 0 } },
      { direction: ExitDirection.East, position: { x: 3, y: 1 } },
      { direction: ExitDirection.West, position: { x: 0, y: 1 } },
    ],
    gridPattern: createGridPattern(3, 3, [
      ' # ',
      '###',
      '   ',
    ]),
  },
];

// All room templates combined
export const ALL_ROOM_TEMPLATES: RoomTemplate[] = [
  ...ENTRANCE_ROOM_TEMPLATES,
  ...STANDARD_ROOM_TEMPLATES,
  ...JUNCTION_ROOM_TEMPLATES,
];

// Helper functions
export function getRoomTemplateById(id: string): RoomTemplate | undefined {
  return ALL_ROOM_TEMPLATES.find(template => template.id === id);
}

export function getRoomTemplatesByType(type: RoomType): RoomTemplate[] {
  return ALL_ROOM_TEMPLATES.filter(template => template.type === type);
}

export function getRandomRoomTemplate(type: RoomType): RoomTemplate {
  const templates = getRoomTemplatesByType(type);
  return templates[Math.floor(Math.random() * templates.length)];
}