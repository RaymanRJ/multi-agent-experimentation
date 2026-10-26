import { test } from "node:test";
import assert from "node:assert/strict";
import { guardWhileDeciding, retreatPoint, safeGround } from "./reflexes.js";
import { refuge } from "./skills/flee.js";
import { floorCells, layout } from "./skills/buildShelter.js";
import { fakeBot, floor } from "./testing/fakeBot.js";

const zombie = (x: number, z: number) => ({ name: "zombie", type: "hostile", position: { x, y: 64, z } });

/** A stone floor under y 64, with water in the floor where `wet` says. */
function ground(wet: (x: number, z: number) => boolean, r = 12): Record<string, string> {
  const blocks = floor(64, "stone", r);
  for (const cell of Object.keys(blocks)) {
    const [x, , z] = cell.split(",").map(Number) as [number, number, number];
    if (wet(x, z)) blocks[cell] = "water";
  }
  return blocks;
}

test("safeGround - dry floor yes; water, or a drop with nothing below, no", () => {
  const { bot } = fakeBot({ blocks: ground((x) => x === 3) });
  assert.equal(safeGround(bot, 1, 0, 64), true);
  assert.equal(safeGround(bot, 3, 0, 64), false, "water");
  assert.equal(safeGround(bot, 30, 0, 64), false, "past the floor's edge: a drop");
});

test("retreatPoint - straight away on dry ground, turning aside from a lake, null when every way is wet", () => {
  const dry = fakeBot({ position: { x: 0.5, y: 64, z: 0.5 }, blocks: ground(() => false), entities: [zombie(-2.5, 0.5)] }).bot;
  assert.deepEqual(retreatPoint(dry, Object.values(dry.entities), 6), { x: 7, z: 1 });

  // bpoc3: agents fled straight into a lake and drowned there. A strip of water lies dead ahead.
  const lake = fakeBot({ position: { x: 0.5, y: 64, z: 0.5 }, blocks: ground((x, z) => x >= 4 && Math.abs(z) <= 2), entities: [zombie(-2.5, 0.5)] }).bot;
  const turned = retreatPoint(lake, Object.values(lake.entities), 6)!;
  assert.ok(turned.x > 0, "still away from the zombie");
  assert.equal(safeGround(lake, turned.x, turned.z, 64), true, "onto dry ground");

  // A river across the way, with dry ground beyond it: run along it, not across.
  const river = fakeBot({ position: { x: 0.5, y: 64, z: 0.5 }, blocks: ground((x) => x === 3), entities: [zombie(-2.5, 0.5)] }).bot;
  const along = retreatPoint(river, Object.values(river.entities), 6)!;
  assert.ok(along.x < 3, `stays this side of the river (went to ${along.x},${along.z})`);

  const sea = fakeBot({ position: { x: 0.5, y: 64, z: 0.5 }, blocks: ground((x) => x >= 1), entities: [zombie(-2.5, 0.5)] }).bot;
  assert.equal(retreatPoint(sea, Object.values(sea.entities), 6), null);
});

test("guardWhileDeciding - steps back from a mob in reach and says so; nothing inside a closed shelter or with none near", () => {
  const goals: Array<{ x: number; z: number } | null> = [];
  const near = fakeBot({ position: { x: 0.5, y: 64, z: 0.5 }, blocks: ground(() => false), entities: [zombie(-1.5, 0.5)] }).bot;
  near.pathfinder.setGoal = (goal: any) => void goals.push(goal && { x: goal.x, z: goal.z });
  const guard = guardWhileDeciding(near, () => false);
  assert.equal(guard.stop(), "while you were deciding, you stepped back from a zombie");
  assert.ok(goals[0] && goals[0].x > 0, "away from the zombie, to the east");
  assert.equal(goals.at(-1), null, "and stopped when the decision came");

  const sheltered = fakeBot({ position: { x: 0.5, y: 64, z: 0.5 }, blocks: ground(() => false), entities: [zombie(-1.5, 0.5)] }).bot;
  assert.equal(guardWhileDeciding(sheltered, () => true).stop(), null);
  const far = fakeBot({ position: { x: 0.5, y: 64, z: 0.5 }, blocks: ground(() => false), entities: [zombie(-8.5, 0.5)] }).bot;
  assert.equal(guardWhileDeciding(far, () => false).stop(), null);
});

test("refuge - a known shelter on the far side from the mobs, with its doorway clear and within 40 blocks", () => {
  const spot = { x: 0, y: 64, z: 0, storeys: 1, by: "qb" };
  const hut: Record<string, string> = floor(64, "grass_block", 40);
  const { walls, roof, door } = layout(1);
  for (const cell of [...floorCells(), ...walls, ...roof, ...door]) hut[`${cell.x},${64 + cell.y},${cell.z}`] = "oak_planks";
  const at = (x: number, mobs: Array<ReturnType<typeof zombie>>) => {
    const { bot } = fakeBot({ position: { x, y: 64, z: 0.5 }, blocks: hut, entities: mobs });
    return refuge(bot, [spot], Object.values(bot.entities));
  };
  assert.deepEqual(at(20.5, [zombie(28.5, 0.5)]), spot, "the zombie is east, the shelter west: run home");
  assert.equal(at(20.5, [zombie(10.5, 0.5)]), null, "the zombie stands between the agent and the shelter");
  assert.equal(at(20.5, [zombie(28.5, 0.5), zombie(0.5, 6.5)]), null, "a mob at the doorway");
  assert.equal(at(60.5, [zombie(68.5, 0.5)]), null, "too far to run to");
});
