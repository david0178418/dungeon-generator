# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `bun dev` - Start development server with hot reloading
- `bun build` - Build for production (outputs to `dist/` directory)
- `bun start` - Run production build
- `bun check:types` - Type check with TypeScript (no emit)

### Installation
- `bun install` - Install dependencies

## Architecture

### Core Structure
This is a React-based dungeon generator application built with Bun runtime and TypeScript. The app generates procedural dungeons using a geomorph-based system with rooms and corridors.

### Key Components
- **DungeonGenerator** (`src/components/DungeonGenerator.tsx`) - Main application container with Material-UI theming
- **DungeonCanvas** - Visual rendering of generated dungeons
- **GenerationControls** - UI controls for generation parameters
- **RoomDetails** - Display detailed room information

### Generation System
The dungeon generation follows a multi-step process:

1. **Room Templates** (`src/data/roomTemplates.ts`) - Pre-defined room shapes and patterns stored as grid patterns
2. **GeomorphDungeonGenerator** (`src/utils/geomorphDungeonGenerator.ts`) - Main generation logic:
   - Creates entrance room first
   - Generates main rooms based on templates
   - Connects rooms with corridors
   - Adds exploration corridors
3. **CorridorGenerator** (`src/utils/corridorGenerator.ts`) - Handles corridor placement and pathfinding

### Type System
All types are centralized in `src/types.ts` with comprehensive enums and interfaces:
- Room system: `Room`, `RoomShape`, `RoomType`, `RoomSize`
- Corridor system: `Corridor`, `CorridorType`, `CorridorDirection`
- Connection system: `ConnectionPoint`, `Position`
- Generation: `GenerationSettings`, `DungeonMap`

### Tech Stack
- **Runtime**: Bun
- **Framework**: React 19 with TypeScript
- **UI**: Material-UI with Emotion styling
- **Build**: Bun's built-in bundler with browser targeting
- **Path Aliases**: `@/*` maps to `./src/*`

### File Organization
```
src/
├── components/     # React components
├── utils/         # Generation algorithms and utilities  
├── data/          # Static data (room templates)
├── types.ts       # Shared TypeScript definitions
└── App.tsx        # Main app entry point
```

The generation system uses a grid-based approach where rooms are placed using template patterns and connected via corridor algorithms that respect grid spacing and connectivity rules.