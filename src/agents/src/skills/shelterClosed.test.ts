import { test } from "node:test";
import assert from "node:assert/strict";
import { Vec3 } from "vec3";
import { floorCells, followers, hostilesAtDoorway, hostilesInside, intrudersIn, insideClosedShelter, layout, mobsAtDoorwayNote, mobsInsideNote, whyOpen } from "./buildShelter.js";
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

test("layout - a large shelter is one 5x5 room, 3 high: about 105 blocks, the doorway one further out and 2 high", async () => {
  const count = (storeys: number) => { const l = layout(storeys, 5); return l.walls.length + l.roof.length; };
  // a ring of 20 wall cells a layer (corners left out), 3 layers, less the doorway; the roof over ring and room
  assert.equal(count(1), 3 * 20 - 2 + (20 + 25));
  assert.equal(count(2), count(1), "no second storey on a large one");
  assert.deepEqual(layout(1, 5).door.map((v) => v.z), [3, 3]);
  assert.deepEqual(layout(1, 5).door.map((v) => v.y), [0, 1]);
  assert.equal(floorCells(5).length, 26);
  // a hut keeps its option of a second room
  const hut = (storeys: number) => { const l = layout(storeys, 3); return l.walls.length + l.roof.length; };
  assert.ok(hut(2) > hut(1));
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
  assert.equal(describeShelter({ ...spot, storeys: 2, size: 5 }), "a large shelter", "a large one is one tall room, whatever an old spot says");
  assert.equal(describeShelter({ ...spot, storeys: 2 }), "a two-storey shelter");
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

test("build_shelter - a large one goes back to the agent's own large shelter far off, and to a teammate's within 80 blocks", async () => {
  const { buildShelter } = await import("./buildShelter.js");
  const base = { x: 0, y: 64, z: 0, storeys: 2, size: 5 as const, complete: true };
  const blocks: Record<string, string> = {};
  const { walls, roof, door } = layout(2, 5);
  for (const cell of [...floorCells(5), ...walls, ...roof, ...door]) blocks[`${cell.x},${64 + cell.y},${cell.z}`] = "oak_planks";
  const at = (x: number) => fakeBot({ blocks, position: { x: x + 0.5, y: 64, z: 0.5 }, inventory: {} }).bot;
  const mine = at(100);
  mine.username = "qa";
  const own = await buildShelter.run({ ...context(mine), shelters: () => [{ ...base, by: "qa" }] }, { size: "large" });
  assert.match(own.reason ?? "", /could not get into a large shelter at 0,64,0/, "set off home, 100 blocks");
  const near = at(70);
  near.username = "qa";
  const toTheirs = await buildShelter.run({ ...context(near), shelters: () => [{ ...base, by: "qb" }] }, { size: "large" });
  assert.match(toTheirs.reason ?? "", /could not get into a large shelter at 0,64,0/, "a teammate's within 80 blocks: goes there rather than build a second home");
  const other = at(100);
  other.username = "qa";
  const theirs = await buildShelter.run({ ...context(other), shelters: () => [{ ...base, by: "qb" }] }, { size: "large" });
  assert.match(theirs.reason ?? "", /large shelter at 100,64,0/, "a teammate's beyond 80 blocks: it starts its own here");
});

test("hostilesInside - a mob within the walls is named; one outside them is not", () => {
  const inside = { x: 0.5, y: 64, z: 0.5 };
  const zombie = (x: number) => ({ name: "zombie_villager", type: "hostile", position: { x, y: 64, z: 0.5 } });
  const { bot } = fakeBot({ blocks: hut(), position: inside, entities: [zombie(1.5), zombie(4.5)] });
  assert.deepEqual(hostilesInside(bot, spot), ["zombie villager"]);
  assert.equal(mobsInsideNote(bot, spot), ", but a zombie villager is inside with you");
  assert.equal(mobsInsideNote(fakeBot({ blocks: hut(), position: inside, entities: [zombie(4.5)] }).bot, spot), "");
});

test("hostilesAtDoorway - mobs outside near the doorway are named, nearest first; far off or inside, not", () => {
  const mob = (name: string, x: number, z: number) => ({ name, type: "hostile", position: { x, y: 64, z } });
  const outside = { x: 20.5, y: 64, z: 0.5 };
  const { bot } = fakeBot({ blocks: hut(), position: outside, entities: [mob("skeleton", 0.5, 9.5), mob("zombie", 1.5, 4.5), mob("zombie", 0.5, 30.5), mob("spider", 0.5, 0.5)] });
  assert.deepEqual(hostilesAtDoorway(bot, spot), ["zombie", "skeleton"]);
  assert.equal(mobsAtDoorwayNote(bot, spot), ", with 2 hostile mobs (zombie, skeleton) at its doorway");
  assert.equal(mobsAtDoorwayNote(fakeBot({ blocks: hut(), position: outside, entities: [mob("zombie", 0.5, 30.5)] }).bot, spot), "");
});

test("build_shelter - stops short of a shelter with mobs at its doorway, and says why", async () => {
  const { buildShelter } = await import("./buildShelter.js");
  const zombie = { name: "zombie", type: "hostile", position: { x: 0.5, y: 64, z: 5.5 } };
  const { bot } = fakeBot({ blocks: hut(), position: { x: 20.5, y: 64, z: 0.5 }, inventory: {}, entities: [zombie] });
  const result = await buildShelter.run({ ...context(bot), shelters: () => [{ ...spot, by: "qb" }] }, {});
  assert.equal(result.status, "failed");
  assert.match(result.reason ?? "", /did not go to a shelter \(qb's\) at 0,64,0: a zombie is within 8 blocks of its doorway/);
  assert.equal(bot.entity.position.x, 20.5, "it stayed where it was");
});

test("doorWood - a wood with 6 planks, counting a log as 4, the one with most first (tluna7a: logs only)", async () => {
  const { doorWood } = await import("./buildShelter.js");
  assert.equal(doorWood({ dark_oak_log: 8, dark_oak_planks: 2 }), "dark_oak", "logs count: tluna7a's lc had 8 logs and 2 planks");
  assert.equal(doorWood({ oak_planks: 6 }), "oak");
  assert.equal(doorWood({ oak_planks: 5 }), null, "5 planks and no logs make no door");
  assert.equal(doorWood({ oak_planks: 4, birch_log: 3 }), "birch", "the wood with most");
  assert.equal(doorWood({ cobblestone: 64 }), null);
});

test("whyOpen - never says there are no blocks to an agent carrying some", () => {
  const ctx = (inventory: Record<string, number>) => context(fakeBot({ inventory }).bot);
  assert.match(whyOpen(ctx({ cobblestone: 31 }), 1, true), /^1 gap in it could not be filled from where you stand \(you may be standing in one\)/);
  assert.match(whyOpen(ctx({ cobblestone: 31 }), 0, false), /could not be filled from where you stand/);
  assert.match(whyOpen(ctx({}), 0, false), /no building block left/);
  assert.match(whyOpen(ctx({}), 4, false), /4 gaps in its walls open: you have no building blocks/);
  assert.match(whyOpen(ctx({}), 0, true), /its door would not shut/);
});

test("followers - a monster within 6 blocks of the door or of the agent would follow it through; far off or inside, not", () => {
  const mob = (name: string, x: number, z: number) => ({ name, type: "hostile", position: { x, y: 64, z } });
  const atDoor = { x: 0.5, y: 64, z: 3.5 };
  assert.deepEqual(followers(fakeBot({ blocks: hut(), position: atDoor, entities: [mob("zombie", 0.5, 8.5)] }).bot, spot), ["zombie"]);
  assert.deepEqual(followers(fakeBot({ blocks: hut(), position: atDoor, entities: [mob("zombie", 0.5, 12.5)] }).bot, spot), []);
  assert.deepEqual(followers(fakeBot({ blocks: hut(), position: atDoor, entities: [mob("zombie", 0.5, 0.5)] }).bot, spot), [], "already inside");
  const chased = fakeBot({ blocks: hut(), position: { x: 10.5, y: 64, z: 3.5 }, entities: [mob("zombie", 14.5, 3.5)] }).bot;
  assert.deepEqual(followers(chased, spot), ["zombie"], "on the agent's heels, far from the door");
  const inside = fakeBot({ blocks: hut(), position: { x: 0.5, y: 64, z: 0.5 }, entities: [mob("zombie", 1.5, 0.5), mob("zombie", 0.5, 9.5)] }).bot;
  assert.deepEqual(intrudersIn(inside, spot).map((e) => e.position.x), [1.5]);
});
