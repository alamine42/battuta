# Battuta — Game Design Spec

> Working title: **Battuta** (after Ibn Battuta, the 14th-century Moroccan traveler whose journals carried a kid's-eye sense of wonder across the Arab world). The directory is already named this; I think it fits.

A web-based, top-down 2D RPG that teaches Arabic to diaspora kids ages 5–12. The kid creates a customizable character, walks through a pan-Arab world (House → Park → School → Beach and beyond), meets family-coded NPCs (grandma, aunt, school friend), and learns vocabulary and phrases through fetch quests, dialog puzzles, and minigames — initially by tapping objects, eventually by speaking Arabic into the mic.

The aesthetic is a love letter to *The Legend of Zelda: A Link to the Past* — pure SNES 16x16 pixel art, screen-by-screen rooms, chunky sprites, warm palettes — but with a non-violent core verb and Arab cultural specificity baked in.

---

## 1. Decisions Locked In

This spec captures the answers from the design interview. Anything not in this section is still open or assumed and flagged in §17.

| Area | Decision |
|---|---|
| Target age | 5–12, with adaptive difficulty |
| Difficulty entry point | Parent picks age/level at signup |
| Platform | Web (browser) first; tablet-optimized; later wrap for iOS/Android via Capacitor |
| Engine | Phaser 3 (TypeScript) |
| Dialect support | User picks at start: MSA, Egyptian, Levantine (initial three) |
| Voice acting | Native speakers per dialect, paid |
| Speech recognition | Cloud Whisper (OpenAI or Groq) |
| Mic role | Locked at low levels → optional mid-levels (prep) → required at high levels |
| Art style | Modern indie pixel art (Stardew/Eastward zone) — 24×24 sprite base, 480×270 logical render, 64-color palette per zone, top-down 3/4 view. Zelda 3 *vibe* (village hub, screen transitions, cute) but at a modern pixel-art tier, not literal 1991 SNES resolution. |
| World structure | Screen-by-screen rooms, classic Zelda transitions |
| Controls | Tap-to-walk (the kid taps a tile and the character walks there) |
| UI text | Audio-first, icon-first, near-zero text |
| Core gameplay | Mixed: fetch + dialog + minigames, varied per location |
| Failure model | No "wrong" — gentle redirect that turns mistakes into vocabulary |
| Avatar | Strong diversity slider (skin, hair, hijab option, eye color, outfit) |
| Session model | Open play, parent-set time cap |
| Cultural framing | Pan-Arab with regional easter eggs |
| Accounts | Parent email + multiple kid profiles |
| Monetization | Freemium subscription |
| Privacy | Strict — audio is transcribed and immediately discarded; explicit parent consent flow |
| Story | Episodic with light meta-arc (working: "plan the family Eid party") |
| Rewards | Bedroom decoration + outfits unlocked by points |
| Companion | Hoopoe (هدهد) — small, expressive, Quran-referenced bird, also serves as hint giver |
| Family sharing | "Send-to-grandma" audio postcards, **in v1** |

---

## 2. Audience & Pedagogical Stance

### Primary user: a diaspora kid, ages 5–12

- Low to zero formal Arabic instruction
- Hears Arabic at home, often passively
- Reads English (older kids) or doesn't read at all (5–7)
- Plays on a parent's tablet or a Chromebook

### Primary buyer: a diaspora parent

- Bilingual or Arabic-dominant
- Wants their kid to talk to *their* grandma in *their* dialect
- Distrustful of "kids' apps" that feel like ad farms
- Will pay for quality if voice acting and cultural specificity are real

### Pedagogical position

- **Comprehensible input first** (Krashen). Kid hears Arabic in clear visual context (point at apple, hear "تفاحة") long before producing it.
- **Output is graduated**. No mic at low levels. Optional in mid-levels. Required at high levels — by the time it's required, the kid has heard the word ~50 times.
- **No punishment for error**. Every miss is a chance to label the wrong thing in Arabic.
- **Family is the curriculum**. NPCs are aunts, grandmas, cousins — not strangers. The vocabulary kids learn first should be the vocabulary they'd use with family.
- **No "complete fluency in 10 days" claims.** This is a gateway drug, not a school replacement.

---

## 3. Linguistic Design

### Three dialect tracks, picked at first launch

| Track | Use case | Voice actors needed |
|---|---|---|
| **MSA (الفصحى)** | Universal default. Quran/news/school. Doesn't fully match how anyone's grandma talks. | 1 set |
| **Egyptian (مصري)** | Largest single dialect. Most Arab media. | 1 set |
| **Levantine (شامي)** | Largest diaspora dialect in US/Canada. | 1 set |

Future tracks (Gulf, Maghrebi, Iraqi) are deferred.

The dialect choice changes:
- All NPC voice lines (re-recorded per dialect)
- Some vocabulary (e.g., "now" — هلق Levantine, دلوقتي Egyptian, الآن MSA)
- A small amount of cultural framing in dialog

The dialect choice does **not** change:
- Written Arabic where it appears (always uses MSA orthography with optional harakat)
- World layout, art, or quest design

### Vocabulary progression (rough)

A spec-internal level is **not** the same as the kid's age. The level is a function of demonstrated mastery; age is just the entry-point guess.

| Level band | Focus | Example | Mic? |
|---|---|---|---|
| 1–3 | Concrete nouns: family, food, body, animals, colors | تفاحة, جدّة, قطّة | No |
| 4–6 | Verbs and simple commands: bring, give, find, eat | جيب, هات, كُل | No |
| 7–9 | Pronouns + 2-word phrases | هذي تفاحة, أعطيني الكرة | Optional |
| 10–12 | Adjectives, simple sentences, basic grammar (gender) | البنت الصغيرة, الكتاب الأحمر | Optional |
| 13–15 | Questions, polite phrases, social interaction | كيف حالك؟ ممكن من فضلك | Required |
| 16+ | Storytelling, narration, simple past tense | كنت في البيت | Required |

This is a working scaffold; a real Arabic curriculum consultant should review before content production.

---

## 4. Audio Architecture

### Voice acting

- **3 voice actors per dialect** at minimum: an adult woman (grandma/aunt/teacher), an adult man (uncle/shopkeeper), a child (school friend).
- Recording in clean studio. Files at 48kHz, delivered as .wav, encoded to .opus for delivery (~2x smaller than mp3 at same quality).
- **Lines are functional, not narrative**: a line is delivered as `{character_id}.{line_id}.{dialect}.opus`. Same line ID exists in all three dialects.
- Budget estimate: ~300 lines × 3 dialects = 900 takes for v1. ~$3K–6K total at indie rates.
- All lines reviewed by a native parent for naturalness (kids notice "voiceover Arabic" instantly).

### Mic flow (when enabled)

```
[kid taps mic]
     ↓
[Phaser shows "listening" visual; record up to 5 seconds]
     ↓
[stop on silence detection or button release]
     ↓
[POST audio blob → /api/transcribe (server function)]
     ↓
[server proxies to Groq Whisper or OpenAI Whisper, returns transcript]
     ↓
[client compares transcript to expected phrase via fuzzy match]
     ↓
[immediate audio discard (server) — no storage]
     ↓
[Phaser displays result: success / nice try / NPC reaction]
```

- Why a server proxy: hides the Whisper API key, lets us swap providers, lets us add caching/rate-limits.
- Why discard immediately: COPPA/GDPR-K — kids' biometrics shouldn't sit in our buckets.
- Fuzzy match approach: normalize both strings (strip diacritics, normalize ا/أ/إ, etc.), then Levenshtein with a generous threshold. Whisper Arabic transcriptions are noisy for kids; we don't want a perfect-pronunciation cliff.
- Feature flag: families can disable mic entirely in profile setup; kid then plays the tap-only path forever and just hits a soft cap at the high levels. (See §11.)

### Background audio

- One looping ambient track per location (souk hum, beach waves, schoolyard), composed in chiptune to match the SNES vibe.
- SFX: tap, walk, item-pickup, success-chime, hint-twinkle. ~20 SFX total for v1.
- All audio routes through Phaser's WebAudio and respects a user volume slider + a "mute" toggle in pause menu.

---

## 5. Visual Design

### Style guide

- **Tier**: modern indie pixel art (Stardew Valley / Eastward / Hyper Light Drifter zone). Zelda 3 *spirit* — village hub, screen-by-screen rooms, cute top-down RPG — but not literal SNES resolution.
- **Resolution**: native render at **480×270** logical pixels, upscaled with nearest-neighbor to fit window. Snaps to integer multiples (1x, 2x, 3x, 4x).
- **Tile size**: 24×24 px.
- **Sprite size**: 24×24 for small items, 24×32 for NPCs, 24×36 for the kid character.
- **Palette**: 64-color palettes per zone (one per indoor/park/beach/school) — looser than SNES but still curated for cohesion.
- **Animations**: 6-frame walk cycles, 4-frame idle breathe, 4-frame talk-mouth. Idle hoopoe has an 8-frame head-bob + wing-flutter.
- **Lighting**: subtle ambient lighting effects allowed (warm window glow, lantern flicker, dappled palm shadows). No full dynamic lighting — fake it with sprite layers.
- **Font**: pixel font with full Arabic glyph coverage (this matters — most retro pixel fonts are Latin-only). Has to render مَشْكُولة correctly with harakat. Candidates: BBC Doos Arabic, MoarPixels Arabic, or custom commission.

**Reference shots for the artist brief**: Stardew Valley's Pelican Town overworld, Eastward's town hub, Hyper Light Drifter's overworld at zoom-out. Avoid Sea of Stars / Octopath HD-2D — that tier is too premium-RPG for our 5-12 audience.

### Cultural specificity

A 16-color palette can't paint Damascus alleys photorealistically, but it *can* read as "this is from a real place":

- House zone: zellige-patterned floor tiles, mashrabiya windows, brass coffee pot (دلّة) on the stove.
- Park zone: jasmine vines, palm trees, an Arabic-script name sign on a kiosk.
- School zone: chalkboard with Arabic letters, abjad poster on wall.
- Beach zone: dhow boat sprite on horizon, watermelon-and-feta food cart.

Each zone has a small set of **regional swap sprites** that change with the kid's selected dialect:
- Choose Egyptian → kitchen has koshari pot, posters of Egyptian football
- Choose Levantine → kitchen has mansaf, jasmine prominent
- Choose MSA → balanced/generic but tasteful

This is the "easter eggs" the user picked — small, additive, not a full re-skin.

### Character customization

The avatar is built from layered sprites. Each layer has the same animation set; combinations are arbitrary.

| Layer | Options (v1) |
|---|---|
| Skin tone | 6 (light olive → deep brown) |
| Hair style | 8 (curly, straight, ponytail, hijab in 3 colors, kufi cap, bald/buzz) |
| Eye color | 4 (brown, hazel, green, blue) |
| Top | 6 (t-shirt, dishdasha, dress, hoodie, sweater, polo) |
| Bottom | 4 (pants, shorts, skirt, full-length) |
| Shoes | 3 (sneakers, sandals, dress shoes) |

Total combinatorial: ~14k looks. Sprite cost: 6×8×4×6×4×3 = manageable because we layer at render time, not pre-compose.

Outfits/accessories beyond the starter set are unlocked by points (see §10).

---

## 6. World & Navigation

### Macro structure

- **Overworld**: a small pan-Arab town visible as a single map screen. Locations are buildings on the map.
- **Locations** (v1): House, Park, School, Beach. Each is a separate "dungeon" of 3–6 connected rooms.
- **Bedroom**: the kid's home base, inside the House. Functions as both a quest location AND the customization/decoration hub.
- **Hoopoe roost**: the hoopoe sleeps on the kid's windowsill. First time you boot, you wake up here.

### Navigation between rooms

Classic Zelda 3: the kid walks toward an edge of a room, the screen scrolls/snaps to the adjacent room. Doors trigger the same transition with a fade.

Each room is a discrete Phaser scene. This is clean for engineering:
- One scene = one tilemap + one set of NPCs + one quest beat
- Scenes can be added without touching neighbors
- Audio loop swaps cleanly at scene boundaries

### Tap-to-walk control

Per the user's choice, the kid taps a tile and the character walks there. Implementation:

- Tap a tile → Phaser pathfinds (A*) on the room's collision grid → character walks tile by tile to destination
- Tap an interactive object → character walks to the nearest adjacent tile, then auto-interacts
- Tap an NPC → character walks adjacent, then auto-talks
- Tap a door/edge → character walks there, then transitions

Why this works for tap-to-walk in a Zelda game: most movement is goal-directed (talk to grandma, grab the apple), not freeform exploration. The "walking" is a transition between meaningful tiles. We give up the joy of running circles, but we gain a UI a 5yo can absolutely use one-handed.

Optional enhancement: a virtual D-pad shows up if the kid taps and holds (alternate input). Defer to v1.5.

---

## 7. UI / UX

### Audio-first principles

1. Every button has an icon AND a spoken label on tap-and-hold.
2. No screen requires reading any English to function. (Settings/parent screens excepted.)
3. Critical info is conveyed by sound + animation, not text.
4. Where text appears (e.g., NPC speech bubble), it shows Arabic letters with harakat for emerging readers, but the audio is what carries the meaning.

### Anti-AI-slop guardrails (firm, especially for the parent dashboard)

The kid-facing scenes are protected by cultural specificity (mashrabiya windows, zellige, Umm Kulthum portraits — none of this is in any other game). The parent dashboard is the high-risk surface. **No exceptions** on these:

1. **Banned colors**: no purple/violet/indigo gradient backgrounds anywhere. No blue-to-purple. No "dashboard purple" Stripe-clones. The dashboard uses the same warm palette as the game (browns, blues, copper, cream, deep red) — even if it feels less "professional," it feels like Battuta.
2. **Banned layouts**: no 3-column-feature-grid with icon-in-colored-circle (the #1 AI-tell). No centered-everything text alignment. No decorative gradient blobs. No floating-circle backgrounds. No "wavy SVG dividers."
3. **Banned typography**: no system-ui or -apple-system as a primary display font. Pick a real typeface (see §15 design system / DESIGN.md). The display font for parent-dashboard headlines should rhyme with the in-game pixel font but be a high-x-height humanist sans (e.g., Söhne, Inter, Geist) — never the OS default.
4. **Banned copy**: no "Welcome to [X]." No "Unlock the power of..." No "Your all-in-one solution for...". Parent dashboard headlines say what the page DOES ("This week, your kid learned 12 words") not what the brand IS.
5. **Banned components**: no card grids in the dashboard. No icon-in-pastel-circle bullet lists. No "feature card" 3x2 layouts. Cards earn their existence — most of the dashboard should be lists, charts, and a single hero metric.
6. **Banned aesthetics**: no purple/indigo accent. Battuta's accent is brass-copper (#a87f3a-ish). No emoji as design decoration. No rounded-pill-on-everything (specific shapes earn specific radii).

If a contractor or LLM proposes any of the above for the dashboard, reject and reference this section.

### Screens

Below are the screens we'll build. ASCII sketches are stand-ins; final art is pixel.

#### Boot / parent gate

```
+-----------------------------------+
|                                   |
|        [hoopoe sprite]            |
|                                   |
|        BATTUTA                    |
|                                   |
|   "Hi grown-up! Tap and hold      |
|    the answer for ten seconds."   |
|                                   |
|       [3]   [7]   [9]   [4]       |
|        ^ tap and hold the one     |
|          that matches the         |
|          spoken number            |
|                                   |
+-----------------------------------+
```

- Voice says "tap and hold seven" — kid can't pass; only adult-attention sustains 10s hold.
- After parent gate, parent sees the parent dashboard.

**Cadence**: gate fires on (a) app launch (first interaction with the tab), AND (b) any return-to-foreground after the tab has been backgrounded for >2 hours. This matches the Khan Kids / ABC Mouse convention and balances parent friction against sibling-safety. NOT every session boundary, NOT every profile switch — those would over-gate.

#### Profile picker (kid-facing)

Big avatar circles, tap one. No text needed.

#### World map

```
+------------ MAP -----------------+
|                                  |
|   [House]----[Park]              |
|     |          |                 |
|     |        [School]            |
|     |          |                 |
|   [Beach]------+                 |
|                                  |
|   [pause]                [bag]   |
+----------------------------------+
```

- Locations the kid has unlocked are colorful; locked ones are silhouettes.
- Hoopoe flies along the path the kid taps.
- The kid character icon shows current location.

#### House: kitchen (first-quest scene)

POV: **top-down 3/4** (matches world-map). Reference render: `~/.gstack/projects/battuta/designs/house-kitchen-20260428/variant-E.png`.

Aesthetic direction: **lived-in urban Arab apartment kitchen**, not a palace fantasy. Think a real diaspora grandma's place in Cairo or Beirut. Standard kitchen furniture (gas stove, fridge with magnets, sink, microwave, small kitchen table) overlaid with cultural markers: brass dallah on the gas stove, Arab spice rack with pixel-Arabic labels, fridge calendar with crescent-marked Eid days, Umm Kulthum (or similar) portrait on the wall, bag of pita on the counter.

**Window-view continuity device.** The kitchen window literally shows a glimpse of the world-map's Souk Square — same fountain, same date palm. The hoopoe perches on the window frame looking out at the souk. This is a reusable device across all House interiors: every House room has a window onto the same outside world. It's a cheap, elegant way to make the inside and outside feel like one place.

```
+--- House: kitchen (top-down) ----+
| [12]                       [||]  |
|                                  |
| [Umm K.]  [fridge]               |
|         [microwave]              |
|         [Tata @ stove]    [hoopoe→window→souk] |
|         [grape leaves]           |
|                                  |
|         [table: apple,banana,    |
|                  orange]         |
|                  [kid]           |
|                                  |
| [SPEECH: هاتلي التفاحة] [audio♪] |
|                                  |
| [stool]    [TV]                  |
+----------------------------------+
```

- Top-left: hasanat (golden coin + number).
- Top-right: pause icon.
- Speech bubble: **calligraphy-cloud shape** (سحابة) — soft asymmetric curves, a single short wisp tail toward the speaker, cream interior with a brass-copper outline (one tile thick). Arabic text + small audio-waveform icon. Distinctive to Battuta; not the comic-book oval used by every indie pixel game. **One affordance only: an audio-replay button in the bottom-right of the bubble** (24×24 px, ≥44pt touch target via padding). Tap to replay. No skip button — we want kids to listen, not bypass. No text-hide toggle — that's a global setting, not per-line.

- Hasanat coin: **embossed with a small crescent-and-star motif** (the Eid hilal). Brass-copper color (not generic gold). Distinct silhouette so it reads as Battuta's coin, not "any RPG coin." This is the game's signature visual token — it appears every quest reward, every postcard, every parent-dashboard "words learned" tile.
- No HP/hearts. No timer.
- Visual quest cue: Tata gestures toward the fruit bowl. Apple is the target; banana and orange are distractors.

**NPC archetype rule** (locks across all locations): adult NPCs are *modern lived-in Arab people*, not fantasy archetypes. Tata wears a floral hijab and an apron, not a jewel-encrusted ornate thobe. The aunt at the park, the teacher at school, and the shopkeeper follow the same register. Cultural specificity comes from setting + objects + speech, not costume drama.

#### Pause menu

Four big icons in fixed scan order (left → right, top → bottom for a kid's reading direction):

1. **Bedroom** (decorate) — top-left, primary reward surface, always reachable
2. **Bag** (sticker book + collected items) — top-right, secondary reward surface
3. **Map** (back to overworld) — bottom-left, "exit current quest gracefully"
4. **Settings** (volume, mic toggle, parent gate) — bottom-right, kid never tapped here yet

Settings opens the parent gate (10-second hold-the-correct-number) before exposing parent options. Kids tap-misfire on Settings shouldn't expose mic-disable or any destructive control.

The icons are ~72×72 px (well above the 44pt minimum touch target) with a 16px gap between them. The pause menu is a non-modal overlay that dims the scene 50% behind it.

#### Bedroom (rewards)

POV: **side-on dollhouse cutaway** (Animal Crossing / Stardew interior style). This intentionally differs from the world-map's top-down 3/4 view. The transition between map and bedroom is treated as a **scene-change cinematic** — convention used by countless games (Stardew, Pokémon, Dragon Quest), no UX harm.

Aesthetic direction: **modern diaspora kid's bedroom with integrated Arab cultural details**. Per `~/.gstack/projects/battuta/designs/bedroom-20260428/variant-B.png`. Real bunk-bed-and-desk feel, not a fantasy of an Arab home — Arabic alphabet poster on the wall, framed family photograph with grandparents in dishdasha and abaya, pixel-art map of the Arab world, Quran on the bookshelf, prayer mat folded in the corner, hijab on a closet hook, soccer ball on the floor. Cozy evening lighting.

```
+----------- BEDROOM (cutaway) ---------+
| [12]                            [||]  |
|                                       |
|  [abjad-poster] [family-pic] [map]   |
|                                       |
|  [bunk-bed]  [desk+lamp]   [closet]   |
|              [hoopoe]        [hijab]  |
|              [pinboard]               |
|     [kid]    [shelves+Quran]          |
|                                       |
|  [prayer-mat]  [ball]                 |
+---------------------------------------+
```

- Tap any visible furniture or accessory slot to swap from owned items.
- Tap the closet (or "edit me" icon) to enter avatar editor (skin/hair/outfit).
- Tap the pinboard to see collected sticker book.
- Hoopoe perches on the desk lamp — tap to interact / rename.
- Eid calendar on the desk (meta-arc surface).

**View-mode vs edit-mode**: bedroom is always *implicitly* in edit-mode. There's no explicit "edit room" button. Tapping a slot opens a non-modal mini-shelf overlay at the bottom of the screen (not full-screen) listing 3-5 owned items the kid can tap to apply. Outside taps dismiss the overlay. Avatar editor is the one full-screen sub-screen, reached by tapping the closet.

#### Parent dashboard (separate URL/route, NOT in the game)

Sections in priority order (top of page → bottom):

1. **Words learned this week** (the trust signal — what the parent paid for). Each word is tappable to hear how the kid heard it. Most prominent surface on the page.
2. **Time played this week** with daily breakdown chart.
3. **Family contacts** (postcard recipients) — adding/removing recipients is a frequent parent task.
4. **Settings** — daily time cap, mic toggle, dialect selection, profile management.
5. **Billing / subscription** — least-frequent task, bottom of page.
6. **Privacy / data** — data export, account deletion (legally required, low-frequency).

Putting Words Learned at the top is deliberate: the parent opens this dashboard to feel "is my kid actually learning?" Burying that under Settings/Billing damages the trust reservoir.

- Time-played-this-week
- Words learned (with audio playback so parent hears how the kid heard them)
- Daily time cap setting
- Mic toggle
- Subscription/billing
- Family-share contacts (for postcards)
- Privacy: data export, account deletion (GDPR/COPPA mandated)

### Reading-light strategy

For a 5-year-old non-reader:
- Buttons: pure icons + audio
- NPC speech: Arabic text + audio (kid hears it)
- Quest goals: never written; communicated through NPC speech + a visual hint (sparkle on the target object after a 10s pause)
- Numbers (coin count): Arabic numerals are universally readable, kids learn 0–9 quickly

For an 11-year-old:
- Same UI; they can ignore the audio when they don't need it
- They get "advanced mode" toggle in profile that hides harakat (more like adult Arabic)

### User journey — first 30 seconds

The most important 30 seconds of the entire game. If this lands, the kid keeps playing; if it stalls, parent uninstalls.

| Sec | Kid sees | Kid does | Kid feels |
|---|---|---|---|
| 0–3 | Battuta wordmark + hoopoe sprite + parent-gate prompt ("ask a grown-up to tap and hold the [seven]") | Hands tablet to parent | Curious, slight anticipation |
| 3–13 | Parent holds the correct number for 10s; visual fill-bar shows progress | Watches parent | Mild impatience but it's PARENT-impatience, not kid-impatience |
| 13–18 | Profile picker — 4 round avatar slots (or fewer for 1st boot); a "+" to add | Taps "+", picks dialect → starts avatar editor | Excited (their character!) |
| 18–25 | Avatar editor: skin tone, hair, outfit. Hoopoe gently chirps approval as choices are made | Picks 2-3 things | Ownership, "this is me" |
| 25–30 | "Save" → fade to bedroom. Hoopoe greets with "صباح الخير!" (regional dialect). Closet glows. | Looks around | Curiosity, "what is this place?" |

After 30s: the kid is in their bedroom with their character, hoopoe greeting them, and a glowing closet inviting them to interact. The first quest is one tap away (closet → outfit → leave room → world map → first quest). Total time from first tap to first quest beat: ~90s.

### User journey — returning kid (3+ days later)

| Sec | Kid sees | Why |
|---|---|---|
| 0–2 | Direct boot to bedroom, no parent gate (parent gate is a per-session-start gate; if they're already in their profile, they stay) | Friction reduction — parent gate is once-per-launch, not once-per-quest |
| 2–5 | Hoopoe greets with a time-aware line: "صباح الخير!" (morning), "مساء الخير!" (evening), or "وحشتني!" (I missed you, after 3+ days away) | Emotional ritual — hoopoe remembers the kid |
| 5–8 | A small "what's new" badge on the world map icon if a new quest unlocked since last session | Pull, not push — no annoying nag, just a quiet badge |
| 8+ | Kid goes wherever they want. No daily-quest nag, no streak guilt | Per the "open play, parent-set time cap" decision |

### User journey — time-cap warning

The parent has set a daily time cap (15/30/60 min). Game must end gracefully when cap is hit; cannot interrupt mid-quest.

| Trigger | What kid sees | Behavior |
|---|---|---|
| 2 minutes before cap | Hoopoe flies into view, says soft "تعبت يا حبيبي؟" (tired, dear?) — informational, not panicked. No timer shown. | Kid keeps playing |
| 30 seconds before cap | Hoopoe's tone shifts: "خلاص، نام دلوقتي" (let's rest now). Quest beat is allowed to complete. | Kid finishes current beat |
| Cap hit | At next scene boundary (room transition, quest end), fade to a "see you tomorrow" screen with hoopoe waving + a peaceful illustration. No close button — game ends cleanly. | Kid taps anywhere to acknowledge; tab can close |

No hard cutoffs mid-action. No red countdown timer. No "TIME'S UP" alerts. The cap is a gentle bedtime story, not an alarm.

### User journey — postcard recipient (grandma in Cairo)

This is the diaspora differentiator. The grandma's experience must feel personal, instant, and culturally warm.

| Step | Recipient sees |
|---|---|
| SMS / email arrives | "Your grandkid sent you something! Tap to listen." (English + recipient's preferred language; Arabic if known). Sender shown as the kid's avatar + name. |
| Opens link | A tiny web page (no app install). Background: warm sunset gradient + hoopoe. Center: kid's avatar (the actual layered sprite). Big play button below. Arabic phrase displayed under the avatar in pixel-readable text. |
| Plays audio | Audio plays once. Replay button reappears. A "send a heart back" button (taps a single ❤ that shows up in the kid's bedroom next session — see family-postcards spec). |
| 30 days | Recipient gets a one-time email reminder before the postcard expires (per parent privacy settings). |

No login required for recipient. No tracking pixel. No upsell to the recipient. This is a gift, not a marketing channel.

### Time-horizon design (Norman's three levels)

- **Visceral (5 seconds)**: The hoopoe + the warm color palette + the Arabic word floating in a speech bubble. Cute, safe, foreign-but-welcoming.
- **Behavioral (5 minutes)**: The session loop is paced by quest beats (~3 minutes each). One quest = a small win. The kid leaves a session feeling competent.
- **Reflective (5 years)**: The kid grows up with Battuta as the way they learned their first 200 words of Arabic. Years later, they remember the hoopoe. The bedroom they decorated. The grandma who got the postcards. The game is part of their identity narrative.

The 5-year level is not a thing we DESIGN literally — it's the lens we use when picking everything else. Would a kid look back fondly on this? If no, we cut it.

---

## 8. Core Gameplay Loop

### The session arc

```
[boot] → [parent gate] → [kid profile] → [world map]
                                              ↓
                                     [pick a location]
                                              ↓
                                     [enter, meet NPC]
                                              ↓
                                     [NPC issues quest in Arabic]
                                              ↓
                                     [explore room, find/do thing]
                                              ↓
                                     [return to NPC, complete]
                                              ↓
                                     [reward: points + sometimes a sticker]
                                              ↓
                                     [back to map] or [next quest]
                                              ↓
                                     [time cap warning] → [graceful end]
```

Average session: 10–15 minutes. A quest beat is 2–4 minutes.

### Quest types (mixed per location)

The user picked "mixed: fetch + dialog + minigames per location." Here are the genres, with one example per location.

#### Type A — Fetch

> *House, kitchen.* Grandma says "هاتلي التفاحة يا حبيبي" (bring me the apple, my love). Kid walks the room, sees an apple and a banana on the counter. Taps the apple, kid carries it back to grandma. Grandma says "شكرا!" Reward.

Engineering: a *target object* tag, an inventory slot, a return trigger. Easy to author in bulk via JSON quest files.

#### Type B — Dialog

> *Park.* The aunt says "أنا تعبانة، عاوزة أقعد" (I'm tired, I want to sit). Kid sees three things: a bench, a swing, a tree. Tap the bench → aunt sits, says thanks. Tap something else → aunt says "لا، البنش من فضلك" (no, the bench please) — a gentle redirect, vocabulary reinforced.

Engineering: a multi-choice handler that doesn't gate progression — the right answer just resolves faster.

#### Type C — Minigame

> *Beach.* The school friend says "نعمل قلعة!" (let's make a sandcastle!). Kid sees a beach plot and a row of buckets in different sizes (سغير, متوسط, كبير — small, medium, big). Friend asks for one size at a time. Kid taps the right bucket; sandcastle grows. Three rounds.

Engineering: a tiny self-contained scene per minigame. ~3 minigames per location at v1 launch.

#### Type D — Speak (mid/high level only)

> *School.* Teacher says "قول معي: السلام عليكم" (say with me: peace be upon you). Mic icon glows. Kid taps and holds, repeats. Whisper transcribes. Match → success ding. Soft match → "حلو! تاني مرة؟" (nice, one more time?). No match → teacher repeats, no mic prompt this time.

Engineering: see §4 for the mic flow. The expected phrase is the source of truth; transcription is fuzzy-matched to it.

### Quest density target

For v1 launch:
- 4 locations × 6 quest beats = 24 quest beats
- + ~3 minigames per location = 12 minigames
- + 5 mic-required encounters at high level (gated by avg level ≥ 13)

Total: ~40 distinct designed gameplay moments. Roughly 4–6 hours of play if a kid completes everything.

### Failure handling

The user's pick: gentle redirect. Spelled out:

- **Wrong tap**: NPC says the Arabic name of what was tapped, then re-asks. ("That's a banana — موزة. Can you find the تفاحة?")
- **Wrong dialog choice**: NPC says "no, [the right thing] please" — the kid hears the right word in context.
- **Wrong minigame answer**: visual softener (bucket is half-built, NPC encourages "try the [size]")
- **Mic miss**: NPC repeats the phrase clearly; kid can re-try or skip without penalty
- **Repeat fail (3+ misses on the same beat)**: hoopoe flies in and points at the answer with a soft "هنا!" — explicit hint, no shame

There are no fail screens, no game-overs, no hearts. The only currency that goes down is the parent-set time cap.

### Interaction state matrix (the rest of the surfaces)

Every surface that loads, fetches, or shows collected content needs spec'd states. Failure-mode is covered above for quest beats; this matrix covers everything else.

| Surface | Loading | Empty | Error | Success | Partial |
|---|---|---|---|---|---|
| **Boot / asset preload** | Hoopoe sprite + animated "..." dots, no progress bar (kids don't read percentages); 4s soft cap, then proceed with whatever loaded | n/a | "Something didn't load. Tap to try again." with hoopoe shrug-pose | Fade to parent gate | If audio for one dialect failed, fall back to MSA silently and log |
| **World map** | 200ms placeholder map fade-in | n/a (always has 4 locations even if 3 are silhouettes) | "Couldn't load map" + retry. Save state preserved | Fade-in transition (300ms) | If 1+ location asset failed, show that location as silhouette + a small "!" badge |
| **Inside a quest scene** | Scene fades in over 300ms with kid + NPC visible at end; no "loading" screen | n/a | If audio for a line fails: NPC mouths it silently + a small sad-hoopoe icon; kid can replay (pulls from CDN); text is the fallback | Quest beat completes → reward animation (1.5s) → return to scene | Mid-quest crash recovery: on next boot, resume to start of that beat |
| **Bedroom (first boot)** | n/a (happens after preload) | Bedroom shows bed + closet only; hoopoe says "صباح الخير!" + nudges toward the closet (avatar editor); a single starter outfit waits in the closet | n/a | n/a | n/a |
| **Bedroom (decor surfaces)** | n/a | A slot with no item shows a faint dashed outline + a "+" icon. Tap opens the empty mini-shelf with "Earn more from quests!" + a tap-to-go-to-map button | n/a | Item snaps into slot with a soft chime | n/a |
| **Sticker book** | Page-flip animation 250ms | First-time: a single welcome sticker (the hoopoe) on page 1; remaining slots are dashed silhouettes that show the sticker name in Arabic on long-press (pre-reveal hint) | n/a | n/a | Pages 2+ unlock as you fill page 1 (gated reveal — keeps "almost there" feeling) |
| **Avatar editor** | Layered sprite preview rebuilds in 100ms per layer change | First-time: pre-populated default that matches the parent's selected dialect's regional baseline (Egyptian → Cairo school-uniform style; Levantine → Damascus casual; MSA → neutral pan-Arab). Closet shows starter set; locked items show a small lock + the quest that unlocks them | n/a | "Save" only on close — auto-save on every change is too risky for a kid mashing options | n/a |
| **Mic recording** | "Listening..." pulsing mic icon + animated audio-waveform that responds to actual mic input (visual feedback even if Whisper is slow) | n/a | **Timeout (5s no speech)**: hoopoe says "ما سمعت! تاني؟" (didn't hear, again?) and re-shows the prompt. **Whisper API fail**: same fallback — NPC just repeats the line and proceeds tap-only for that beat. **Mic permission denied**: settings deep-link with a soft explanation ("Battuta uses the mic so you can practice speaking. Tap to allow.") | Match → success ding + 5 bonus hasanat | Soft match (Whisper transcript ≈ expected within Levenshtein threshold): smaller success chime + 3 bonus hasanat + "حلو! تاني مرة؟" |
| **Postcard recording** | Mic listening UI same as above but with a different border (gold-rimmed, "for grandma" framing) | First-time use shows a 2-frame tutorial: hoopoe demonstrates the recording, then it's the kid's turn | **Recording fail / mic denied**: same fallbacks as above. **Send fail**: postcard saved as draft locally; banner says "We'll send when you're back online" | Confetti + a hoopoe-flying animation; banner: "Sent to [recipient name]!" | n/a |
| **Family contacts (parent dashboard)** | Skeleton rows | "No family yet. Add a grandma or aunt to get started." + a primary "Add a family member" button; supporting illustration of two stylized phones connected by a hoopoe-trail | "Couldn't load contacts. [Retry]" | n/a | n/a |
| **Save / progress** | Invisible (auto-save is silent unless it fails) | n/a | **LocalStorage full / quota exceeded**: small toast "Couldn't save. Sync to cloud?" with cloud-save sign-up CTA. Game continues in-memory until kid closes tab | Invisible (the game just remembers next session) | If cloud sync mid-session fails, in-memory is canonical until next successful sync |
| **Dialect download (lazy)** | Tiny progress bar in pause menu the first time a dialect is selected | n/a | Fall back to MSA + a "We'll fetch [dialect] when you're back online" banner; auto-retry next session | Silent | n/a |
| **Network offline** | n/a | n/a | Top banner (parent-readable, English): "You're offline — Battuta still works! Postcards and new dialects will sync when you're back." Game continues with locally-cached content. Mic falls back to skip-or-tap-only | n/a | Some quests cached locally (active dialect + first 2 locations); others need network |

## 9. Difficulty & Progression

### Level structure

A profile has a `level` integer (1–N, starting at the parent-picked entry point). Entry points:

| Parent picks | Starting level |
|---|---|
| "Just starting / age 4–5" | 1 |
| "Knows some words / age 6–8" | 4 |
| "Conversational / age 9–12" | 8 |

These are guesses; the game adjusts up/down based on observed performance. Level changes don't unlock locations directly — they unlock *quest variants* and unlock the mic feature at level 7+.

### Adaptive logic

After every quest:
- Track success rate (correct first taps / total taps), avg time per beat, mic match score (when applicable).
- If success > 90% on 3 consecutive quests → bump level by 1.
- If success < 50% on 2 consecutive quests → drop level by 1 (silently).
- Level changes are invisible to the kid but visible to the parent in the dashboard.

This is a v1 simple model; we can introduce spaced repetition (Leitner box per word) in v1.5.

### Location unlock

- House is unlocked from start (begins in bedroom).
- Park unlocks after 3 House quests.
- School unlocks after 3 Park quests.
- Beach unlocks after 3 School quests.
- This gating is for narrative shaping; it's lenient. Parents can manually unlock all in dashboard if they want.

### Level → mic gating

| Level | Mic state |
|---|---|
| 1–6 | Mic feature hidden entirely |
| 7–12 | Mic appears as optional bonus on dialog/fetch quests; tap-only path always works |
| 13+ | Some quests require mic to advance; tap-only kid still has access to ~70% of content |

Parents who disable mic in profile setup get the cap at level 12 (visible in dashboard) and an explanation.

---

## 10. Reward Economy

### Currency

- **Hasanat (حسنات)** — golden coins. Earned per quest. Plays a chime when collected. (The word means "good deeds" — culturally resonant, and avoids "gold/coins" militaristic feel.)
- Earning rates: easy quest = 5, hard quest = 15, mic bonus = +5, "perfect" quest = +5.

### What hasanat buy

- **Avatar items** — outfits, accessories beyond the starter set.
- **Bedroom decor** — posters, rugs, toys, lamps. Bedroom is the visible accumulation of progress.
- **Hoopoe skins** — different looks for the companion (red hoopoe, white hoopoe, fancy crested hoopoe).
- **Stickers** — collected on a sticker page; some are unlocked by hasanat, some by completing specific quest sets.

There is **no** energy/lives currency. There is no pay-to-skip. There is no dual-currency premium store.

### Sticker book

A passive collection mechanic, sits in the bag. Each NPC met, food eaten, place visited becomes a sticker. Tapping a sticker plays its Arabic word. Doubles as a vocabulary review tool.

---

## 11. Companion: the Hoopoe

The hoopoe (هدهد) is a small bird companion who:

- Lives on the kid's windowsill; appears in the bedroom on first boot.
- Follows the kid in the overworld and through every location, perched on shoulder/lampposts/fences.
- Is a hint-giver. After a soft timeout (10s of inactivity), or after 3 wrong answers, hoopoe flies to the right answer with a soft chirp and "هنا!"
- Has a name the kid picks at first boot. Default options: هدهود, نور, قمر, نجم. Kid can rename in bedroom.
- Skins/colors are unlocked with hasanat. Default is the classic warm-orange-with-crest hoopoe.
- Says short Arabic words occasionally — "صباح الخير!" in the morning, "تصبح على خير!" if play ends late.

Why hoopoe specifically: small, distinctive silhouette (crest), already culturally weighted (the Quran's Surah An-Naml has the hoopoe as Solomon's messenger), and rarely featured in Western media → cultural ownership.

---

## 12. Story & Narrative

### Episodic with light meta-arc

The user picked this. Working framing:

> The kid is helping their family plan an Eid party. Each location's quests gather something for it: grandma's recipes (House), party games (Park), invitations to friends (School), seashells for decoration (Beach). The meta-arc is loose — completing it isn't required, but unlocks an "Eid party day" finale where all NPCs gather.

This framing:
- Gives a reason to visit every location
- Has cultural meaning (Eid is universal across Arab cultures)
- Is loose enough to skip — episodic kids never feel they "missed" the main story
- Is repeatable — finish, then "plan a Ramadan iftar" arc, then a "summer trip" arc

### Recurring NPCs

| NPC | Location | Role |
|---|---|---|
| Tata (تيتا — grandma) | House kitchen | Cooks, teaches food/family vocabulary |
| Khalto/Amto (خالتو / عمتو — aunt) | Park | Walks, teaches verbs and outdoor vocabulary |
| Ustaz/Ustaza (أستاذ/ة — teacher) | School | Teaches letters, numbers, polite phrases |
| Hassan / Layla (school friend) | School | Peer, teaches conversational dialect |
| Khaled the shopkeeper | Souk corner of overworld | Vocabulary for items, transactions |
| Hoopoe | Everywhere | Companion / hint giver |

The kid's parents are referenced but not depicted as playable NPCs (they're "off doing parent stuff") — keeps the world child-centric.

### Voice/personality consistency

Each NPC has a "voice bible" — 5-10 lines of personality direction given to voice actors:
- Tata: warm, slow-paced, often calls kid حبيبي / حبيبتي
- Aunt: energetic, chatty, uses lots of dialect markers
- Teacher: clear MSA pronunciation, encouraging, slightly formal
- School friend: peer-energy, fast, uses kid slang

---

## 13. Family Sharing — Send-to-Grandma Postcards

The user committed to v1, against my recommendation to defer. Here's how to ship it without blowing scope:

### Flow

1. Kid completes a quest beat.
2. ~30% of the time (random + tutorialized once), a "send to family?" prompt appears with hoopoe.
3. Kid taps mic, repeats one line they just learned ("احبك يا تيتا" — "I love you, grandma").
4. App auto-appends the kid's avatar and a short caption.
5. Goes to a family contact list (parent-managed in dashboard).
6. Family member gets a link via SMS/WhatsApp/email; opens to a tiny web page with avatar, audio playback, and the Arabic text.

### Implementation notes

- This is the **only** path where audio is stored — explicit per-postcard parent approval, with a clear "this audio will be saved" notice. Different consent regime than the Whisper transcription path.
- Storage: short-lived (90 days default, parent-configurable to 7/30/365). Audio in object storage, encrypted at rest.
- Family contacts are NOT public; only invited parents can be on a postcard list.
- No social network, no public feed, no comments. This is one-directional, parent-mediated.
- Phone numbers and emails are PII; encrypt + minimal collection.

### Why this is hard

- **Moderation**: a 7yo could record anything. Parent has a "review before send" toggle (default ON for ages 5–8, OFF for 9+).
- **Delivery**: SMS costs money (Twilio), and WhatsApp Business API has approval friction. v1 should ship with email + a shareable link first; add SMS in v1.1.
- **Account model**: family members aren't full users; they're recipients via a tokenized link.
- **COPPA**: storing kid audio + family names triggers harder compliance than the rest of the app. Privacy policy must be specific.

### Scope discipline

If at any point this feature is delaying core quest content past target ship, **cut it to v1.1**. The core game stands without it.

---

## 14. Privacy, Consent, and Data

### Position

Battuta is a kids' app. Privacy is a marketing feature, not just a compliance task.

### COPPA / GDPR-K compliance checklist

- [x] Verifiable parental consent before any data collection (parent gate during onboarding asks for email + acknowledgment).
- [x] Data minimization: collect kid name (could be a nickname), avatar config, progress, dialect choice. Nothing else.
- [x] No third-party advertising SDKs. Ever.
- [x] No analytics that fingerprint the device. Use first-party event logging only.
- [x] No social features in v1 beyond parent-mediated postcards.
- [x] Parent dashboard: data export (JSON download of kid's profile + progress), full account deletion (irreversible).
- [x] Mic audio: not stored except for postcards (separate consent).
- [x] Privacy policy in plain English, ~500 words, no dark patterns.

### Whisper data flow

- POST to Whisper provider with audio.
- Provider returns transcript.
- We store the transcript only if the kid is doing a postcard recording (where they explicitly chose to send it). Otherwise we discard transcript and audio.
- Provider's terms must allow this use; OpenAI Whisper API does not store audio per their TOS, Groq same. Confirm at vendor selection time.

---

## 15. Technical Architecture

### Stack

| Layer | Choice |
|---|---|
| Game runtime | Phaser 3 + TypeScript |
| Tilemap authoring | Tiled (.tmx → JSON) |
| Bundler | Vite |
| Hosting | Cloudflare Pages or Vercel (static + edge functions) |
| Backend (accounts, billing, postcards) | Supabase (Postgres, Auth, Storage, Edge Functions) |
| Speech | Groq Whisper (cheaper) or OpenAI Whisper (better quality) — pick after benchmark |
| Payments | Stripe (web subscriptions) |
| Email | Resend or Postmark |
| Analytics | PostHog (self-hosted or EU instance for GDPR) |

### File layout (proposed)

```
battuta/
  apps/
    game/                        # Phaser app
      src/
        scenes/                  # one Phaser.Scene per room/screen
        systems/                 # quest engine, dialog runner, mic, save
        entities/                # Kid, NPC, Hoopoe, Item classes
        ui/                      # HUD, menus, parent gate
        i18n/                    # Arabic strings + audio refs
        config/                  # tunables (speeds, drop rates)
      public/
        sprites/
        audio/
          msa/
          eg/
          shami/
        tilemaps/
    parent/                      # Next.js parent dashboard
  packages/
    content/                     # quest JSON, NPC scripts, dialog trees
    schemas/                     # zod schemas for content validation
  supabase/
    migrations/
    functions/                   # transcribe, postcard-send
  SPEC.md                        # this file
```

### Content as data

Quests, dialog, NPC lines are JSON, not code. A quest looks like:

```json
{
  "id": "house.kitchen.fetch_apple",
  "level": 1,
  "location": "house.kitchen",
  "type": "fetch",
  "npc": "tata",
  "intro_line": "tata.greet_morning.{dialect}",
  "ask_line": "tata.bring_me_apple.{dialect}",
  "target_object": "apple",
  "distractor_objects": ["banana", "orange"],
  "thank_line": "tata.thanks_apple.{dialect}",
  "wrong_tap_line": "tata.label_object.{dialect}",
  "reward_hasanat": 5,
  "reward_sticker": "apple"
}
```

This means:
- A non-engineer (e.g., an Arabic curriculum consultant) can author content.
- Localization (more dialects) is mostly recording new audio + adding to the audio map.

**Schema is locked in `packages/schemas/src/quest.ts`** as a zod discriminated union. Every quest JSON file MUST validate; CI gates malformed quests; runtime call to `parseQuest()` enforces cross-field invariants (exactly-one-correct dialog choice, minigame round options must include correct id, etc.). Audio line refs are `{character}.{line_id}` and resolve at runtime via `resolveLineRef(ref, dialect)` to `audio/{dialect}/{ref}.opus`.

**Mic API contract is locked in `packages/schemas/src/transcribe.ts`** for the `/api/transcribe` endpoint. Phase 1 client and Phase 4 server build to the same wire format: multipart audio + JSON metadata, response includes transcript + confidence + provider. Errors are typed (`audio_too_long`, `rate_limited`, etc.). Defines a recommended 8s client timeout and a 5s recording cap (matches SPEC §8 mic timeout fallback).
- We can run static analysis on quests (every referenced line ID exists, every object is in the tilemap, etc.) before deploy.

### Saving

- All progress saved server-side per kid profile. Local cache for offline grace period.
- Save on every quest completion + every level change + every coin earn (debounced).
- Sync conflict resolution: server is canonical; on conflict, take server version (kid won't notice).

### Performance budget

- Cold load ≤ 4s on a 5-year-old iPad over wifi.
- Lazy-load audio per scene (only the dialect's lines for the current location).
- Sprite atlases per zone, not global, to keep initial bundle ~3MB.
- Target 60fps on iPad Air 2 (2014) — yes, parents hand down old hardware.

---

## 16. Recommended Build Phases

This is the order I'd actually build it, given the user's stated priorities (interface > mechanics > story).

### Phase 0 — Foundations (1–2 weeks)

- Phaser 3 + Vite + TypeScript skeleton
- Tile-based scene with placeholder kid sprite walking via tap-to-walk
- One placeholder room
- Save/load to LocalStorage (Supabase comes later)

### Phase 1 — Interface vertical slice (3–4 weeks)

This is where the user wanted upfront focus.

- Parent gate
- Profile picker
- Avatar editor (full layered system)
- World map screen
- Bedroom screen
- Pause menu
- Audio-first interaction model (every button has audio label)
- One real NPC (Tata) with placeholder voice (AI for now)
- One real fetch quest end to end

The deliverable is a real-feeling demo with one playable quest, no real content.

### Phase 2 — Mechanics depth (4–6 weeks)

- All four locations with placeholder rooms
- Quest engine (JSON-driven)
- Dialog quests + minigames
- Failure model (gentle redirect)
- Reward economy (hasanat, decor, stickers)
- Hoopoe (companion + hint giver)
- Difficulty/level adaptation logic

### Phase 3 — Audio + content (4–6 weeks)

- Voice actor casting + recording for MSA dialect first
- Real audio replacement throughout
- Quest content for level 1–6 (about 15 quests)
- Sound design pass (ambient, SFX)

### Phase 4 — Mic + high-level content (3–4 weeks)

- Whisper integration via server proxy
- Mic UI + flow
- Level 7+ content with mic
- Re-record critical lines for Egyptian + Levantine

### Phase 5 — Family postcards (2–3 weeks)

- Family contacts in parent dashboard
- Postcard recording + send flow
- Tokenized share links + recipient web page
- Email delivery (Resend)

### Phase 6 — Parent dashboard, billing, polish (3–4 weeks)

- Parent dashboard (progress, settings, billing)
- Stripe subscription
- Free vs paid content gating
- Privacy policy, COPPA flows

### Phase 7 — Beta + launch

- Closed beta with 20 diaspora families
- Iterate based on observed kid behavior
- Public launch

**Total: ~5–6 months solo, ~3–4 months with a part-time pixel artist and a part-time backend engineer.** Voice acting can run in parallel from Phase 3.

---

## 16.5 Responsive & Accessibility

### Target devices (priority order)

1. **iPad / Android tablets** (10–13", landscape and portrait). Primary device; design starts here.
2. **Chromebooks** (laptop-class screens, 11–14", landscape only). Must be fully usable; cursor + keyboard.
3. **Phones** (5–7", portrait primary). Supported but not optimized in v1 — see breakpoint table.
4. **Desktop** (laptop/desktop, mouse + keyboard). Supported as a side benefit; not the design focus.

### Breakpoints

The 480×270 logical canvas scales to fit. Layout breaks happen at the **container** level (parent dashboard, marketing site), not inside the game canvas (which is one fixed-aspect frame).

| Range | Form factor | Game canvas | Parent dashboard | Notes |
|---|---|---|---|---|
| < 600px | Phone portrait | **v1**: letterboxed; black bars top/bottom; canvas centered. **v1.5**: full portrait HUD redesign (vertical layout, bottom-sheet pause menu, reflowed UI overlays) | Single-column, large touch targets | v1 supported but cramped; v1.5 makes it native |
| 600–959px | Tablet portrait, large phone landscape | Full-bleed canvas | Single-column with bigger gutters | The default tablet experience |
| 960–1279px | Tablet landscape, small laptop | Full-bleed, comfortable | Two-column where appropriate | Sweet spot |
| ≥ 1280px | Laptop / desktop | Centered with surface-deep matte around it (max 1280×720 effective) | Two-column, max content width 1080px | Don't fullscreen the game on a 27" monitor — it looks weird |

**Hard rule**: the game NEVER scales above 4× nearest-neighbor (480 → 1920 max). On 5K+ displays, it stays at 1920×1080 max with a `surface-deep` matte. Otherwise pixels look smeared.

### Touch targets

- **Minimum 44 × 44 pt** (Apple HIG / Google Material standard) for any tap-target.
- Visual element can be smaller (e.g., 24×24 hasanat coin), but the **hit zone** must be ≥44pt — implement via padding or `Phaser.Geom.Rectangle` hit area.
- Pause menu icons: 72×72 visual + 8px gap → no overlap risk.
- Speech-bubble replay button: 24px visual + 10px hit-zone padding = 44pt.

### Accessibility (WCAG 2.2 AA target)

#### Color & contrast

- Text on background: **4.5:1 minimum** for body, 3:1 for ≥18pt large text.
- Verify the brand-brass on cream pair, brand-cream on deep-blue pair, and all text-on-color pairs meet this. Failing pairs get a darker variant added to the palette.
- **Never convey state through color alone** — every color-coded state pairs with an icon or shape. Locked locations: silhouette + small lock icon (not just gray). Errors: red + an `!` icon.
- **Color-blind alt palette**: a settings toggle that swaps the brass-vs-deep-blue pair (which can confuse deuteranopia) for a brass-vs-deep-red pair.

#### Keyboard navigation

- **Game**: arrow keys move the kid (in addition to tap-to-walk). Enter/Space = tap on focused tile or NPC. Escape = pause menu. Tab cycles through interactive elements with a visible focus ring.
- **Parent dashboard**: full keyboard navigation. Tab order matches visual reading order. Skip-to-content link at the top. Visible focus rings (2px brand-brass outline, 2px offset) on every focusable element.

#### Screen readers

- **Parent dashboard**: full ARIA. Landmarks (`<nav>`, `<main>`, `<aside>`), section headings, alt text on every chart/illustration. Words-learned list announces "[Arabic word], [English translation], play audio button" per row.
- **Game (kid-side)**: limited. The game is fundamentally pictorial + audio. Announce major scene transitions ("you are in the kitchen, with grandma") via an `aria-live="polite"` region for the rare adult who's helping a blind kid. Full screen-reader play is out of scope for v1.

#### Motion

- **Respect `prefers-reduced-motion`**. When set: disable hoopoe idle animation, simplify scene transitions to instant fade, suppress the reward-animation flourish, keep functional motion (kid walking) at full speed.
- No flashing >3 Hz anywhere. No strobe effects.
- Camera shake is OFF by default (causes motion sickness in some kids); can be re-enabled in settings.

#### Audio

- **Captions toggle** in settings: when on, NPC speech bubbles stay on screen 1.5× longer and pause menu shows the last 3 lines as text.
- **Mic alternative**: every mic-required encounter has a tap-only fallback path (per SPEC §11). A kid with no mic, mic disabled, or non-speech disability still progresses.

#### RTL support

- **Parent dashboard**: full RTL layout when Arabic is the dashboard language. Mirror nav, charts read right-to-left, numbers stay LTR (Arabic numerals work both ways).
- **In-game UI overlays**: hasanat counter stays top-left even in RTL mode (it's a number, not text). Pause stays top-right. Speech bubbles flow RTL when Arabic.

### Tested as part of QA

Each of the above is a checkbox in the Phase 6 polish QA pass. Without explicit tests, "we support X" is wishful thinking.

---

## 17. Open Questions / Deferred Decisions

These are flagged because they'll need decisions before the relevant phase, but didn't need to be locked in for the spec:

1. **Curriculum review.** Who's the Arabic-pedagogy advisor? Recommend hiring a heritage-Arabic teacher for a 4-hour content review pass before Phase 3.
2. **Voice casting source.** Voices.com vs Fiverr vs personal network for first three actors. Suggest doing 3 paid auditions per dialect.
3. **Whisper provider benchmark.** Run 50 kid-Arabic recordings through Groq Whisper, OpenAI Whisper, and (control) Google STT. Pick by accuracy + cost. Defer until Phase 4.
4. **Pricing tiers.** Free trial length? Annual discount? Family plan vs single kid? Defer to Phase 6.
5. **Edge cases on adaptive difficulty.** What if a kid hits 100% for 50 quests and we run out of content? (Probably: graceful "we're cooking up more!" screen.)
6. **Localization of parent dashboard.** Arabic-dominant parents will want it in Arabic. RTL layout. Phase 6.
7. **Accessibility.** Color-blind palettes, dyslexia-friendly font option, low-vision scaling, screen-reader compatibility for parent dashboard. Phase 6 minimum.
8. **Tablet vs desktop UX.** Tap-to-walk works on touch; on desktop we'd want click-to-walk (same code) plus optional WASD. Confirm in Phase 1.
9. **Right-to-left UI quirks.** Even though we're audio-first, occasional Arabic text layout needs RTL. Tested across browsers.
10. **Trademark / name clearance.** "Battuta" — check trademarks in target markets before any public use.

---

## 18. Skills That Will Help

These are Claude Code skills that are useful for this project and worth knowing about as you go.

### For design + UI work

- **`design-shotgun`** — generate multiple AI design variants of a screen, pick what works. Great for the avatar editor, world map, bedroom. Generates a comparison board.
- **`design-consultation`** — propose a complete design system (typography, color, layout). Start of Phase 1.
- **`frontend-design`** — distinctive, production-grade frontend interfaces. For the parent dashboard especially.
- **`design-html`** — finalize approved mockups into production HTML/CSS. For the parent dashboard and postcard recipient pages.
- **`design-review`** — designer's-eye QA pass: spacing, hierarchy, AI-slop patterns. Run before each phase ships.
- **`design-systems`** — when the design system grows beyond a few screens.
- **`pencil` MCP** (already configured) — design tool for `.pen` files; useful for early UI mocks if you want to iterate visually without coding.

### For development workflow

- **`gstack`** / **`browse`** — headless browser for QA testing (clicking through the game, taking screenshots, regression checks). Useful all phases.
- **`qa`** — systematic QA with auto-fix loop. Phase 5+ when there's enough surface area.
- **`canary`** — post-deploy monitoring with screenshot diffs. Phase 7.
- **`benchmark`** — performance regression detection. Useful for the 60fps-on-iPad-Air-2 target.
- **`investigate`** — root-cause debugging skill. When a quest breaks mysteriously.
- **`simplify`** — code review for reuse, quality. Run periodically.
- **`review`** — pre-merge PR review.
- **`ship`** / **`land-and-deploy`** — release workflow.
- **`health`** — quality dashboard. Sanity-check between phases.

### For content + research

- **`context7` MCP** (already configured) — fetch current docs for Phaser 3, Whisper API, Supabase, Stripe. Use whenever you're integrating something.
- **`last30days-skill`** — research recent diaspora-Arabic-education or kids' app trends.
- **`learn`** / **`compound`** / **`consolidate`** — log non-obvious things you discover (e.g., "Whisper Arabic transcribes ة as ه half the time, so normalize before fuzzy-match").

### For the project meta-layer

- **`writing-prds`** — turn this spec into a tighter PRD if you ever need one for funding/partners.
- **`launch-strategy`** / **`launch-marketing`** — Phase 7.
- **`positioning-messaging`** — when you craft the landing page.
- **`pricing-strategy`** — Phase 6 when deciding free/paid tier line.

### Skills NOT relevant

A lot of the skills installed are for other domains (financial analysis, ad creative, content marketing). Ignore them. Don't go shopping in there.

---

## 19. What This Spec Does Not Yet Cover

- Visual mockups (next step: run `design-shotgun` on the world map and bedroom)
- Concrete art direction document for the pixel artist (palette swatches, sprite size sheet, animation pacing)
- Per-quest scripts (defer to Phase 3 with curriculum advisor)
- Specific voice actor briefs (defer to Phase 3)
- Technical schema for save data, quest definitions, and audio manifest (defer to Phase 0–1; will live in `packages/schemas`)
- Marketing site, landing page, demo video plan (Phase 7)

---

*This spec is a living document. Decisions in §1 are committed; everything else is evolvable. When in doubt, the answer is whatever makes the kid hear more Arabic from people who sound like their family.*

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | not run |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | not run |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR (PLAN) | 10 issues, 1 critical gap (malformed quest handler — Phase 2), 46 tests landed, Save v2 + schemas package shipped |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | CLEAR (PLAN) | score: 5/10 → 8/10, 6 decisions added, 4 design-debt TODOs deferred to TODOS.md |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | not run |

- **UNRESOLVED**: 0 (all eng-review questions answered)
- **VERDICT**: DESIGN + ENG CLEARED. Ready to implement Phase 1 per SPEC §16.

