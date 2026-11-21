import { test } from "node:test";
import assert from "node:assert/strict";
import {
  OPENING_PHASES,
  OPENING_TIMING,
  nextOpeningPhase,
  openingDelay,
} from "../src/opening-timing.js";

test("opening follows the reference order and holds on the final portrait", () => {
  let phase = "sealed";
  const visited = [phase];
  for (let i = 0; i < 4; i++) {
    phase = nextOpeningPhase(phase);
    visited.push(phase);
  }
  assert.deepEqual(visited, OPENING_PHASES);
  assert.equal(nextOpeningPhase("portrait"), "portrait");
});
test("the envelope opens after interaction, then advances through readable cards", () => {
  assert.equal(openingDelay("sealed", false), null);
  assert.equal(openingDelay("folding", false), 1900);
  assert.equal(openingDelay("welcome", false), 2000);
  assert.equal(openingDelay("names", false), 2100);
  assert.equal(openingDelay("portrait", false), null);
  assert.ok(OPENING_TIMING.gestureCooldown > 500);
});
test("reduced motion never starts a timed slideshow", () => {
  for (const phase of OPENING_PHASES)
    assert.equal(openingDelay(phase, true), null);
});
