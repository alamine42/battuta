# Battuta — TODOS

Living doc of design + product debt. Source of truth for "what we deferred and why."

When something is fixed, delete it (don't strikethrough — clutter).

---

## Design debt — missing screen mockups

The artist brief is incomplete without these. We have 3/10 screens with approved mockups; need ~7 more by the time their phase ships.

### Phase 1 (imminent — recommend shotgun next)

- [ ] **Parent gate + profile picker** — first 60 seconds of the app. Critical for parent trust + first impression. Block: needs `/design-shotgun` run.
- [ ] **Avatar editor** — full layered customization screen. Highest UI complexity in Phase 1. Block: needs `/design-shotgun` run.

### Phase 2

- [ ] **Sticker book** — passive collection mechanic. Empty state spec'd in SPEC §8 interaction matrix; needs visual mockup. Block: shotgun before Phase 2 starts.
- [ ] **Dialog overlay (mid-quest, with replay button visible)** — speech bubble + audio replay button + Tata mid-conversation. Reference variant E shows a speech bubble but not the replay affordance. Block: shotgun before Phase 2 starts.

### Phase 4

- [ ] **Mic listening UI** — pulsing mic icon + waveform + timeout fallback. Three states (idle, listening, processing). Block: shotgun before Phase 4 mic work.

### Phase 5

- [ ] **Postcard recording UI (kid-side)** — gold-rimmed mic recording for grandma. Block: shotgun before Phase 5.
- [ ] **Postcard recipient web page** — what grandma in Cairo sees when she opens the link. Sunset gradient + hoopoe + kid avatar + play button. Block: shotgun before Phase 5.

---

## Production fixes (carry-over from approved mockups)

These are issues spotted in the rendered mockups that real production needs to address:

- [ ] **Hasanat counter must render `12` not `هتن 12`** — Cairo Apartment kitchen render had Arabic-letter drift in the HUD. Lock the digit-only rendering in production.
- [ ] **UI overlays anchored top-left consistently** — Cairo Apartment rendered HUD top-right (drift). Top-left is canon per SPEC §7.
- [ ] **Speech bubble Arabic must be reviewed by a native speaker before art handoff** — multiple mockups had typos (هاللي, هاتلي variations, التفحة missing alif). Get every Arabic string in the game reviewed by a native speaker.
- [ ] **Locked-state treatment must be visibly clearer than tier-1 souk render** — current render has open doorways with subtle locks; production needs unmistakable closed-door + brass-padlock.
- [ ] **World map needs to clearly read as 4 discrete tap targets** — current souk render reads as a unified town, not four entry points. Add visual separation: pulsing chevron over each location, or a thin tile-glow on hover.

---

## Spec gaps (decisions still owed)

- [ ] **Lock the pixel font** — BBC Doos Arabic (preferred), MoarPixels Arabic, or custom commission. Decision needed before Phase 3. License + Arabic glyph + harakat coverage + Latin coverage all required.
- [ ] **Voice-actor casting source** — Voices.com / Fiverr / personal network. Decision needed before Phase 3.
- [ ] **Whisper provider benchmark** — OpenAI Whisper vs Groq Whisper vs Vosk. Run 50 kid-Arabic samples through each, pick by accuracy + cost. Decision needed before Phase 4.
- [ ] **Pricing tiers** — free trial length, family plan vs single kid plan, annual discount. Decision needed before Phase 6.
- [ ] **Curriculum advisor hire** — heritage-Arabic teacher for 4-hour content review pass. Decision needed before Phase 3 content production.
- [ ] **Trademark clearance for "Battuta"** — search trademarks in target markets (US, EU, MENA). Decision needed before any public marketing.

---

## Accessibility QA checkboxes (Phase 6 polish)

These need explicit testing in Phase 6, not assumption:

- [ ] WCAG AA contrast verified on every text/background pair in palette
- [ ] Color-blind alt-palette toggle works in settings
- [ ] All keyboard navigation paths function (game + parent dashboard)
- [ ] Screen-reader pass on parent dashboard (NVDA + VoiceOver + TalkBack)
- [ ] `prefers-reduced-motion` respected (hoopoe still, scene transitions instant)
- [ ] Captions toggle works (NPC speech bubbles persist longer + last-3-lines in pause menu)
- [ ] All tap targets ≥44pt
- [ ] RTL layout for Arabic dashboard verified across all sections

---

## Phase 1.5 — phone-portrait redesign

- [ ] **Vertical HUD layout** — hasanat top-center? Pause as bottom-right floating? Decide.
- [ ] **Pause menu as bottom sheet** — current 4-icon grid doesn't fit phone portrait. Bottom-sheet pattern.
- [ ] **Dialog overlay placement** — speech bubble might cover too much of canvas in portrait. Maybe move to top.
- [ ] **Avatar editor reflowed** — 2-column gets cramped on phone; needs vertical scrolling.

---

## Strategic / business

- [ ] **Family-postcard recipient flow** — what does grandma do if she wants to send a heart back? v1 has nothing; v1.5 might add lightweight reciprocity.
- [ ] **Sibling profile-switching UX** — multi-kid families. v1 is "one parent gate + one profile chosen at launch." v2 might add explicit profile-switching with per-profile parent gate.
- [ ] **Privacy policy + COPPA flows** — written in plain English, ~500 words, no dark patterns. Block before public launch.

---

## Tech debt (Phase 0 → Phase 1)

- [ ] Empty `src/ui/` and `src/i18n/` directories — populate as Phase 1 builds the parent gate and adds the first audio asset.
- [x] ~~Save schema versioning is at v1 — bump to v2 the first time we change the schema (kid name, avatar config).~~ Done in eng review: v2 schema covers Phases 1–6 with EventEmitter failure plumbing.
- [ ] LocalStorage-only save — Phase 0 default. Migrate to Supabase server save in Phase 6.
- [ ] **Audio manifest format** — defer until Phase 3 audio integration. Likely shape: `audio/manifest.json` with `{ [dialect]: { [sceneKey]: string[] (line refs) } }` so each scene declares its required audio. Lazy-load per scene + per dialect to keep bundle small. Track in `packages/schemas/src/audio.ts` when it lands.
- [ ] **CI/CD pipeline** — no `.github/workflows/` yet. Need: typecheck on PR, build verification, deploy to Cloudflare Pages or Vercel on merge to main. Add before public beta.
- [ ] **Quest authoring tooling** — schema is locked in `packages/schemas/`. Future: a tiny CLI script that walks `packages/content/quests/**/*.json` and validates against `parseQuest()` so authors get fast feedback.
- [ ] **Server proxy for /api/transcribe** — contract is locked in `packages/schemas/src/transcribe.ts`. Phase 4 implements the actual server (Supabase Edge Function or Vercel API route). Phase 1 client uses a mock that returns the schema-typed response.

---

## Performance debt (deferred from eng review)

- [ ] **Tilemap consolidation** — current `PlaceholderRoomScene` uses 220+ `Phaser.GameObjects.Rectangle` per room. Migrate to `Phaser.Tilemaps` (Tiled JSON loader) before Phase 2 ships the second real room. Built-in, batched draws, GPU-friendly.
- [ ] **Code-splitting per scene** — Vite supports `import("./SceneX")` for dynamic imports. Each location (House/Park/School/Beach) becomes a lazy-loaded chunk. Current bundle (~1.5MB Phaser + deps) already stresses the 4s cold-load budget on slow tablet wifi. Implement before Phase 3 audio lands.
- [ ] **Audio lazy-load per scene + dialect** — derives from the audio manifest (TODO above). When kid enters House, only download House audio for their selected dialect. Defer to Phase 3.
- [ ] **FPS budget benchmark** — before Phase 3, run `/benchmark` on a real iPad Air 2 (or simulator with throttled CPU). Lock in 60fps frame budget per scene. Capture baseline metrics.
