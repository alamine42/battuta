// Save state-machine tests. Cover the full load/persist surface + every
// 'save:fail' reason code. Run with `bun run test`.
//
// Strategy: stub localStorage with a Map-backed mock so tests work in any
// environment (jsdom/happy-dom localStorage shapes vary). Failure modes
// are simulated by replacing setItem with a throwing function.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { SAVE_KEY } from "../config/game";
import { Save, type SaveFailReason } from "./Save";

function makeLocalStorageStub(throwOnSet?: () => never): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k: string) => store.get(k) ?? null,
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    removeItem: (k: string) => {
      store.delete(k);
    },
    setItem: (k: string, v: string) => {
      if (throwOnSet) throwOnSet();
      store.set(k, v);
    },
  };
}

describe("Save", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", makeLocalStorageStub());
  });

  // ── load() ─────────────────────────────────────────────────────────────

  describe("load()", () => {
    it("returns DEFAULT when no save exists", () => {
      const save = new Save();
      expect(save.kid).toEqual({ tx: 4, ty: 5 });
      expect(save.hasanat).toBe(12);
      expect(save.dialect).toBe("msa");
      expect(save.level).toBe(1);
      expect(save.ownedItems).toEqual(["outfit-starter"]);
      expect(save.stickers).toEqual(["hoopoe-welcome"]);
    });

    it("wipes a v1 save (Phase 0 had no real users)", () => {
      const v1Save = JSON.stringify({
        version: 1,
        kid: { tx: 99, ty: 99 },
        hasanat: 999,
      });
      localStorage.setItem(SAVE_KEY, v1Save);
      const save = new Save();
      // wiped → DEFAULT
      expect(save.kid).toEqual({ tx: 4, ty: 5 });
      expect(save.hasanat).toBe(12);
    });

    it("loads a v2 save", () => {
      const v2Save = JSON.stringify({
        version: 2,
        kid: { tx: 7, ty: 3 },
        hasanat: 42,
        dialect: "eg",
        level: 5,
      });
      localStorage.setItem(SAVE_KEY, v2Save);
      const save = new Save();
      expect(save.kid).toEqual({ tx: 7, ty: 3 });
      expect(save.hasanat).toBe(42);
      expect(save.dialect).toBe("eg");
      expect(save.level).toBe(5);
      // Missing fields fall back to defaults via mergeWithDefaults
      expect(save.avatar.skinTone).toBe(2);
    });

    it("falls back to DEFAULT on corrupted JSON", () => {
      // Construction emits 'save:fail' corrupted before subscribers exist —
      // verify the fallback STATE rather than the emit (which can't be
      // observed without monkey-patching the prototype emit).
      localStorage.setItem(SAVE_KEY, "{not valid json");
      const save = new Save();
      expect(save.kid).toEqual({ tx: 4, ty: 5 });
      expect(save.hasanat).toBe(12);
    });
  });

  // ── persist() ──────────────────────────────────────────────────────────

  describe("persist()", () => {
    it("emits 'save:write' on successful write", () => {
      const save = new Save();
      const writes: number[] = [];
      save.on("save:write", () => writes.push(1));
      save.setKid(1, 2);
      save.setHasanat(20);
      expect(writes.length).toBe(2);
    });

    it("emits 'save:fail' quota when QuotaExceededError thrown", () => {
      const save = new Save();
      const fails: SaveFailReason[] = [];
      save.on("save:fail", (r: SaveFailReason) => fails.push(r));
      vi.stubGlobal(
        "localStorage",
        makeLocalStorageStub(() => {
          throw new DOMException("quota", "QuotaExceededError");
        }),
      );
      save.setKid(1, 1);
      expect(fails).toEqual(["quota"]);
    });

    it("emits 'save:fail' denied on other DOMExceptions", () => {
      const save = new Save();
      const fails: SaveFailReason[] = [];
      save.on("save:fail", (r: SaveFailReason) => fails.push(r));
      vi.stubGlobal(
        "localStorage",
        makeLocalStorageStub(() => {
          throw new DOMException("denied", "SecurityError");
        }),
      );
      save.setKid(1, 1);
      expect(fails).toEqual(["denied"]);
    });
  });

  // ── setters ────────────────────────────────────────────────────────────

  describe("setters", () => {
    it("setKid persists position", () => {
      const save = new Save();
      save.setKid(10, 6);
      const reload = new Save();
      expect(reload.kid).toEqual({ tx: 10, ty: 6 });
    });

    it("addHasanat clamps to 0", () => {
      const save = new Save();
      save.addHasanat(-1000);
      expect(save.hasanat).toBe(0);
    });

    it("addOwnedItem dedupes", () => {
      const save = new Save();
      save.addOwnedItem("rug-blue");
      save.addOwnedItem("rug-blue");
      save.addOwnedItem("lamp-brass");
      expect(save.ownedItems).toContain("rug-blue");
      expect(save.ownedItems).toContain("lamp-brass");
      expect(save.ownedItems.filter((x) => x === "rug-blue")).toHaveLength(1);
    });

    it("addSticker dedupes", () => {
      const save = new Save();
      save.addSticker("apple");
      save.addSticker("apple");
      expect(save.stickers.filter((x) => x === "apple")).toHaveLength(1);
    });

    it("completeQuest moves currentQuestId to completedQuests and clears progress", () => {
      const save = new Save();
      save.setQuestProgress({ currentQuestId: "house.kitchen.fetch_apple", beatIndex: 2 });
      save.completeQuest("house.kitchen.fetch_apple");
      expect(save.questProgress.currentQuestId).toBeNull();
      expect(save.questProgress.beatIndex).toBe(0);
      expect(save.raw.completedQuests).toContain("house.kitchen.fetch_apple");
    });

    it("reset() restores DEFAULT and emits 'save:reset'", () => {
      const save = new Save();
      save.setKid(99, 99);
      save.addHasanat(100);
      const events: string[] = [];
      save.on("save:reset", () => events.push("reset"));
      save.reset();
      expect(events).toEqual(["reset"]);
      expect(save.kid).toEqual({ tx: 4, ty: 5 });
      expect(save.hasanat).toBe(12);
    });

    it("setSettings merges patches", () => {
      const save = new Save();
      save.setSettings({ micEnabled: false });
      expect(save.settings.micEnabled).toBe(false);
      // Other settings preserved
      expect(save.settings.captionsEnabled).toBe(false);
      save.setSettings({ captionsEnabled: true });
      expect(save.settings.micEnabled).toBe(false); // still false
      expect(save.settings.captionsEnabled).toBe(true);
    });
  });
});
