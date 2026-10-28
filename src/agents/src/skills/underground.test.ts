import { test } from "node:test";
import assert from "node:assert/strict";
import { Vec3 } from "vec3";
import { climbOut, plainError } from "./underground.js";
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

test("plainError - library errors in words the agent can act on (bpoc11)", () => {
  assert.equal(plainError("invalid operation"), "the inventory was busy moving an item");
  assert.equal(plainError("The goal was changed before it could be completed!"), "interrupted before getting there");
  assert.equal(plainError("water behind the stone"), "water behind the stone");
});

test("climb_out - standing at the edge of a block over a cave, it steps onto the block before building up (bpoc11)", async () => {
  // One block to stand on in open space, a ceiling far above: nothing to cut steps into.
  const blocks: Record<string, string> = { "0,63,0": "stone" };
  for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) blocks[`${x},80,${z}`] = "stone";
  // The bot's middle hangs over the air east of the block; the rest of it rests on the block.
  const { bot, calls } = fakeBot({ position: { x: 1.15, y: 64, z: 0.5 }, blocks, inventory: { cobblestone: 10, iron_pickaxe: 1 } });
  (bot.pathfinder as any).goto = async (goal: { x: number; y: number; z: number }) => {
    calls.push(`goto ${goal.x},${goal.y},${goal.z}`);
    bot.entity.position = new Vec3(goal.x + 0.5, goal.y, goal.z + 0.5);
  };
  const result = await climbOut.run(context(bot), {});
  assert.ok(calls.includes("goto 0,64,0"), "it steps onto the middle of the block it rests on");
  assert.doesNotMatch(result.reason ?? "", /not standing on solid ground/);
  assert.match(result.reason ?? "", /no rock to step up onto/);
  assert.ok(calls.includes("equip cobblestone"), "it holds a block to build with, not the pickaxe");
});
