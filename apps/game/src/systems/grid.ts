// Tile ↔ world-coordinate math. Pulled out of Kid.ts because every entity
// (NPCs, hoopoe, items) and every system (pathfinder targets, ripple feedback)
// needs the same conversion.

import { TILE_SIZE } from "../config/game";

/** Tile center X in world pixels. */
export function tileToWorldX(tx: number): number {
  return tx * TILE_SIZE + TILE_SIZE / 2;
}

/** Tile bottom Y in world pixels (anchor characters' feet at tile bottom). */
export function tileToWorldY(ty: number): number {
  return ty * TILE_SIZE + TILE_SIZE;
}

/** Inverse: world coords → tile index. */
export function worldToTile(x: number, y: number): { tx: number; ty: number } {
  return { tx: Math.floor(x / TILE_SIZE), ty: Math.floor(y / TILE_SIZE) };
}
