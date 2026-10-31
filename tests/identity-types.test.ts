import assert from "node:assert/strict";
import test from "node:test";
import { isIdentityProvider, safeReturnPath } from "../modules/identity/types.ts";

test("recognizes supported identity providers", () => {
  assert.equal(isIdentityProvider("apple"), true);
  assert.equal(isIdentityProvider("google"), true);
  assert.equal(isIdentityProvider("zoho"), true);
  assert.equal(isIdentityProvider("github"), false);
});

test("allows only local non-auth return paths", () => {
  assert.equal(safeReturnPath("/watch?v=one#player"), "/watch?v=one#player");
  assert.equal(safeReturnPath("https://attacker.example"), "/");
  assert.equal(safeReturnPath("//attacker.example"), "/");
  assert.equal(safeReturnPath("/api/auth/google/callback"), "/");
});
