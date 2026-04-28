// Kid entity. Placeholder art (a simple body + head rectangle) until
// we get real sprites in Phase 3. Walks tile-to-tile along a path
// computed by the Pathfinder.

import Phaser from "phaser";
import { COLORS, KID_H, KID_TILES_PER_SEC, KID_W } from "../config/game";
import { tileToWorldX, tileToWorldY } from "../systems/grid";
import type { Tile } from "../systems/Pathfinder";

export class Kid {
  readonly container: Phaser.GameObjects.Container;
  private tx: number;
  private ty: number;
  private walking = false;
  private currentPath: Tile[] | null = null;
  private pathIdx = 0;
  private onArrive: (() => void) | null = null;

  constructor(scene: Phaser.Scene, tx: number, ty: number) {
    this.tx = tx;
    this.ty = ty;

    const body = scene.add.rectangle(0, 0, KID_W, KID_H * 0.6, COLORS.kidShirt);
    body.setOrigin(0.5, 0);

    const head = scene.add.circle(0, -2, KID_W * 0.45, COLORS.kidSkin);
    head.setOrigin(0.5, 1);

    const hair = scene.add.rectangle(0, -KID_H * 0.55, KID_W * 0.85, 6, COLORS.kidHair);
    hair.setOrigin(0.5, 0);

    const legs = scene.add.rectangle(0, KID_H * 0.6, KID_W * 0.85, KID_H * 0.4, COLORS.kidPants);
    legs.setOrigin(0.5, 0);

    this.container = scene.add.container(0, 0, [legs, body, hair, head]);
    this.syncFromTile();
    this.container.setDepth(50);
  }

  get position(): Tile {
    return { tx: this.tx, ty: this.ty };
  }

  get isWalking(): boolean {
    return this.walking;
  }

  walkAlong(scene: Phaser.Scene, path: Tile[], onArrive?: () => void): void {
    if (path.length < 2) {
      onArrive?.();
      return;
    }
    this.currentPath = path;
    this.pathIdx = 1; // path[0] is current tile
    this.onArrive = onArrive ?? null;
    this.walking = true;
    this.stepOnce(scene);
  }

  cancel(): void {
    this.walking = false;
    this.currentPath = null;
    this.onArrive = null;
  }

  private stepOnce(scene: Phaser.Scene): void {
    if (!this.walking || !this.currentPath) return;
    if (this.pathIdx >= this.currentPath.length) {
      this.walking = false;
      const cb = this.onArrive;
      this.currentPath = null;
      this.onArrive = null;
      cb?.();
      return;
    }
    const next = this.currentPath[this.pathIdx];
    this.pathIdx += 1;
    const dur = 1000 / KID_TILES_PER_SEC;
    scene.tweens.add({
      targets: this.container,
      x: tileToWorldX(next.tx),
      y: tileToWorldY(next.ty),
      duration: dur,
      ease: "Linear",
      onComplete: () => {
        this.tx = next.tx;
        this.ty = next.ty;
        this.stepOnce(scene);
      },
    });
  }

  private syncFromTile(): void {
    this.container.x = tileToWorldX(this.tx);
    this.container.y = tileToWorldY(this.ty);
  }
}
