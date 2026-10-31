import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeBot } from "./testing/fakeBot.js";
import { looksStuck, surroundings } from "./surroundings.js";

test("surroundings - the blocks round the agent, by height, with what is at its feet and head (tluna9a)", () => {
  const { bot } = fakeBot({ position: { x: 0.5, y: 64, z: 0.5 }, blocks: { "0,63,0": "stone", "1,64,0": "water", "-1,64,0": "white_bed", "0,65,1": "cobblestone" } });
  const s = surroundings(bot);
  assert.equal(s.below, "stone");
  assert.equal(s.x0, -4);
  assert.equal(s.z0, -4);
  assert.deepEqual(s.layers.map((l) => l.y), [67, 66, 65, 64, 63, 62], "top first, 3 up and 2 down");
  const feet = s.layers.find((l) => l.y === 64)!.rows[4]!;
  assert.equal(feet.slice(3, 6), "B@~", "west to east: a bed, the agent, water");
  assert.equal(s.layers.find((l) => l.y === 65)!.rows[5]![4], "c", "a row south, at head height");
});

test("looksStuck - failures to get somewhere, not interruptions or other refusals", () => {
  assert.equal(looksStuck("build_shelter", "failed", "could not get into a large shelter at 15,72,34: walking to the door timed out after 33032ms"), true);
  assert.equal(looksStuck("climb_out", "failed", "in water (swam up, but could not climb onto the bank), and could not reach dry ground"), true);
  assert.equal(looksStuck("descend", "failed", "stopped at y=58: every way down is unsafe (north: water)"), true);
  assert.equal(looksStuck("go_to", "aborted", "interrupted: a creeper came within 6 blocks"), false);
  assert.equal(looksStuck("craft", "failed", "need 3 more cobblestone"), false);
  assert.equal(looksStuck("go_to", "success", "walked, though blocked once"), false);
});
