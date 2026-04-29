---
title: "Testing Phaser 3 game code in jsdom/happy-dom (Vitest)"
category: "test-failures"
date: "2026-04-29"
tags: [phaser, vitest, jsdom, happy-dom, localstorage, eventemitter, dom-exception]
files:
  - apps/game/src/systems/Save.ts
  - apps/game/src/systems/Save.test.ts
  - apps/game/vite.config.ts
  - apps/game/package.json
---

# Testing Phaser 3 game code in jsdom/happy-dom (Vitest)

Three separate problems hit on the same path: getting Vitest unit tests to run against `Save.ts`, which originally extended `Phaser.Events.EventEmitter` and used `localStorage` + `DOMException`.

## Problem

Setting up Vitest to test the Phaser game's `Save` class produced three cascading failures:

### Failure 1: Phaser canvas init crashes on import

```
TypeError: Cannot set properties of null (setting 'fillStyle')
 ❯ checkInverseAlpha node_modules/phaser/src/device/CanvasFeatures.js:74:23
 ❯ init                node_modules/phaser/src/device/CanvasFeatures.js:106:46
```

Importing `phaser` (any path, even just for `Phaser.Events.EventEmitter`) triggers `CanvasFeatures.init()`, which calls `getContext('2d')` and walks pixel data. happy-dom's canvas mock returns a partial 2D context where `fillStyle` lookups return `null` — Phaser dies on the assignment.

### Failure 2: localStorage.clear is not a function

```
TypeError: localStorage.clear is not a function
 ❯ src/systems/Save.test.ts:18:18
     17|   afterEach(() => {
     18|     localStorage.clear();
       |                  ^
```

Both happy-dom v15 and jsdom v25 ship a localStorage that's missing methods or has them defined as non-callable getters in some Vitest worker configurations. `localStorage.clear()` in `beforeEach`/`afterEach` blows up regardless of which environment you pick.

### Failure 3: DOMException doesn't extend Error

```typescript
// Save.ts
function isQuotaError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;  // ← always false in jsdom
  return e.name === "QuotaExceededError";
}
```

Tests that mock `localStorage.setItem` to throw `new DOMException("quota", "QuotaExceededError")` expect `'save:fail' quota` but receive `'save:fail' denied` because `isQuotaError` rejects the DOMException via the `instanceof Error` guard. jsdom's DOMException is NOT an Error subclass.

## Root Cause

1. **Phaser is a runtime library, not a pure-JS one.** Its top-level module performs DOM/canvas/WebGL feature detection on import. No test environment short of a real browser will let it initialize cleanly.

2. **happy-dom and jsdom localStorage implementations are inconsistent across Vitest worker contexts.** The Storage interface is partially polyfilled and prototype methods don't always survive the worker boundary.

3. **`DOMException` in jsdom is its own class** that implements the DOMException interface but is NOT a subclass of `Error` (per browser spec it should be — Chrome/Safari got this right around 2019, jsdom hasn't caught up).

## Solution

### Decouple from Phaser at the source

Phaser's `Phaser.Events.EventEmitter` is `eventemitter3` re-exported. Import it directly:

```typescript
// Save.ts — before
import Phaser from "phaser";
export class Save extends Phaser.Events.EventEmitter { ... }

// Save.ts — after
import EventEmitter from "eventemitter3";
export class Save extends EventEmitter { ... }
```

```bash
bun add eventemitter3 --workspace apps/game
```

Same behavior, zero coupling to the Phaser runtime. Save can now be imported into a Node test runner without booting any DOM.

### Stub localStorage with vi.stubGlobal

Don't trust the test environment's localStorage. Provide a Map-backed stub per test:

```typescript
function makeLocalStorageStub(throwOnSet?: () => never): Storage {
  const store = new Map<string, string>();
  return {
    get length() { return store.size; },
    clear: () => store.clear(),
    getItem: (k) => store.get(k) ?? null,
    key: (i) => Array.from(store.keys())[i] ?? null,
    removeItem: (k) => { store.delete(k); },
    setItem: (k, v) => { if (throwOnSet) throwOnSet(); store.set(k, v); },
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", makeLocalStorageStub());
});
```

Failure modes simulated by passing a `throwOnSet` callback:

```typescript
vi.stubGlobal("localStorage", makeLocalStorageStub(() => {
  throw new DOMException("quota", "QuotaExceededError");
}));
```

### Duck-type DOMException instead of `instanceof Error`

Drop the Error-only guard:

```typescript
function isQuotaError(e: unknown): boolean {
  // Browsers and jsdom differ on whether DOMException extends Error.
  // Duck-type instead of using instanceof Error.
  if (!e || typeof e !== "object") return false;
  const err = e as { name?: unknown; message?: unknown };
  return (
    err.name === "QuotaExceededError" ||
    err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    (typeof err.message === "string" && err.message.toLowerCase().includes("quota"))
  );
}
```

This is also more correct in real browsers — Firefox uses `NS_ERROR_DOM_QUOTA_REACHED`, Chrome uses `QuotaExceededError`, Safari uses both depending on context.

## Prevention

- [ ] **Keep Phaser-dependent code in scenes/entities only.** Pure logic (Save, Pathfinder, schemas) must NOT import Phaser. Tests for that logic should run in pure Node.
- [ ] **Default to stub-globals for Web APIs in tests.** Don't rely on jsdom/happy-dom shims for storage, fetch, or anything that crosses the worker boundary.
- [ ] **Duck-type browser-API errors.** `instanceof Error` and `instanceof DOMException` are unreliable across runtimes. Check `name`/`message` fields directly.
- [ ] **Add a lint rule** (when ESLint config lands) banning `import phaser` outside `src/scenes/` and `src/entities/`.

## Verification

After the fix, all 25 game tests pass + 21 schemas tests pass (`bun run test` in both packages). Total ~600ms.

## Related

- Phaser issue tracker on canvas-in-jsdom: many threads, no upstream fix planned
- Vitest v2.1 release notes mention happy-dom localStorage instability
- jsdom DOMException is implemented in `lib/jsdom/living/aborting/DOMException-impl.js` if you want to check its prototype chain
