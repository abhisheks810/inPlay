import assert from "node:assert/strict";
import test from "node:test";
import { parseEngagementEvent } from "../modules/engagement/types.ts";

test("accepts a supported engagement event", () => {
  assert.deepEqual(
    parseEngagementEvent({
      videoId: "video-1",
      eventType: "progress",
      sessionId: "11111111-1111-4111-8111-111111111111",
      watchSeconds: 42.8,
    }),
    {
      videoId: "video-1",
      eventType: "progress",
      sessionId: "11111111-1111-4111-8111-111111111111",
      watchSeconds: 42,
    },
  );
});

test("rejects unsupported events and weak session identifiers", () => {
  assert.equal(
    parseEngagementEvent({
      videoId: "video-1",
      eventType: "email_opened",
      sessionId: "short",
    }),
    null,
  );
});

test("bounds watch time to one day", () => {
  assert.equal(
    parseEngagementEvent({
      videoId: "video-1",
      eventType: "complete",
      sessionId: "11111111-1111-4111-8111-111111111111",
      watchSeconds: 999_999,
    })?.watchSeconds,
    86_400,
  );
});
