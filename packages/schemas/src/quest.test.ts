// Tests for parseQuest cross-field invariants and resolveLineRef.

import { describe, expect, it } from "vitest";
import {
  parseQuest,
  resolveLineRef,
  type FetchQuest,
  type DialogQuest,
  type MinigameQuest,
  type SpeakQuest,
} from "./quest";

const validFetch: FetchQuest = {
  id: "house.kitchen.fetch_apple",
  type: "fetch",
  level: 1,
  location: "house.kitchen",
  npc: "tata",
  ask_line: "tata.bring_me_apple",
  target_object: "apple",
  distractor_objects: ["banana", "orange"],
  thank_line: "tata.thanks",
  wrong_tap_line: "tata.label_object",
  reward_hasanat: 5,
  reward_sticker: "apple",
};

describe("parseQuest", () => {
  describe("fetch quest", () => {
    it("accepts a valid fetch quest", () => {
      expect(() => parseQuest(validFetch)).not.toThrow();
    });

    it("rejects ID without dot-snake-case", () => {
      expect(() => parseQuest({ ...validFetch, id: "BadID" })).toThrow();
    });

    it("rejects line refs without character.lineId format", () => {
      expect(() => parseQuest({ ...validFetch, ask_line: "no_dot" })).toThrow();
    });

    it("rejects empty distractor list", () => {
      expect(() => parseQuest({ ...validFetch, distractor_objects: [] })).toThrow();
    });

    it("rejects reward_hasanat above 50", () => {
      expect(() => parseQuest({ ...validFetch, reward_hasanat: 100 })).toThrow();
    });
  });

  describe("dialog quest cross-field invariant", () => {
    const validDialog: DialogQuest = {
      id: "park.aunt.bench",
      type: "dialog",
      level: 3,
      location: "park.entrance",
      npc: "khalto",
      prompt_line: "khalto.tired_sit",
      choices: [
        { object_id: "bench", is_correct: true, response_line: "khalto.thanks" },
        { object_id: "swing", is_correct: false, response_line: "khalto.no_swing" },
        { object_id: "tree", is_correct: false, response_line: "khalto.no_tree" },
      ],
      reward_hasanat: 5,
    };

    it("accepts dialog with exactly one is_correct", () => {
      expect(() => parseQuest(validDialog)).not.toThrow();
    });

    it("rejects dialog with zero is_correct", () => {
      expect(() =>
        parseQuest({
          ...validDialog,
          choices: validDialog.choices.map((c) => ({ ...c, is_correct: false })),
        }),
      ).toThrow(/exactly one is_correct/);
    });

    it("rejects dialog with two is_correct", () => {
      expect(() =>
        parseQuest({
          ...validDialog,
          choices: validDialog.choices.map((c) => ({ ...c, is_correct: true })),
        }),
      ).toThrow(/exactly one is_correct/);
    });
  });

  describe("minigame round invariant", () => {
    const validMinigame: MinigameQuest = {
      id: "beach.sandcastle",
      type: "minigame",
      level: 4,
      location: "beach.shore",
      npc: "school_friend",
      minigame_kind: "bucket-sort",
      rounds: [
        { prompt_line: "friend.small", correct_object_id: "small_bucket", options: ["small_bucket", "big_bucket"] },
      ],
      success_line: "friend.success",
      partial_line: "friend.partial",
      reward_hasanat: 10,
    };

    it("accepts a minigame where correct_object_id is in options", () => {
      expect(() => parseQuest(validMinigame)).not.toThrow();
    });

    it("rejects a minigame where correct_object_id is NOT in options", () => {
      expect(() =>
        parseQuest({
          ...validMinigame,
          rounds: [
            { prompt_line: "friend.small", correct_object_id: "missing", options: ["small_bucket", "big_bucket"] },
          ],
        }),
      ).toThrow(/must be in options/);
    });
  });

  describe("speak quest level gate", () => {
    const validSpeak: SpeakQuest = {
      id: "school.greet",
      type: "speak",
      level: 7,
      location: "school.classroom",
      npc: "ustaza",
      prompt_line: "ustaza.say_with_me",
      expected_phrase: "السلام عليكم",
      match_threshold: 0.3,
      success_line: "ustaza.success",
      soft_success_line: "ustaza.again",
      miss_line: "ustaza.no_worries",
      reward_hasanat: 10,
    };

    it("accepts speak at level 7 (mic gate)", () => {
      expect(() => parseQuest(validSpeak)).not.toThrow();
    });

    it("rejects speak at level 5 (mic still locked per SPEC §11)", () => {
      expect(() => parseQuest({ ...validSpeak, level: 5 })).toThrow();
    });
  });
});

describe("resolveLineRef", () => {
  it("maps refs to per-dialect audio paths", () => {
    expect(resolveLineRef("tata.bring_me_apple", "msa")).toBe("audio/msa/tata.bring_me_apple.opus");
    expect(resolveLineRef("tata.bring_me_apple", "eg")).toBe("audio/eg/tata.bring_me_apple.opus");
    expect(resolveLineRef("tata.bring_me_apple", "shami")).toBe("audio/shami/tata.bring_me_apple.opus");
  });
});
