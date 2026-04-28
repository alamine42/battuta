import { describe, expect, it } from "vitest";
import { TILE_SIZE } from "../config/game";
import { tileToWorldX, tileToWorldY, worldToTile } from "./grid";

describe("grid math", () => {
  it("tileToWorldX returns tile center X", () => {
    expect(tileToWorldX(0)).toBe(TILE_SIZE / 2);
    expect(tileToWorldX(5)).toBe(5 * TILE_SIZE + TILE_SIZE / 2);
  });

  it("tileToWorldY returns tile bottom Y (feet anchor)", () => {
    expect(tileToWorldY(0)).toBe(TILE_SIZE);
    expect(tileToWorldY(3)).toBe(4 * TILE_SIZE);
  });

  it("worldToTile is the inverse of tileToWorldX/Y at integer tiles", () => {
    for (const tx of [0, 1, 5, 10]) {
      const wx = tileToWorldX(tx);
      // worldToTile of the center should give back the tile (with integer Y aligned)
      const back = worldToTile(wx, tileToWorldY(0) - 1); // inside tile 0 row
      expect(back.tx).toBe(tx);
    }
  });

  it("worldToTile rounds down at tile boundaries", () => {
    expect(worldToTile(TILE_SIZE - 1, TILE_SIZE - 1)).toEqual({ tx: 0, ty: 0 });
    expect(worldToTile(TILE_SIZE, TILE_SIZE)).toEqual({ tx: 1, ty: 1 });
  });
});
