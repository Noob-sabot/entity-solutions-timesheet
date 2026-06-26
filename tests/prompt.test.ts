import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isAffirmative } from "../scripts/lib/prompt.js";

describe("isAffirmative", () => {
  it("accepts y and yes (case insensitive)", () => {
    assert.equal(isAffirmative("y"), true);
    assert.equal(isAffirmative("Y"), true);
    assert.equal(isAffirmative("yes"), true);
    assert.equal(isAffirmative(" YES "), true);
  });

  it("rejects empty, no, and other answers", () => {
    assert.equal(isAffirmative(""), false);
    assert.equal(isAffirmative("n"), false);
    assert.equal(isAffirmative("no"), false);
    assert.equal(isAffirmative("maybe"), false);
  });
});
