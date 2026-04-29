---
title: "Pure-TS schema package fails typecheck without 'DOM' in tsconfig lib"
category: "build-errors"
date: "2026-04-29"
tags: [typescript, tsconfig, zod, monorepo, bun-workspaces]
files:
  - packages/schemas/tsconfig.json
  - packages/schemas/src/transcribe.ts
---

# Pure-TS schema package fails typecheck without `"DOM"` in tsconfig lib

## Problem

`packages/schemas` is a pure-TS package — no Vite, no Phaser, just zod schemas shared between the game client and the API server. The initial `tsconfig.json` was minimal:

```json
{
  "compilerOptions": {
    "lib": ["ES2022"],
    ...
  }
}
```

Then a helper that builds a `FormData` body for the `/api/transcribe` endpoint failed typecheck:

```
src/transcribe.ts(90,10): error TS2304: Cannot find name 'Blob'.
src/transcribe.ts(92,4): error TS2304: Cannot find name 'FormData'.
src/transcribe.ts(95,18): error TS2304: Cannot find name 'FormData'.
```

The helper:

```typescript
export function buildTranscribeRequest(
  audio: Blob,           // ← Blob not in scope
  meta: TranscribeRequestMeta,
): FormData {            // ← FormData not in scope
  TranscribeRequestMetaSchema.parse(meta);
  const fd = new FormData();
  fd.append("audio", audio);
  fd.append("meta", JSON.stringify(meta));
  return fd;
}
```

## Root Cause

`Blob`, `FormData`, `File`, `URL`, `URLSearchParams`, `fetch`, etc. are part of the **DOM lib** in TypeScript's typings, NOT the ES lib. They're not browser-only at runtime (Node 18+ has them all globally) but TypeScript still treats their types as DOM-flagged.

A "pure" package that runs in both Node and browser still needs `"DOM"` in `lib` if it references any of those types. Otherwise typecheck fails even though runtime would be fine.

## Solution

Add `"DOM"` to the lib array:

```json
{
  "compilerOptions": {
    "lib": ["ES2022", "DOM"],
    ...
  }
}
```

For the schemas package this is correct: it references `Blob` and `FormData` deliberately because clients (browser AND node) will use these globals.

## Alternatives

If a package genuinely doesn't use any DOM types, leave `"DOM"` out — it pollutes the global namespace with hundreds of browser-specific types (`HTMLDivElement`, `Window`, etc.) that confuse autocomplete in non-DOM contexts.

For shared packages that occasionally need DOM types: `"lib": ["ES2022", "DOM"]` is fine. The downside is small.

For shared packages that should NEVER touch DOM: keep `"lib": ["ES2022"]` and use Node-specific imports if you need similar APIs (`import { Blob } from "node:buffer"`, `import { FormData } from "node:undici"` in older Node).

## Prevention

- [ ] When creating a new shared TS package, decide upfront: pure-Node, pure-browser, or universal. Set `lib` accordingly.
- [ ] If a typecheck error mentions a global like `Blob` / `FormData` / `URL` / `fetch`, suspect the lib config before reaching for `@types/...` packages.
- [ ] Document the `lib` choice in a comment at the top of `tsconfig.json` so future contributors don't strip `"DOM"` thinking it's browser-only.

## Related

- TypeScript handbook: "lib option" — lists what each lib contains.
- Node 18+ globals (`Blob`, `FormData`, `fetch`) are runtime-available but typed via the DOM lib in TypeScript.
