// Phase 0 placeholder room. Tile-based, procedural (no external assets),
// kid character that walks tile-to-tile via tap-to-walk + A*.
//
// What this scene proves out:
//   - Phaser bootstraps at the locked Modern Indie Pixel logical resolution
//   - Tile grid renders crisply with nearest-neighbor upscaling
//   - Tap-to-walk works on touch + mouse
//   - Save/load roundtrips kid position
//
// What this scene does NOT do (later phases):
//   - Real art (Phase 3)
//   - NPCs / dialog / quests (Phase 2)
//   - Hoopoe companion behavior (Phase 2)
//   - Audio (Phase 3)

import Phaser from "phaser";
import { COLORS, LOGICAL_WIDTH, ROOM_TILES_X, ROOM_TILES_Y, TILE_SIZE } from "../config/game";
import { Kid } from "../entities/Kid";
import { Save } from "../systems/Save";
import { findPath } from "../systems/Pathfinder";

// 0 = floor, 1 = wall. Hand-laid layout — small enough that explicit
// is clearer than algorithmic.
const ROOM: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

export class PlaceholderRoomScene extends Phaser.Scene {
  private save!: Save;
  private kid!: Kid;
  private hudText!: Phaser.GameObjects.Text;
  private hintMarker?: Phaser.GameObjects.Arc;

  constructor() {
    super({ key: "PlaceholderRoomScene" });
  }

  init(): void {
    this.save = new Save();
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.wallTop);
    this.drawTilemap();
    this.spawnKid();
    this.drawHud();
    this.drawIntroHint();
    this.bindInput();
  }

  // ---------- world ----------

  private drawTilemap(): void {
    for (let ty = 0; ty < ROOM_TILES_Y; ty++) {
      for (let tx = 0; tx < ROOM_TILES_X; tx++) {
        const tile = ROOM[ty][tx];
        const x = tx * TILE_SIZE;
        const y = ty * TILE_SIZE;
        if (tile === 1) {
          // wall: a darker square + a top-cap to suggest height
          this.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, COLORS.wall).setOrigin(0).setDepth(10);
          this.add.rectangle(x, y, TILE_SIZE, 4, COLORS.wallTop).setOrigin(0).setDepth(11);
        } else {
          // floor: alternate two shades for a tiled look
          const c = (tx + ty) % 2 === 0 ? COLORS.floor : COLORS.floorAlt;
          this.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, c).setOrigin(0).setDepth(0);
        }
      }
    }
  }

  private spawnKid(): void {
    const { tx, ty } = this.save.kid;
    const safe = this.isWalkable(tx, ty) ? { tx, ty } : { tx: 4, ty: 5 };
    this.kid = new Kid(this, safe.tx, safe.ty);
  }

  // ---------- hud ----------

  private drawHud(): void {
    const padding = 6;
    // Top-left: hasanat counter (per SPEC §10).
    const coinPanel = this.add.rectangle(padding, padding, 64, 18, COLORS.hudPanel, 0.85);
    coinPanel.setOrigin(0).setDepth(100);
    const coin = this.add.circle(padding + 10, padding + 9, 6, COLORS.hudFg);
    coin.setDepth(101);
    this.hudText = this.add.text(padding + 22, padding + 4, `${this.save.hasanat}`, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "11px",
      color: "#fdd29c",
    });
    this.hudText.setDepth(101);

    // Top-right: pause icon (placeholder — does nothing in Phase 0).
    const pauseBg = this.add.rectangle(LOGICAL_WIDTH - padding, padding, 18, 18, COLORS.hudPanel, 0.85);
    pauseBg.setOrigin(1, 0).setDepth(100);
    const barX = LOGICAL_WIDTH - padding - 11;
    const barY = padding + 4;
    this.add.rectangle(barX, barY, 3, 10, COLORS.hudFg).setOrigin(0).setDepth(101);
    this.add.rectangle(barX + 5, barY, 3, 10, COLORS.hudFg).setOrigin(0).setDepth(101);
  }

  private drawIntroHint(): void {
    // First-boot affordance: a small pulsing marker that says "tap somewhere."
    const tx = ROOM_TILES_X - 4;
    const ty = ROOM_TILES_Y - 3;
    const marker = this.add.circle(
      tx * TILE_SIZE + TILE_SIZE / 2,
      ty * TILE_SIZE + TILE_SIZE / 2,
      6,
      COLORS.hudFg,
      0.8,
    );
    marker.setDepth(60);
    this.tweens.add({
      targets: marker,
      scale: { from: 1, to: 1.6 },
      alpha: { from: 0.8, to: 0.2 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.hintMarker = marker;
  }

  // ---------- input ----------

  private bindInput(): void {
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      const tx = Math.floor(p.worldX / TILE_SIZE);
      const ty = Math.floor(p.worldY / TILE_SIZE);
      if (!this.isWalkable(tx, ty)) return;
      if (this.kid.isWalking) this.kid.cancel();
      const path = findPath(this.kid.position, { tx, ty }, (x, y) => this.isWalkable(x, y));
      if (path.length === 0) return;
      this.dismissIntroHint();
      this.kid.walkAlong(this, path, () => {
        this.save.setKid(this.kid.position.tx, this.kid.position.ty);
      });
      // Ripple feedback on the tap target.
      const ripple = this.add.circle(
        tx * TILE_SIZE + TILE_SIZE / 2,
        ty * TILE_SIZE + TILE_SIZE / 2,
        4,
        COLORS.hudFg,
        0.7,
      );
      ripple.setDepth(70);
      this.tweens.add({
        targets: ripple,
        scale: 3,
        alpha: 0,
        duration: 350,
        ease: "Cubic.easeOut",
        onComplete: () => ripple.destroy(),
      });
    });
  }

  private dismissIntroHint(): void {
    if (!this.hintMarker) return;
    this.tweens.add({
      targets: this.hintMarker,
      alpha: 0,
      duration: 250,
      onComplete: () => this.hintMarker?.destroy(),
    });
    this.hintMarker = undefined;
  }

  // ---------- helpers ----------

  private isWalkable(tx: number, ty: number): boolean {
    if (tx < 0 || ty < 0) return false;
    if (ty >= ROOM.length || tx >= ROOM[0].length) return false;
    return ROOM[ty][tx] === 0;
  }
}
