import { describe, expect, it } from "vitest";
import {
  buildTranscribeRequest,
  TranscribeResponseSchema,
  TranscribeErrorSchema,
  TRANSCRIBE_AUDIO_LIMITS,
  type TranscribeRequestMeta,
} from "./transcribe";

const validMeta: TranscribeRequestMeta = {
  expectedPhrase: "السلام عليكم",
  dialect: "msa",
  ageBand: "5-8",
  questId: "school.greet",
  beatIndex: 0,
  clientSentAt: new Date().toISOString(),
};

describe("buildTranscribeRequest", () => {
  it("builds FormData with audio + meta JSON for valid input", () => {
    const blob = new Blob(["fake audio data"], { type: "audio/webm" });
    const fd = buildTranscribeRequest(blob, validMeta);
    expect(fd.get("audio")).toBeInstanceOf(Blob);
    const metaStr = fd.get("meta");
    expect(typeof metaStr).toBe("string");
    expect(JSON.parse(metaStr as string).expectedPhrase).toBe("السلام عليكم");
  });

  it("rejects invalid meta (zod parse fail)", () => {
    const blob = new Blob(["x"], { type: "audio/webm" });
    expect(() =>
      buildTranscribeRequest(blob, { ...validMeta, expectedPhrase: "" }),
    ).toThrow();
  });

  it("rejects invalid dialect", () => {
    const blob = new Blob(["x"], { type: "audio/webm" });
    expect(() =>
      // @ts-expect-error — testing runtime rejection of invalid dialect
      buildTranscribeRequest(blob, { ...validMeta, dialect: "spanish" }),
    ).toThrow();
  });
});

describe("schemas parse correctly", () => {
  it("TranscribeResponseSchema accepts a minimal response", () => {
    expect(() =>
      TranscribeResponseSchema.parse({
        transcript: "hello",
        processingMs: 500,
        provider: "groq-whisper",
      }),
    ).not.toThrow();
  });

  it("TranscribeResponseSchema rejects unknown provider", () => {
    expect(() =>
      TranscribeResponseSchema.parse({
        transcript: "hello",
        processingMs: 500,
        provider: "made-up-provider",
      }),
    ).toThrow();
  });

  it("TranscribeErrorSchema accepts standard error codes", () => {
    expect(() =>
      TranscribeErrorSchema.parse({ code: "audio_too_long", message: "exceeded 8s" }),
    ).not.toThrow();
    expect(() =>
      TranscribeErrorSchema.parse({
        code: "rate_limited",
        message: "slow down",
        retryAfterSeconds: 30,
      }),
    ).not.toThrow();
  });
});

describe("audio limits constants", () => {
  it("hard cap matches the 8s SPEC contract", () => {
    expect(TRANSCRIBE_AUDIO_LIMITS.maxDurationSeconds).toBe(8);
  });

  it("audio size cap is 2MB", () => {
    expect(TRANSCRIBE_AUDIO_LIMITS.maxBytes).toBe(2 * 1024 * 1024);
  });
});
