// 4-directional A* on a tile grid. Phase 0 implementation — small grids,
// manhattan heuristic, no diagonal moves. Sufficient for tap-to-walk in a
// single room; we'll graduate to a proper pathfinding lib if we need
// multi-room or large overworlds.

export type Tile = { tx: number; ty: number };

interface Node extends Tile {
  g: number; // cost from start
  h: number; // heuristic to goal
  f: number; // g + h
  parent: Node | null;
}

const DIRS: [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

function key(tx: number, ty: number): string {
  return `${tx},${ty}`;
}

function manhattan(a: Tile, b: Tile): number {
  return Math.abs(a.tx - b.tx) + Math.abs(a.ty - b.ty);
}

/**
 * Return a path of tiles from start to goal, INCLUDING start at index 0.
 * Returns an empty array if unreachable.
 *
 * `walkable(tx, ty)` should return true for tiles the kid can step on.
 */
export function findPath(
  start: Tile,
  goal: Tile,
  walkable: (tx: number, ty: number) => boolean,
  maxIter = 2000,
): Tile[] {
  if (!walkable(goal.tx, goal.ty)) return [];
  if (start.tx === goal.tx && start.ty === goal.ty) return [start];

  const open: Node[] = [];
  const closed = new Set<string>();
  const seen = new Map<string, Node>();

  const startNode: Node = {
    tx: start.tx,
    ty: start.ty,
    g: 0,
    h: manhattan(start, goal),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;
  open.push(startNode);
  seen.set(key(start.tx, start.ty), startNode);

  let iter = 0;
  while (open.length > 0 && iter++ < maxIter) {
    // pull lowest f. Linear scan is O(n²) in the worst case but trivial at
    // typical Battuta room sizes (20×11 = 220 max tiles, < 50µs to find best).
    // **If room grids ever exceed ~50×50, replace with a binary heap.**
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIdx].f) bestIdx = i;
    }
    const cur = open.splice(bestIdx, 1)[0];
    closed.add(key(cur.tx, cur.ty));

    if (cur.tx === goal.tx && cur.ty === goal.ty) {
      // reconstruct
      const path: Tile[] = [];
      let n: Node | null = cur;
      while (n) {
        path.push({ tx: n.tx, ty: n.ty });
        n = n.parent;
      }
      return path.reverse();
    }

    for (const [dx, dy] of DIRS) {
      const nx = cur.tx + dx;
      const ny = cur.ty + dy;
      if (!walkable(nx, ny)) continue;
      const k = key(nx, ny);
      if (closed.has(k)) continue;
      const tentativeG = cur.g + 1;
      const existing = seen.get(k);
      if (existing && tentativeG >= existing.g) continue;
      const node: Node = {
        tx: nx,
        ty: ny,
        g: tentativeG,
        h: manhattan({ tx: nx, ty: ny }, goal),
        f: 0,
        parent: cur,
      };
      node.f = node.g + node.h;
      if (existing) {
        existing.g = node.g;
        existing.f = node.f;
        existing.parent = cur;
      } else {
        seen.set(k, node);
        open.push(node);
      }
    }
  }

  return [];
}
