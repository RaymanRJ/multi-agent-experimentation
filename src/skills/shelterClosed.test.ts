import { test } from "node:test";
import assert from "node:assert/strict";
import { Vec3 } from "vec3";
import { floorCells, insideClosedShelter, layout } from "./buildShelter.js";
import { context, fakeBot, floor } from "../testing/fakeBot.js";
import { observe } from "../observe.js";

const spot = { x: 0, y: 64, z: 0, storeys: 1 };
/** Every floor, wall, roof and doorway cell of a one-storey shelter at the origin, minus `skip`. */
function hut(skip: Vec3[] = []): Record<string, string> {
  const { walls, roof, door } = layout(1);
  const blocks: Record<string, string> = {};
  for (const cell of [...floorCells(), ...walls, ...roof, ...door]) {
    if (skip.some((s) => s.equals(cell))) continue;
    blocks[`${cell.x},${64 + cell.y},${cell.z}`] = "oak_planks";
  }
  return blocks;
}

test("insideClosedShelter - inside a whole shelter, yes; a floor hole, an open doorway or standing outside, no", () => {
  const inside = { x: 0.5, y: 64, z: 0.5 };
  assert.equal(insideClosedShelter(fakeBot({ blocks: hut(), position: inside }).bot, spot), true);
  assert.equal(insideClosedShelter(fakeBot({ blocks: hut([new Vec3(-1, -1, -1)]), position: inside }).bot, spot), false, "floor hole");
  assert.equal(insideClosedShelter(fakeBot({ blocks: hut([new Vec3(0, 1, 2)]), position: inside }).bot, spot), false, "doorway open");
  assert.equal(insideClosedShelter(fakeBot({ blocks: hut(), position: { x: 5.5, y: 64, z: 0.5 } }).bot, spot), false, "outside");
});

test("observe - inShelter only when the agent says so", () => {
  const base = { step: 1, scenario: "survival" as const, goal: "", recentEvents: [] as string[] };
  const { bot } = fakeBot();
  assert.equal(observe(bot, { ...base, inShelter: true }).inShelter, true);
  assert.equal("inShelter" in observe(bot, base), false);
});

test("layout - a large shelter has a 5x5 interior: about 85 blocks one storey, 170 two, the doorway one further out", async () => {
  const count = (storeys: number) => { const l = layout(storeys, 5); return l.walls.length + l.roof.length; };
  assert.equal(count(1), 38 + 45);
  assert.equal(count(2), 98 + 45 + 24);
  assert.deepEqual(layout(1, 5).door.map((v) => v.z), [3, 3]);
  assert.equal(floorCells(5).length, 26);
  const big = { x: 0, y: 64, z: 0, storeys: 1, size: 5 as const };
  const blocks: Record<string, string> = {};
  const { walls, roof, door } = layout(1, 5);
  for (const cell of [...floorCells(5), ...walls, ...roof, ...door]) blocks[`${cell.x},${64 + cell.y},${cell.z}`] = "oak_planks";
  assert.equal(insideClosedShelter(fakeBot({ blocks, position: { x: 2.5, y: 64, z: -1.5 } }).bot, big), true, "a corner of the big room is inside");
  assert.equal(insideClosedShelter(fakeBot({ blocks, position: { x: 2.5, y: 64, z: -1.5 } }).bot, { ...big, size: 3 }), false, "but not of a small one");
});

test("standing - a shelter whose walls are gone is not offered; describeShelter names its kind", async () => {
  const { standing, describeShelter } = await import("./buildShelter.js");
  assert.equal(standing(fakeBot({ blocks: hut() }).bot, spot), true);
  // fakeBot has air everywhere it has no block, so an empty world has no walls.
  assert.equal(standing(fakeBot({ blocks: floor(64) }).bot, spot), false);
  assert.equal(describeShelter({ ...spot, storeys: 2, size: 5 }), "a large two-storey shelter");
  assert.equal(describeShelter({ ...spot, size: 5, complete: false }), "an unfinished large shelter");
  assert.equal(describeShelter(spot), "a shelter");
});

test("mergeShelters - one entry per spot, finished if anyone saw it finished", async () => {
  const { mergeShelters } = await import("../team.js");
  const merged = mergeShelters([[{ ...spot, size: 5, complete: false, by: "qa" }], [{ ...spot, size: 5, complete: true, by: "qb" }], [{ x: 9, y: 64, z: 9, storeys: 1 }]]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0]!.complete, true);
  assert.equal(merged[0]!.by, "qa", "the starter keeps the credit");
});

test("build_shelter - with a shelter in reach it goes there instead of building; one out of reach is ignored", async () => {
  const { buildShelter } = await import("./buildShelter.js");
  const { bot } = fakeBot({ blocks: hut(), position: { x: 20.5, y: 64, z: 0.5 }, inventory: {} });
  const near = await buildShelter.run({ ...context(bot), shelters: () => [{ ...spot, by: "qa" }] }, {});
  assert.match(near.reason ?? "", /could not get into a shelter at 0,64,0/, "it set off for the known shelter (the fake bot cannot walk)");
  const far = fakeBot({ blocks: hut(), position: { x: 60.5, y: 64, z: 0.5 }, inventory: {} }).bot;
  const built = await buildShelter.run({ ...context(far), shelters: () => [spot] }, {});
  assert.match(built.reason ?? "", /need \d+ more building blocks/, "too far: it tries to build here, and has no blocks");
});
