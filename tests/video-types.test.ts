import assert from "node:assert/strict";
import test from "node:test";
import { formatViewCount, sanitizeFilename } from "../modules/videos/types.ts";

test("sanitizes an uploaded filename without losing its extension", () => {
  assert.equal(sanitizeFilename("my launch video!.mp4"), "my-launch-video-.mp4");
});

test("formats compact view counts", () => {
  assert.equal(formatViewCount(12), "12");
  assert.equal(formatViewCount(1_200), "1.2K");
  assert.equal(formatViewCount(2_000_000), "2M");
});
