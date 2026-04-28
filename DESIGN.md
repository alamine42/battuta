# Battuta — Design System

The single source of truth for visual decisions. Read SPEC.md first for product context; this file is the rulebook for *how* it looks.

Seeded from the three approved mockups + the SPEC §5 visual direction. Iterate via `/design-consultation` when ready for a deeper component-library pass.

---

## 1. Tier & Logical Resolution

- **Tier**: Modern Indie Pixel — Stardew Valley / Eastward / Hyper Light Drifter zone. NOT 1991 SNES.
- **Logical render**: 480 × 270 px. Nearest-neighbor upscale to viewport (Phaser `pixelArt: true`, `Phaser.Scale.FIT`).
- **Tile size**: 24 × 24 px. Sprite size: 24×36 (kid character), 24×24 (small items).

Reference: `~/.gstack/projects/battuta/designs/world-map-20260427/variant-A-tier2.png`.

---

## 2. Color Tokens

Tokens are referenced by name everywhere — never raw hex in code outside this table. Implementation mirror: `apps/game/src/config/game.ts COLORS` and (when added) `apps/parent/styles/tokens.css`.

### Brand

| Token | Hex | Use |
|---|---|---|
| `brand-brass` | `#a87f3a` | Primary accent. HUD borders, hasanat coin, speech-bubble outline, dashboard headlines highlight. |
| `brand-cream` | `#f8f0d8` | Light surface. Speech-bubble fill, parchment areas, bedroom walls (lit). |
| `brand-deep-blue` | `#1d4a5e` | Deep accent. Window panes, banner backgrounds, schoolhouse roof, dashboard nav active state. |
| `brand-deep-red` | `#8a3232` | Warmth accent. Eid banner, sticker book cover, family-postcard heart. Use sparingly. |

### Zone palettes (in-game)

Each zone gets a focused palette. ~64 colors per zone allowed, but these are the anchors.

| Zone | Sky / BG | Mid surface | Deep accent | Vegetation | Cultural marker |
|---|---|---|---|---|---|
| Souk Square (overworld) | `#e8c890` warm sand | `#c8a878` cobblestone | `#5c3a1e` deep wood | `#6b8246` palm/jasmine | `#a87f3a` brass fountain |
| Bedroom (House) | `#d8a878` warm wall | `#a87f3a` wood furniture | `#5c3a1e` shelf shadow | `#6b8246` plant pot | `#8a3232` rug, banner |
| Kitchen (House) | `#c8a878` lit kitchen | `#5c3a1e` cabinetry | `#1d4a5e` window/dome | `#6b8246` herbs | `#a87f3a` brass dallah |
| Park | `#7ba3c8` sky | `#6b8246` grass | `#1d4a5e` shaded path | `#a8c878` jasmine bloom | `#a87f3a` swing brass |
| School | `#7ba3c8` sky | `#c8a878` schoolyard | `#5c3a1e` chalkboard frame | `#6b8246` courtyard tree | `#8a3232` school banner |
| Beach | `#7ba3c8` sky | `#c8a878` sand | `#1d4a5e` water deep | `#a87f3a` dhow sail | `#f8f0d8` foam |

### Semantic (parent dashboard, UI states)

| Token | Hex | Use |
|---|---|---|
| `surface-page` | `#f8f0d8` | Dashboard page background. NOT white. Warm. |
| `surface-card` | `#fffdf2` | Card backgrounds within dashboard (sparingly — see anti-slop rule below). |
| `surface-deep` | `#3a2718` | Modal/overlay scrim. 50% opacity over scenes. |
| `text-primary` | `#1a1208` | Body text dark. Not pure black. |
| `text-secondary` | `#5c3a1e` | Captions, metadata. |
| `text-on-brand` | `#f8f0d8` | Text on `brand-brass` or `brand-deep-red`. |
| `success` | `#6b8246` | Success states, words-learned counts. |
| `warning` | `#c87a32` | Time-cap warning, gentle alert. |
| `error` | `#8a3232` | Hard errors only (auth fail, save fail). Used sparingly. |
| `neutral-locked` | `#8a8070` | Locked locations, disabled controls. Desaturated. |

### Banned colors (Anti-AI-slop)

- ❌ Purple, violet, indigo gradients of any kind
- ❌ Blue → purple gradients ("dashboard purple", Stripe-clone)
- ❌ Pure black `#000000` for text
- ❌ Pure white `#ffffff` for backgrounds (use `surface-page`)
- ❌ Neon greens, hot pinks, electric blues

---

## 3. Typography

### Three faces, three jobs

| Role | Family | Weights | Where |
|---|---|---|---|
| **Pixel display** (in-game UI, NPC speech bubbles, hasanat counter) | Custom pixel font with full Arabic + Latin glyph coverage. Candidates: **BBC Doos Arabic** (preferred — has harakat support), MoarPixels Arabic, custom commission. Lock to one before Phase 3. | Single weight (regular). | All in-game text. |
| **Display sans** (parent dashboard headlines, brand wordmark, marketing site) | **Geist Sans** OR **Söhne** (preferred). Fall back: Inter. NEVER system-ui or -apple-system as primary. | 400, 500, 700 | Headlines, hero text, dashboard h1/h2. |
| **Body sans** (parent dashboard prose, settings, postcard recipient page) | Same as display sans (Geist/Söhne/Inter). | 400, 500 | All non-headline parent-side text. |

### Type scale (parent dashboard, 16px base)

| Token | Size | Line-height | Weight | Use |
|---|---|---|---|---|
| `text-h1` | 32px | 1.15 | 700 | Page titles ("Words this week") |
| `text-h2` | 24px | 1.2 | 600 | Section headers |
| `text-h3` | 18px | 1.3 | 600 | Card titles, settings group headers |
| `text-body` | 16px | 1.5 | 400 | Body paragraphs |
| `text-caption` | 14px | 1.4 | 400 | Metadata, timestamps |
| `text-small` | 13px | 1.4 | 500 | Legal, footnotes |

**Minimum body size**: 16px. **Minimum contrast**: WCAG AA (4.5:1 for body, 3:1 for large text).

### Type scale (in-game)

In-game text is pixel font. Sizing is in tile-units, not px:

| Token | Size in pixel font | Use |
|---|---|---|
| `pixel-display` | 16px logical (effectively 8px native) | NPC speech bubbles |
| `pixel-hud` | 12px logical | Hasanat counter, pause label |
| `pixel-tiny` | 8px logical | Sticker labels, easter-egg text |

Arabic pixel rendering: harakat (vowel marks) on by default for kids age 5–8; toggle in profile to hide for advanced 9+ readers.

---

## 4. Spacing Scale

8-point grid. Numbers below are pixels for parent dashboard / web; in-game uses tile-aligned multiples (24, 48, 72).

| Token | Value | Use |
|---|---|---|
| `space-1` | 4px | Hair-fine, e.g. icon-to-label gap |
| `space-2` | 8px | Tight pairs |
| `space-3` | 12px | Inline element padding |
| `space-4` | 16px | Default padding inside cards |
| `space-5` | 24px | Section internal spacing (also = 1 tile) |
| `space-6` | 32px | Section-to-section spacing |
| `space-7` | 48px | Major divisions (also = 2 tiles) |
| `space-8` | 72px | Hero spacing, top-of-page (also = 3 tiles) |

**Touch targets**: minimum **44 × 44 pt** for any tap target on mobile/tablet. Can use padding to hit the minimum even if the visual is smaller (e.g., 24px coin counter has 10px padding all sides → 44pt touch zone).

---

## 5. Motion

All durations in ms. Easings: prefer `cubic-bezier(.4, 0, .2, 1)` (Material standard) or `Phaser.Math.Easing.*`.

| Token | Duration | Easing | Use |
|---|---|---|---|
| `motion-instant` | 100 | linear | Layered avatar sprite rebuild |
| `motion-quick` | 200 | ease-out | Speech bubble appear, button press feedback |
| `motion-default` | 300 | ease-in-out | Scene transitions (fade between rooms / map) |
| `motion-walk-tile` | 250 | linear | Kid moves one tile (KID_TILES_PER_SEC = 4) |
| `motion-ripple` | 350 | cubic-out | Tap-to-walk ripple expand+fade |
| `motion-hoopoe-idle` | 800 (loop) | sine in-out | 8-frame head-bob + wing flutter |
| `motion-reward` | 1500 | custom | Quest-complete reward animation |
| `motion-page-flip` | 250 | ease-in-out | Sticker book page turn |

**Banned motion**: no parallax-on-scroll on the dashboard, no auto-playing carousels (anti-slop), no infinite-loop animations except the hoopoe idle and the fountain water.

---

## 6. Iconography & Distinctive Tokens

Two visual tokens carry the brand. Production specs locked here.

### Speech bubble (calligraphy cloud)

- Shape: asymmetric soft cloud (سحابة), inspired by Arabic calligraphy clouds and Eid paper-cuts. NOT the round/oval comic-book bubble.
- Tail: single short wisp toward speaker (3-5 px wide at base).
- Fill: `brand-cream`.
- Outline: 1-tile-thick (1px in pixel font scale) `brand-brass`.
- Padding: 4px on all sides minimum.
- Audio-replay button: 24×24 (with 10px hit-zone padding to reach 44pt) bottom-right of bubble. Brass-copper circle with a small replay-arrow icon.

### Hasanat coin (حسنات)

- Shape: round coin, slight 3/4 perspective.
- Color: `brand-brass` (NOT yellow gold — yellow gold reads as "any RPG").
- Embossed motif: small crescent-and-star (Eid hilal) in raised relief. Visible at 24px.
- Pixel-art highlight: 2px highlight top-left, 1px shadow bottom-right.
- Animations: rotates 360° on collection (300ms), pulses gently in HUD (1s loop, scale 1.0 → 1.05 → 1.0).

### Hoopoe (هدهد)

- Silhouette must be unmistakable: distinctive head crest + zebra-striped wings + long beak.
- Body color: warm orange (`#e07b3a`-adjacent) and white (`brand-cream`).
- Idle: 8-frame head-bob + occasional wing flutter (`motion-hoopoe-idle`).
- Hint mode: flies to point at the answer with a soft chirp; tail-feathers leave a 200ms trailing arc.

### Pause icon

- Two vertical bars (3 × 10 px) in a 18×18 circle. Brass on cream. Top-right corner of HUD, fixed position across all scenes.

### Hasanat counter

- Top-left HUD: brass coin + Arabic numeral count. Always visible.
- Counter rolls when value changes (300ms tween, no flip animation).

---

## 7. Component-level Rules

### Buttons (parent dashboard side)

- Primary: `brand-brass` background, `brand-cream` text, 8px corner radius, 16px×8px padding.
- Secondary: outlined, brass border, brass text, transparent background.
- Destructive: `error` color, `brand-cream` text.
- NEVER pill-shaped (border-radius > height/2). NEVER fully-rounded by default.
- NEVER shadow-only buttons (the "ghost button on busy background" pattern).

### Cards (use sparingly)

- Cards must EARN their existence. If the content can be a list item, use a list item.
- When used: `surface-card` background, no border, `brand-brass` 1px top-border-only accent. NO border-left colored stripe.
- Banned: 3-column feature grids of cards. Banned: cards with icon-in-pastel-circle.

### Lists (preferred over cards)

- 8px vertical padding, 16px horizontal padding, 1px `neutral-locked` divider between rows.
- Words-learned list (the most-viewed parent surface): each row is `[icon] [Arabic word] [English translation] [▶ play audio]`.

### Modals

- Always non-modal where possible. True modal only for: parent gate (one-time), avatar editor.
- Scrim: `surface-deep` at 50% opacity.
- Modal panel: `surface-card`, 12px radius, padded `space-6`.

### Mini-shelf (bedroom decor swap)

- 3-5 items in a horizontal scrolling row at the bottom of the screen. Tile-sized cells (24×24) with 8px gaps.
- Selected item highlights with `brand-brass` 2px outline.
- Auto-dismiss on outside-tap.

---

## 8. Anti-AI-Slop Guardrails

This section duplicates SPEC §7 for the design-system audience. Read both.

1. **Banned colors**: no purple/violet/indigo, no blue→purple gradients, no neon, no pure black/white.
2. **Banned layouts**: no 3-column-feature-grid, no centered-everything, no decorative gradient blobs, no wavy SVG dividers, no 3×2 feature card matrices.
3. **Banned typography**: no system-ui/-apple-system as primary, no all-caps headlines as default style.
4. **Banned components**: card-grids in dashboard, icon-in-pastel-circle bullets, decorative left-border stripes on cards.
5. **Banned copy**: "Welcome to...", "Unlock the power of...", "Your all-in-one solution...", emoji as design decoration.
6. **Banned motion**: parallax-on-scroll dashboards, auto-carousels, decorative-only animations.

If a contractor or LLM proposes any of the above, reject + cite this section.

---

## 9. Implementation References

| Layer | File / Path |
|---|---|
| Game config (colors, dimensions) | `apps/game/src/config/game.ts` |
| Game scenes | `apps/game/src/scenes/*.ts` |
| Game entities (kid, hoopoe) | `apps/game/src/entities/*.ts` |
| Parent dashboard tokens (when added) | `apps/parent/styles/tokens.css` |
| Approved mockup references | `~/.gstack/projects/battuta/designs/` |

When in doubt, the approved mockup wins over the spec; the spec wins over a contractor's instinct; this DESIGN.md wins over a one-off design call.

---

## 10. Versioning

This is v1 — seeded from the SPEC.md decisions and the three approved mockups (world-map A-tier2, bedroom B, kitchen E).

Bump to v2 when: full `/design-consultation` pass runs, component library is fleshed out, parent dashboard ships, additional dialect-specific palette swaps are needed.
