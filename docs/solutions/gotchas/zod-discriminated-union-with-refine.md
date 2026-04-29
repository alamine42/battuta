---
title: "zod's discriminatedUnion rejects .refine() — use post-parse validation"
category: "gotchas"
date: "2026-04-29"
tags: [zod, typescript, schema, discriminated-union]
files:
  - packages/schemas/src/quest.ts
---

# zod's discriminatedUnion rejects `.refine()` — use post-parse validation

## Problem

Adding `.refine()` to a member of a `z.discriminatedUnion` produces a TypeScript error:

```
Type 'ZodEffects<ZodObject<...>, ..., ...>' is missing the following properties from
type 'ZodObject<{ type: ZodTypeAny; } & ZodRawShape, ...>': _cached, _getCached,
shape, strict, and 14 more.
```

The original code tried to enforce "exactly one dialog choice must be is_correct":

```typescript
export const DialogQuestSchema = QuestBase.extend({
  type: z.literal("dialog"),
  prompt_line: LineRefSchema,
  choices: z.array(DialogChoiceSchema).min(2).max(4),
}).refine(
  (q) => q.choices.filter((c) => c.is_correct).length === 1,
  { message: "Exactly one dialog choice must be is_correct" },
);

export const QuestSchema = z.discriminatedUnion("type", [
  FetchQuestSchema,
  DialogQuestSchema,  // ← TypeScript rejects this
  MinigameQuestSchema,
  SpeakQuestSchema,
]);
```

## Root Cause

`z.discriminatedUnion` requires every member to be a `ZodObject` (or `ZodObject` extension). It uses the discriminator field's literal type to build a fast lookup table at parse time.

`.refine()` returns a `ZodEffects` wrapper that's NOT a `ZodObject` — it's a transform/validator wrapper around one. The discriminatedUnion can't introspect a ZodEffects to find the discriminator field, so TypeScript rejects it.

This is a known zod 3.x limitation. zod 4 may relax it via `ZodDiscriminatedUnion` rewrites, but as of 3.23 there's no fix.

## Solution

Move cross-field invariants OUT of the schema definition and INTO a post-parse validator. The discriminatedUnion stays clean (all plain ZodObjects), and a separate `parseQuest()` function does the cross-field checks AFTER parsing succeeds:

```typescript
// Schema stays clean — no .refine on union members
export const DialogQuestSchema = QuestBase.extend({
  type: z.literal("dialog"),
  prompt_line: LineRefSchema,
  choices: z.array(DialogChoiceSchema).min(2).max(4),
});

export const QuestSchema = z.discriminatedUnion("type", [
  FetchQuestSchema,
  DialogQuestSchema,
  MinigameQuestSchema,
  SpeakQuestSchema,
]);

// Cross-field invariants live here
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
```

**Always use `parseQuest()` rather than `QuestSchema.parse()` directly.** The schema alone won't catch cross-field bugs.

## Prevention

- [ ] When a zod schema needs cross-field validation AND is a member of a discriminatedUnion, write a `parseX()` helper. Don't use `.refine()`.
- [ ] Document the `parseX()` requirement in JSDoc on the schema export so consumers don't bypass it.
- [ ] If you have a generic "validate any quest" path, write tests that exercise both the per-field zod errors AND the cross-field invariants.

## Alternatives Considered

- **z.union (non-discriminated)**: accepts ZodEffects, but loses the discriminator-based fast-path AND produces less helpful error messages (it tries every member).
- **z.intersection**: doesn't fit here — choices isn't an additive constraint.
- **Custom z.ZodType**: too heavy for this case.

The post-parse helper is the idiomatic zod 3.x pattern.

## Related

- zod GitHub issue tracker has multiple threads on this. Search for "discriminatedUnion refine".
- The `parseQuest` helper is also where minigame round validation lives (`correct_object_id` must be in `options`).
