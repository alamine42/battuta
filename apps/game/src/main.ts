// Battuta — entry point.
// Boots Phaser at the Modern Indie Pixel logical resolution (480×270).
// Scales to fit the viewport with nearest-neighbor pixel art.

import Phaser from "phaser";
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from "./config/game";
import { BootScene } from "./scenes/BootScene";
import { PlaceholderRoomScene } from "./scenes/PlaceholderRoomScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: LOGICAL_WIDTH,
  height: LOGICAL_HEIGHT,
  backgroundColor: "#1a1208",
  pixelArt: true,
  antialias: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 2,
  },
  scene: [BootScene, PlaceholderRoomScene],
};

new Phaser.Game(config);
