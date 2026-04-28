// Boot scene: minimal in Phase 0 — just transition straight to the
// placeholder room. In later phases this is where we'd preload audio,
// sprite atlases, tilemaps, fonts.

import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  create(): void {
    this.scene.start("PlaceholderRoomScene");
  }
}
