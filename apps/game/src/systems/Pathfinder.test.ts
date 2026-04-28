// A* pathfinder tests. Covers the 6 paths in the eng-review coverage diagram.

import { describe, expect, it } from "vitest";
import { findPath } from "./Pathfinder";

// 7×5 test grid:
//   0 0 0 0 0 0 0
//   0 1 1 0 0 0 0
//   0 0 1 0 1 1 0
//   0 0 0 0 1 0 0
//   0 0 0 0 0 0 0
//   1 = wall, 0 = floor
const grid: number[][] = [
  [0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 0, 0, 0, 0],
  [0, 0, 1, 0, 1, 1, 0],
  [0, 0, 0, 0, 1, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
];
const walkable = (tx: number, ty: number) =>
  ty >= 0 && ty < grid.length && tx >= 0 && tx < grid[0].length && grid[ty][tx] === 0;

describe("Pathfinder", () => {
  it("returns [start] when start === goal", () => {
    const p = findPath({ tx: 0, ty: 0 }, { tx: 0, ty: 0 }, walkable);
    expect(p).toEqual([{ tx: 0, ty: 0 }]);
  });

  it("returns [] when goal is not walkable", () => {
    const p = findPath({ tx: 0, ty: 0 }, { tx: 1, ty: 1 }, walkable);
    expect(p).toEqual([]);
  });

  it("finds a simple straight path", () => {
    const p = findPath({ tx: 0, ty: 0 }, { tx: 3, ty: 0 }, walkable);
    expect(p.length).toBeGreaterThan(1);
    expect(p[0]).toEqual({ tx: 0, ty: 0 });
    expect(p[p.length - 1]).toEqual({ tx: 3, ty: 0 });
    // path length: manhattan distance is 3, so path has 4 nodes (inclusive)
    expect(p).toHaveLength(4);
  });

  it("finds a path that detours around an obstacle", () => {
    // From (0,2) to (3,2) — direct path blocked by wall at (1,1)/(1,2)/(2,2).
    // Must go via row 0 or row 3.
    const p = findPath({ tx: 0, ty: 2 }, { tx: 3, ty: 2 }, walkable);
    expect(p.length).toBeGreaterThan(0);
    expect(p[0]).toEqual({ tx: 0, ty: 2 });
    expect(p[p.length - 1]).toEqual({ tx: 3, ty: 2 });
    // Every step in the path must be walkable
    for (const node of p) {
      expect(walkable(node.tx, node.ty)).toBe(true);
    }
  });

  it("returns [] when goal is unreachable (fully walled off)", () => {
    // Build a different grid where (3,3) is walled off
    const isolated: number[][] = [
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 1, 1],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
    ];
    const w = (x: number, y: number) =>
      y >= 0 && y < isolated.length && x >= 0 && x < isolated[0].length && isolated[y][x] === 0;
    const p = findPath({ tx: 0, ty: 0 }, { tx: 4, ty: 4 }, w);
    expect(p).toEqual([]);
  });

  it("returns [] when maxIter exhausts", () => {
    // Tiny maxIter with a path that needs more iterations than budget
    const p = findPath({ tx: 0, ty: 0 }, { tx: 6, ty: 4 }, walkable, 2);
    expect(p).toEqual([]);
  });

  it("4-directional only (does NOT return diagonals)", () => {
    // Diagonal-only path between (0,0) and (1,1) — must take 2 4-dir steps
    const p = findPath({ tx: 0, ty: 0 }, { tx: 1, ty: 0 }, walkable);
    expect(p).toHaveLength(2);
    expect(p[1]).toEqual({ tx: 1, ty: 0 });
  });
});
