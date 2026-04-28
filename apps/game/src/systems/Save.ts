// Save / load persistence.
//
// Schema is versioned. v1 (Phase 0) saved kid tile position + hasanat only.
// v2 (Phase 1+) carries the complete shape that Phases 1–6 will populate:
// avatar config, hoopoe meta, profile, quest progress, sticker collection,
// session resume, settings. Parent-dashboard data (time-cap, postcard recipients)
// lives server-side; this file is kid-side play state.
//
// Failure plumbing: Save extends Phaser's EventEmitter and emits 'save:fail' with
// a reason code so the HUD can surface the toast spec'd in SPEC §8 state matrix.
// Silent storage failure = silent data loss = parent uninstalls. Don't let it
// happen.
//
// Migration policy: v1 saves are wiped on first v2 read. Phase 0 had no real
// users; the only people with v1 saves are us testing the scaffold. When a
// real-user migration is needed in the future, add a `migrate1to2(v1)` and
// preserve their tile position.

import EventEmitter from "eventemitter3";
import { SAVE_KEY } from "../config/game";

// Note: Phaser uses eventemitter3 internally as `Phaser.Events.EventEmitter`.
// We import eventemitter3 directly so Save is testable in environments that
// can't import Phaser (which tries to initialize Canvas on load).

// ─── Schema v2 ────────────────────────────────────────────────────────────

export type Dialect = "msa" | "eg" | "shami";

export type AgeBand = "5-8" | "9-12";

export interface AvatarConfig {
  skinTone: number; // 0–5 index into palette
  hair: string; // sprite ID — "curly" | "straight" | "ponytail" | "hijab-{color}" | "kufi" | "buzz"
  eyeColor: number; // 0–3 index
  top: string;
  bottom: string;
  shoes: string;
}

export interface HoopoeMeta {
  name: string; // kid renames; default "هدهود"
  skin: string; // sprite ID — "classic" | "white" | "fancy-crested" | ...
}

export interface QuestProgress {
  currentQuestId: string | null;
  beatIndex: number; // which beat within the quest the kid is on
  scratch: Record<string, unknown>; // free-form per-quest scratchpad (e.g. items picked up)
}

export interface SessionResume {
  // Last scene the kid was in. On boot, we can resume them here with a
  // 1-frame fade rather than dropping back to the world map.
  sceneKey: string | null;
  // Logical timestamp; useful for "we missed you" check + analytics.
  closedAt: string | null;
}

export interface KidSettings {
  micEnabled: boolean; // parent toggle, mirrored kid-side
  captionsEnabled: boolean;
  colorBlindAltPalette: boolean;
  reducedMotion: boolean;
  hideHarakat: boolean; // 9+ kid mode — drops vowel marks
}

export interface SaveData {
  version: 2;
  // Profile basics
  profileId: string;
  dialect: Dialect;
  ageBand: AgeBand;
  level: number;
  hasanat: number;
  // World position
  kid: { tx: number; ty: number };
  // Customization
  avatar: AvatarConfig;
  hoopoe: HoopoeMeta;
  // Collections
  ownedItems: string[]; // sprite IDs of bedroom decor / outfit items earned
  stickers: string[]; // sticker IDs collected
  // Progress
  questProgress: QuestProgress;
  completedQuests: string[];
  // Resume
  session: SessionResume;
  // Preferences
  settings: KidSettings;
  // Meta
  updatedAt: string;
}

export type SaveFailReason = "quota" | "denied" | "corrupted" | "unknown";

const DEFAULT: SaveData = {
  version: 2,
  profileId: "default",
  dialect: "msa",
  ageBand: "5-8",
  level: 1,
  hasanat: 12,
  kid: { tx: 4, ty: 5 },
  avatar: {
    skinTone: 2,
    hair: "curly",
    eyeColor: 0,
    top: "tshirt-default",
    bottom: "pants-default",
    shoes: "sneakers-default",
  },
  hoopoe: { name: "هدهود", skin: "classic" },
  ownedItems: ["outfit-starter"], // SPEC §8 first-boot empty-state: starter outfit
  stickers: ["hoopoe-welcome"], // SPEC §8 sticker book first-boot
  questProgress: {
    currentQuestId: null,
    beatIndex: 0,
    scratch: {},
  },
  completedQuests: [],
  session: { sceneKey: null, closedAt: null },
  settings: {
    micEnabled: true,
    captionsEnabled: false,
    colorBlindAltPalette: false,
    reducedMotion: false,
    hideHarakat: false,
  },
  updatedAt: new Date().toISOString(),
};

// ─── Save class ───────────────────────────────────────────────────────────
//
// Events:
//   'save:fail'    (reason: SaveFailReason)
//   'save:write'   (no payload — successful write)
//   'save:reset'   (no payload — fresh state)

export class Save extends EventEmitter {
  private data: SaveData;

  constructor() {
    super();
    this.data = this.load();
  }

  // ── reads ──

  get raw(): Readonly<SaveData> {
    return this.data;
  }

  get kid(): { tx: number; ty: number } {
    return this.data.kid;
  }

  get hasanat(): number {
    return this.data.hasanat;
  }

  get dialect(): Dialect {
    return this.data.dialect;
  }

  get level(): number {
    return this.data.level;
  }

  get avatar(): AvatarConfig {
    return this.data.avatar;
  }

  get hoopoe(): HoopoeMeta {
    return this.data.hoopoe;
  }

  get ownedItems(): readonly string[] {
    return this.data.ownedItems;
  }

  get stickers(): readonly string[] {
    return this.data.stickers;
  }

  get session(): SessionResume {
    return this.data.session;
  }

  get settings(): KidSettings {
    return this.data.settings;
  }

  get questProgress(): QuestProgress {
    return this.data.questProgress;
  }

  // ── writes ──

  setKid(tx: number, ty: number): void {
    this.data.kid = { tx, ty };
    this.persist();
  }

  setHasanat(n: number): void {
    this.data.hasanat = n;
    this.persist();
  }

  addHasanat(delta: number): void {
    this.data.hasanat = Math.max(0, this.data.hasanat + delta);
    this.persist();
  }

  setDialect(d: Dialect): void {
    this.data.dialect = d;
    this.persist();
  }

  setLevel(n: number): void {
    this.data.level = n;
    this.persist();
  }

  setAvatar(patch: Partial<AvatarConfig>): void {
    this.data.avatar = { ...this.data.avatar, ...patch };
    this.persist();
  }

  setHoopoe(patch: Partial<HoopoeMeta>): void {
    this.data.hoopoe = { ...this.data.hoopoe, ...patch };
    this.persist();
  }

  addOwnedItem(itemId: string): void {
    if (this.data.ownedItems.includes(itemId)) return;
    this.data.ownedItems = [...this.data.ownedItems, itemId];
    this.persist();
  }

  addSticker(stickerId: string): void {
    if (this.data.stickers.includes(stickerId)) return;
    this.data.stickers = [...this.data.stickers, stickerId];
    this.persist();
  }

  setSession(sceneKey: string | null): void {
    this.data.session = {
      sceneKey,
      closedAt: new Date().toISOString(),
    };
    this.persist();
  }

  setQuestProgress(patch: Partial<QuestProgress>): void {
    this.data.questProgress = { ...this.data.questProgress, ...patch };
    this.persist();
  }

  completeQuest(questId: string): void {
    if (!this.data.completedQuests.includes(questId)) {
      this.data.completedQuests = [...this.data.completedQuests, questId];
    }
    this.data.questProgress = { currentQuestId: null, beatIndex: 0, scratch: {} };
    this.persist();
  }

  setSettings(patch: Partial<KidSettings>): void {
    this.data.settings = { ...this.data.settings, ...patch };
    this.persist();
  }

  reset(): void {
    this.data = { ...DEFAULT, updatedAt: new Date().toISOString() };
    this.persist();
    this.emit("save:reset");
  }

  // ── internal ──

  private load(): SaveData {
    let raw: string | null;
    try {
      raw = localStorage.getItem(SAVE_KEY);
    } catch {
      // localStorage may be denied (private mode, third-party cookies blocked)
      this.emit("save:fail", "denied" satisfies SaveFailReason);
      return cloneDefault();
    }
    if (!raw) return cloneDefault();
    let parsed: { version?: unknown };
    try {
      parsed = JSON.parse(raw) as { version?: unknown };
    } catch {
      this.emit("save:fail", "corrupted" satisfies SaveFailReason);
      return cloneDefault();
    }
    if (parsed.version !== 2) {
      // v1 → v2: wipe. Phase 0 has no real users; documented migration policy.
      return cloneDefault();
    }
    return mergeWithDefaults(parsed as Partial<SaveData>);
  }

  private persist(): void {
    this.data.updatedAt = new Date().toISOString();
    let serialized: string;
    try {
      serialized = JSON.stringify(this.data);
    } catch {
      this.emit("save:fail", "unknown" satisfies SaveFailReason);
      return;
    }
    try {
      localStorage.setItem(SAVE_KEY, serialized);
      this.emit("save:write");
    } catch (e) {
      const reason = isQuotaError(e) ? "quota" : "denied";
      this.emit("save:fail", reason satisfies SaveFailReason);
    }
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────

function cloneDefault(): SaveData {
  return JSON.parse(JSON.stringify(DEFAULT)) as SaveData;
}

function mergeWithDefaults(partial: Partial<SaveData>): SaveData {
  // Field-by-field merge so partial saves (e.g., a v2.0 save loaded by v2.1
  // code with a new field) get default values for the missing fields.
  return {
    version: 2,
    profileId: partial.profileId ?? DEFAULT.profileId,
    dialect: partial.dialect ?? DEFAULT.dialect,
    ageBand: partial.ageBand ?? DEFAULT.ageBand,
    level: partial.level ?? DEFAULT.level,
    hasanat: partial.hasanat ?? DEFAULT.hasanat,
    kid: partial.kid ?? { ...DEFAULT.kid },
    avatar: { ...DEFAULT.avatar, ...(partial.avatar ?? {}) },
    hoopoe: { ...DEFAULT.hoopoe, ...(partial.hoopoe ?? {}) },
    ownedItems: partial.ownedItems ?? [...DEFAULT.ownedItems],
    stickers: partial.stickers ?? [...DEFAULT.stickers],
    questProgress: { ...DEFAULT.questProgress, ...(partial.questProgress ?? {}) },
    completedQuests: partial.completedQuests ?? [...DEFAULT.completedQuests],
    session: { ...DEFAULT.session, ...(partial.session ?? {}) },
    settings: { ...DEFAULT.settings, ...(partial.settings ?? {}) },
    updatedAt: partial.updatedAt ?? new Date().toISOString(),
  };
}

function isQuotaError(e: unknown): boolean {
  // Browsers and jsdom differ on whether DOMException extends Error, so we
  // duck-type instead of using `instanceof Error`. Any object with a name or
  // message field counts.
  if (!e || typeof e !== "object") return false;
  const err = e as { name?: unknown; message?: unknown };
  return (
    err.name === "QuotaExceededError" ||
    err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    (typeof err.message === "string" && err.message.toLowerCase().includes("quota"))
  );
}
