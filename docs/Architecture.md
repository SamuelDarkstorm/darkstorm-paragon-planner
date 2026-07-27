# Darkstorm Planner Architecture

## Project Goal

Create a touch-friendly Diablo planner that supports Diablo IV first, with future support for Diablo II: Resurrected and Diablo III.

---

## Engine

Responsibilities:
- Render boards
- Handle node selection
- Validate legal paths
- Support touch and mouse input

---

## Data

Stored separately from the engine.

Includes:
- Board layouts
- Node definitions
- Glyph information
- Future build data

---

## Future

The engine should be able to load any supported game or Paragon board without changing the rendering logic.