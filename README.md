# Battuta

Web-based Arabic-learning RPG for diaspora kids ages 5–12.

A cute top-down RPG (Stardew/Eastward modern-indie-pixel tier) where the kid travels through a pan-Arab world (House → Park → School → Beach), meets family-coded NPCs (grandma, aunt, school friend), and learns Arabic vocabulary and phrases by tapping objects, listening, and (at higher levels) speaking into the mic.

See `SPEC.md` for the full design spec.

## Repo layout

```
battuta/
├── SPEC.md             # design spec — start here
├── README.md           # this file
└── apps/
    └── game/           # Phaser 3 + TypeScript + Vite
```

Future additions per SPEC §15:
- `apps/parent/` — Next.js parent dashboard
- `packages/content/` — quest JSON, NPC scripts
- `packages/schemas/` — zod schemas for content validation
- `supabase/` — DB migrations + edge functions (transcribe, postcard-send)

## Run the game (Phase 0)

```bash
cd apps/game
bun install      # or `npm install`
bun run dev      # or `npm run dev`
```

Open the URL Vite prints (default `http://localhost:5173`).

What you'll see in Phase 0:
- A placeholder tile-based room
- A placeholder kid character (rectangles, no sprites yet)
- Top-left hasanat counter, top-right pause icon
- A pulsing yellow marker hinting "tap somewhere"
- Tap any floor tile → kid pathfinds and walks there
- Position persists across reloads (LocalStorage)

What is NOT in Phase 0 (per SPEC §16):
- Real art (Phase 3)
- NPCs / quests / dialog (Phase 2)
- Audio / mic (Phase 3–4)
- Multiple rooms (Phase 2)
- Hoopoe (Phase 2)
- Account / parent dashboard (Phase 6)

## Design references

The visual reference renders for the artist brief live at:
```
~/.gstack/projects/battuta/designs/
├── world-map-20260427/        # variant-A-tier2.png is the approved reference
├── bedroom-20260428/          # variant-B.png is the approved reference
└── house-kitchen-20260428/    # variant-E.png is the approved reference
```

## Design decisions index

Locked-in decisions live in `SPEC.md` §1. The big ones:
- Modern Indie Pixel tier (Stardew/Eastward zone) — 480×270 logical, 24×24 sprites, 64-color palette per zone
- Phaser 3 + TypeScript + Vite, web-first
- Tap-to-walk controls
- Audio-first, icon-first, near-zero text UI
- Native-speaker voice acting, MSA + Egyptian + Levantine dialects
- Cloud Whisper for mic transcription, audio discarded immediately (COPPA)
- No-wrong gentle-redirect failure model
- Freemium subscription
- Family postcards in v1
