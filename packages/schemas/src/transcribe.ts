// /api/transcribe contract. Frozen here so Phase 1 client and Phase 4 server
// build to the same spec. SPEC §4 describes the flow; this file is the
// authoritative wire format.
//
// Privacy: server discards audio after transcription. Per SPEC §14 strict mode.
// The only exception is postcard recording, which uses a different endpoint.
//
// Wire format:
//   Request:   POST /api/transcribe
//              Content-Type: multipart/form-data
//              fields:
//                - audio: Blob (audio/webm, audio/mp4, audio/wav — server normalizes)
//                - meta: JSON string (TranscribeRequestMeta)
//   Response:  200 application/json (TranscribeResponse)
//   Errors:    400 / 413 / 422 / 429 / 500 application/json (TranscribeError)
//
// Recommended client-side timeout: 8s (Whisper round-trip ~2-5s; +3s slack).
// Client maps timeouts to the SPEC §8 mic timeout fallback.

import { z } from "zod";
import { DialectSchema } from "./quest";

// ─── request ──────────────────────────────────────────────────────────────

export const TranscribeRequestMetaSchema = z.object({
  // The expected phrase the kid is trying to say. Server may use this for
  // bias/prompting on the Whisper model (varies by provider).
  expectedPhrase: z.string().min(1).max(200),
  // Dialect hint to the ASR model. Affects model selection on Groq/OpenAI.
  dialect: DialectSchema,
  // Profile age band — used server-side for kid-voice tuning if available.
  ageBand: z.enum(["5-8", "9-12"]),
  // Quest beat reference for analytics (NOT stored alongside audio).
  questId: z.string().optional(),
  beatIndex: z.number().int().min(0).optional(),
  // Client-side timestamp; for latency telemetry.
  clientSentAt: z.string(), // ISO 8601
});
export type TranscribeRequestMeta = z.infer<typeof TranscribeRequestMetaSchema>;

// Audio constraints — enforced by server, documented for client UX.
export const TRANSCRIBE_AUDIO_LIMITS = {
  maxDurationSeconds: 8, // hard cap; UI should stop recording at 5s with auto-submit
  maxBytes: 2 * 1024 * 1024, // 2MB
  acceptedMimeTypes: ["audio/webm", "audio/mp4", "audio/wav", "audio/ogg"],
} as const;

// ─── response ─────────────────────────────────────────────────────────────

export const TranscribeResponseSchema = z.object({
  // The transcribed text. Empty string allowed if Whisper returned nothing.
  transcript: z.string(),
  // Optional model confidence (0..1). Not all providers return this.
  confidence: z.number().min(0).max(1).optional(),
  // Server-side processing time (ms). Useful for telemetry.
  processingMs: z.number().int().min(0),
  // Provider used (we may multi-provider for failover).
  provider: z.enum(["groq-whisper", "openai-whisper", "vosk"]),
});
export type TranscribeResponse = z.infer<typeof TranscribeResponseSchema>;

// ─── errors ───────────────────────────────────────────────────────────────

export const TranscribeErrorCode = z.enum([
  "audio_too_short", // < 0.5s
  "audio_too_long", // > 8s
  "audio_too_large", // > maxBytes
  "audio_format_unsupported",
  "meta_invalid", // zod parse fail on meta
  "rate_limited", // per-profile quota
  "provider_error", // upstream Whisper failed
  "internal_error",
]);
export type TranscribeErrorCode = z.infer<typeof TranscribeErrorCode>;

export const TranscribeErrorSchema = z.object({
  code: TranscribeErrorCode,
  message: z.string(),
  retryAfterSeconds: z.number().int().min(0).optional(), // for rate_limited
});
export type TranscribeError = z.infer<typeof TranscribeErrorSchema>;

// ─── client helper ────────────────────────────────────────────────────────

/**
 * Build the multipart FormData body for a /api/transcribe request.
 * Use from the kid-side mic UI.
 */
export function buildTranscribeRequest(
  audio: Blob,
  meta: TranscribeRequestMeta,
): FormData {
  // Validate meta before sending — clients should never send junk.
  TranscribeRequestMetaSchema.parse(meta);
  const fd = new FormData();
  fd.append("audio", audio);
  fd.append("meta", JSON.stringify(meta));
  return fd;
}
