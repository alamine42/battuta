// Quest content schema. Every quest JSON file in `packages/content/quests/`
// MUST validate against `QuestSchema`. CI enforces this; runtime validates
// on scene init. Malformed quests are loud failures, not silent bugs.
//
// SPEC §8 quest types:
//   A — Fetch (NPC asks for an object; kid finds + returns)
//   B — Dialog (NPC says X; kid taps the right thing in scene)
//   C — Minigame (small interactive beat per location)
//   D — Speak (mic-required; kid repeats the phrase)
//
// Audio line refs use the pattern `{character}.{line_id}.{dialect}` and
// resolve at load time against the per-dialect audio manifest.

import { z } from "zod";

// ─── primitives ───────────────────────────────────────────────────────────

export const DialectSchema = z.enum(["msa", "eg", "shami"]);
export type Dialect = z.infer<typeof DialectSchema>;

export const LocationSchema = z.enum([
  "house.bedroom",
  "house.kitchen",
  "house.living-room",
  "park.entrance",
  "park.fountain",
  "school.classroom",
  "school.yard",
  "beach.shore",
  "beach.dhow",
  "souk.square",
]);
export type Location = z.infer<typeof LocationSchema>;

// Audio line ID. Format: `{characterId}.{lineId}` — dialect resolves at runtime.
// Example: "tata.bring_me_apple" → resolves to "tata.bring_me_apple.eg.opus"
// when the kid's dialect is Egyptian.
export const LineRefSchema = z.string().regex(
  /^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*$/,
  "Line ref must be `character.line_id` (lowercase, snake_case)",
);

export const ObjectIdSchema = z.string().regex(
  /^[a-z][a-z0-9_-]*$/,
  "Object IDs must be lowercase snake_case",
);

export const StickerIdSchema = z.string().regex(
  /^[a-z][a-z0-9_-]*$/,
  "Sticker IDs must be lowercase snake_case",
);

// ─── quest types ──────────────────────────────────────────────────────────

const QuestBase = z.object({
  id: z.string().regex(/^[a-z][a-z0-9._-]*$/, "Quest ID must be dot-separated lowercase"),
  level: z.number().int().min(1).max(20),
  location: LocationSchema,
  npc: z.string().regex(/^[a-z][a-z0-9_-]*$/, "NPC IDs must be lowercase snake_case"),
  intro_line: LineRefSchema.optional(),
  reward_hasanat: z.number().int().min(0).max(50),
  reward_sticker: StickerIdSchema.optional(),
  reward_item: ObjectIdSchema.optional(),
});

// Type A — Fetch quest
export const FetchQuestSchema = QuestBase.extend({
  type: z.literal("fetch"),
  ask_line: LineRefSchema,
  target_object: ObjectIdSchema,
  distractor_objects: z.array(ObjectIdSchema).min(1).max(5),
  thank_line: LineRefSchema,
  wrong_tap_line: LineRefSchema,
});
export type FetchQuest = z.infer<typeof FetchQuestSchema>;

// Type B — Dialog choice
const DialogChoiceSchema = z.object({
  object_id: ObjectIdSchema,
  is_correct: z.boolean(),
  response_line: LineRefSchema,
});

export const DialogQuestSchema = QuestBase.extend({
  type: z.literal("dialog"),
  prompt_line: LineRefSchema,
  choices: z.array(DialogChoiceSchema).min(2).max(4),
  // Exactly-one-correct invariant is enforced post-parse in `parseQuest`
  // (zod discriminatedUnion can't accept ZodEffects, so .refine moves out).
});
export type DialogQuest = z.infer<typeof DialogQuestSchema>;

// Type C — Minigame
const MinigameRoundSchema = z.object({
  prompt_line: LineRefSchema,
  correct_object_id: ObjectIdSchema,
  options: z.array(ObjectIdSchema).min(2).max(5),
});

export const MinigameQuestSchema = QuestBase.extend({
  type: z.literal("minigame"),
  minigame_kind: z.enum(["bucket-sort", "color-pick", "rhythm-tap"]),
  rounds: z.array(MinigameRoundSchema).min(1).max(10),
  success_line: LineRefSchema,
  partial_line: LineRefSchema,
});
export type MinigameQuest = z.infer<typeof MinigameQuestSchema>;

// Type D — Speak (mic-required)
export const SpeakQuestSchema = QuestBase.extend({
  type: z.literal("speak"),
  level: z.number().int().min(7).max(20), // SPEC §11: mic locked below level 7
  prompt_line: LineRefSchema,
  expected_phrase: z.string().min(1), // Arabic phrase the kid says back
  // Levenshtein threshold for fuzzy match against Whisper transcript.
  // 0.0 = exact match, 1.0 = anything goes. Default 0.3 = forgiving.
  match_threshold: z.number().min(0).max(1).default(0.3),
  success_line: LineRefSchema,
  soft_success_line: LineRefSchema,
  miss_line: LineRefSchema,
});
export type SpeakQuest = z.infer<typeof SpeakQuestSchema>;

// ─── union ────────────────────────────────────────────────────────────────

export const QuestSchema = z.discriminatedUnion("type", [
  FetchQuestSchema,
  DialogQuestSchema,
  MinigameQuestSchema,
  SpeakQuestSchema,
]);
export type Quest = z.infer<typeof QuestSchema>;

// ─── helpers ──────────────────────────────────────────────────────────────

/**
 * Validate a quest object. Throws on failure (loud, not silent).
 * Use at scene-init time when loading a quest JSON.
 *
 * Cross-field invariants that don't fit cleanly into a discriminatedUnion
 * (which can't take ZodEffects) live here.
 */
export function parseQuest(data: unknown): Quest {
  const quest = QuestSchema.parse(data);
  if (quest.type === "dialog") {
    const correctCount = quest.choices.filter((c) => c.is_correct).length;
    if (correctCount !== 1) {
      throw new Error(
        `Quest ${quest.id}: dialog quest must have exactly one is_correct choice (found ${correctCount})`,
      );
    }
  }
  if (quest.type === "minigame") {
    for (const round of quest.rounds) {
      if (!round.options.includes(round.correct_object_id)) {
        throw new Error(
          `Quest ${quest.id}: minigame round correct_object_id "${round.correct_object_id}" must be in options`,
        );
      }
    }
  }
  return quest;
}

/**
 * Resolve a line ref to a per-dialect audio path.
 * "tata.bring_me_apple" + "eg" → "audio/eg/tata.bring_me_apple.opus"
 */
export function resolveLineRef(ref: string, dialect: Dialect): string {
  return `audio/${dialect}/${ref}.opus`;
}
