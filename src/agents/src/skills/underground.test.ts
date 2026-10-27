import { test } from "node:test";
import assert from "node:assert/strict";
import { climbOut } from "./underground.js";
import { context, fakeBot } from "../testing/fakeBot.js";

/** A stone pocket at 0,64,0 with `above` stacked over its ceiling. */
function pocket(above: string): Record<string, string> {
  const blocks: Record<string, string> = {};
  for (let x = -3; x <= 3; x++)
    for (let z = -3; z <= 3; z++)
      for (let y = 63; y <= 72; y++) blocks[`${x},${y},${z}`] = y <= 66 ? "stone" : above;
  delete blocks["0,64,0"];
  delete blocks["0,65,0"];
  return blocks;
}

test("climb_out - won't dig out from under gravel, which would fall on the head (bpoc7)", async () => {
  const { bot, calls } = fakeBot({ position: { x: 0.5, y: 64, z: 0.5 }, blocks: pocket("gravel"), inventory: { stone_pickaxe: 1 } });
  const result = await climbOut.run(context(bot), {});
  assert.equal(result.status, "failed");
  assert.match(result.reason ?? "", /gravel above, which would fall on your head/);
  assert.ok(!calls.includes("dig stone"), "the ceiling under the gravel stays");
});
