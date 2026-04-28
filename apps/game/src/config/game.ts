// Battuta game-wide constants.
//
// Resolution philosophy: the game renders at a fixed *logical* resolution
// (LOGICAL_WIDTH × LOGICAL_HEIGHT) and scales up with nearest-neighbor to
// fit the viewport. This is the Modern Indie Pixel tier locked in SPEC.md
// §5 — Stardew Valley / Eastward zone.

export const LOGICAL_WIDTH = 480;
export const LOGICAL_HEIGHT = 270;
export const TILE_SIZE = 24;

// Room grid: 20 × 11 tiles fits 480×264, leaves 6px for HUD bleed.
export const ROOM_TILES_X = 20;
export const ROOM_TILES_Y = 11;

// Kid sprite size per SPEC §5: 24×36.
export const KID_W = 24;
export const KID_H = 36;

// Movement speed in tiles per second when walking a path.
export const KID_TILES_PER_SEC = 4;

// Save slot key for LocalStorage.
export const SAVE_KEY = "battuta:phase0:save";

// Color palette (placeholder — real art replaces these in Phase 3).
// Inspired by Variant A's warm souk palette.
export const COLORS = {
  floor: 0xc8a878,
  floorAlt: 0xb89868,
  wall: 0x5c3a1e,
  wallTop: 0x3a2718,
  kidShirt: 0x4a7ba0,
  kidPants: 0x2a3a50,
  kidSkin: 0xfdd29c,
  kidHair: 0x3a2818,
  hoopoe: 0xe07b3a,
  hudBg: 0x1a1208,
  hudFg: 0xf4d678,
  hudPanel: 0x3a2718,
} as const;
