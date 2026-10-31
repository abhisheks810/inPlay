import assert from "node:assert/strict";
import test from "node:test";
import { parseByteRange } from "../modules/storage/byte-range.ts";

test("supports Safari's initial two-byte probe and bounded media reads", () => {
  assert.deepEqual(parseByteRange("bytes=0-1", 100), { offset: 0, length: 2 });
  assert.deepEqual(parseByteRange("bytes=30-59", 100), { offset: 30, length: 30 });
});

test("supports open-ended and suffix ranges, clamped to the object", () => {
  assert.deepEqual(parseByteRange("bytes=90-", 100), { offset: 90, length: 10 });
  assert.deepEqual(parseByteRange("bytes=-20", 100), { offset: 80, length: 20 });
  assert.deepEqual(parseByteRange("bytes=90-999", 100), { offset: 90, length: 10 });
  assert.deepEqual(parseByteRange("bytes=-999", 100), { offset: 0, length: 100 });
});

test("rejects unsatisfiable, malformed, unsafe, and multiple ranges", () => {
  for (const value of ["bytes=100-", "bytes=10-2", "bytes=-0", "bytes=-", "bytes=0-1,3-4", "items=0-1", "bytes=9007199254740993-"]) {
    assert.equal(parseByteRange(value, 100), null, value);
  }
  assert.equal(parseByteRange("bytes=0-1", 0), null);
});
