import { test } from "node:test";
import assert from "node:assert/strict";
import { Vec3 } from "vec3";
import { burrow, enclosed, enclosure, flee, homeAbove } from "./flee.js";
import { context, fakeBot, floor } from "../testing/fakeBot.js";

/** Solid ground from y 55 to 63 round 0,0, the agent standing on it at y 64. */
function ground(block = "dirt", extra: Record<string, string> = {}): Record<string, string> {
  const blocks: Record<string, string> = {};
  for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) for (let y = 55; y <= 63; y++) blocks[`${x},${y},${z}`] = block;
  return { ...blocks, ...extra };
}

test("burrow - won't dig in on rock without a pickaxe, beside water, or over a cave", async () => {
  const at = { x: 0.5, y: 64, z: 0.5 };
  const tryIn = (blocks: Record<string, string>, inventory: Record<string, number> = {}) => {
    const { bot } = fakeBot({ position: at, blocks, inventory });
    (bot.pathfinder as unknown as { bestHarvestTool: unknown }).bestHarvestTool = () => null;
    return burrow(bot);
  };
  assert.match((await tryIn(ground("stone"))) ?? "", /stone below is too slow to dig without a pickaxe/);
  assert.match((await tryIn(ground("dirt", { "1,62,0": "water" }))) ?? "", /water beside/);
  const cave = ground("dirt");
  delete cave["0,60,0"];
  assert.match((await tryIn(cave)) ?? "", /no solid floor/);
});

test("enclosed - shut in on every side at feet and head and over the head; open on one side is not", () => {
  const at = { x: 0.5, y: 61, z: 0.5 };
  const hole = ground("dirt");
  for (const y of [61, 62]) delete hole[`0,${y},0`];
  assert.equal(enclosed(fakeBot({ position: at, blocks: hole }).bot), true);
  const zombie = { name: "zombie", type: "hostile", position: { x: 0.6, y: 61, z: 0.4 } };
  assert.equal(enclosed(fakeBot({ position: at, blocks: hole, entities: [zombie] }).bot), false, "shut in with a zombie (bpoc9)");
  delete hole["1,62,0"];
  assert.equal(enclosed(fakeBot({ position: at, blocks: hole }).bot), false);
});

test("enclosure - every cell has a filled or solid neighbour by the time it is placed", () => {
  const feet = new Vec3(0, 64, 0);
  const cells = enclosure(feet);
  assert.equal(cells.length, 10);
  const key = (v: Vec3) => `${v.x},${v.y},${v.z}`;
  const filled = new Set<string>();
  const floor = (v: Vec3) => v.y === feet.y - 1;
  const faces = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const;
  for (const cell of cells) {
    const supported = faces.some(([x, y, z]) => {
      const n = cell.offset(x, y, z);
      return floor(n) || filled.has(key(n));
    });
    assert.ok(supported, `nothing to build ${key(cell)} against`);
    filled.add(key(cell));
  }
  assert.ok(filled.has(key(feet.offset(0, 2, 0))), "covers the head");
  assert.ok(!filled.has(key(feet)) && !filled.has(key(feet.offset(0, 1, 0))), "leaves the bot's own space open");
});

test("flee - paths that fail after a run report the run, not being cornered", async () => {
  const { bot } = fakeBot({ position: { x: 0, y: 64, z: 0 }, blocks: floor(64, "stone", 40), entities: [{ name: "zombie", type: "hostile", position: { x: 5, y: 64, z: 0 } }] });
  const zombie = Object.values(bot.entities)[0]!;
  let legs = 0;
  bot.pathfinder.goto = (async () => {
    if (legs++ > 0) throw new Error("no path");
    bot.entity.position = new Vec3(-20, 64, 0); // got 20 blocks away; the zombie keeps up
    zombie.position = new Vec3(-12, 64, 0);
  }) as never;
  const result = await flee.run(context(bot), { distance: 32 });
  assert.equal(result.status, "failed");
  assert.match(result.reason ?? "", /^ran 20 blocks but 1 hostile/);
  assert.doesNotMatch(result.reason ?? "", /could not find a path away/);
});

/** Solid stone from y 55 to 75 round 0,0, with a tunnel 2 high along x at y 64 from x = `from` to `to`. */
function rock(from: number, to: number): Record<string, string> {
  const blocks: Record<string, string> = {};
  for (let x = -14; x <= 14; x++) for (let z = -3; z <= 3; z++) for (let y = 55; y <= 75; y++) blocks[`${x},${y},${z}`] = "stone";
  for (let x = from; x <= to; x++) for (const y of [64, 65]) delete blocks[`${x},${y},0`];
  return blocks;
}

test("flee - underground, runs along a tunnel at its own height; boxed in, digs in or walls in where it stands and points up", async () => {
  const zombie = () => ({ name: "zombie", type: "hostile", position: { x: -2.5, y: 64, z: 0.5 } });
  const open = fakeBot({ position: { x: 0.5, y: 64, z: 0.5 }, blocks: rock(-4, 14), entities: [zombie()], inventory: { cobblestone: 16 } });
  const legs: Array<{ x: number; y: number; z: number }> = [];
  open.bot.pathfinder.goto = (async (goal: { x: number; y: number; z: number }) => {
    legs.push(goal);
    open.bot.entity.position = new Vec3(goal.x + 0.5, goal.y, goal.z + 0.5);
  }) as never;
  const ran = await flee.run(context(open.bot), { distance: 10 });
  assert.equal(ran.status, "success");
  assert.equal(legs[0]?.y, 64, "aimed at the tunnel floor, not at x and z alone");
  assert.ok((legs[0]?.x ?? 0) > 0, "away from the zombie");

  // A dead end: no floor along or up within reach. Shut in where it stands (dug in, since 8 November: in live caves
  // walling in out in the open failed 3 of 3 and digging in saved 3 of 3), told the monsters stay and the way up.
  const shut = fakeBot({ position: { x: 0.5, y: 64, z: 0.5 }, blocks: rock(-4, 1), entities: [zombie()], inventory: { cobblestone: 16 } });
  shut.bot.placeBlock = (async (reference: { position: Vec3 }, face: Vec3) => {
    shut.world.set(`${reference.position.x + face.x},${reference.position.y + face.y},${reference.position.z + face.z}`, "cobblestone");
  }) as never;
  const walled = await flee.run(context(shut.bot), { distance: 10 });
  assert.equal(walled.status, "success");
  assert.match(walled.reason ?? "", /(dug in|walled yourself in).*climb_out digs you up to the surface/);
  assert.ok(!shut.calls.includes("goto"), "never ran into the rock");
});

test("flee - under a known home, tries its doorway and never walls in; says climb_out is the way up", async () => {
  const home = { x: 0, y: 74, z: 0, size: 5 as const, storeys: 1, by: "lc" };
  const zombie = { name: "zombie", type: "hostile", position: { x: -2.5, y: 64, z: 0.5 } };
  const under = fakeBot({ position: { x: 0.5, y: 64, z: 0.5 }, blocks: rock(-4, 1), entities: [zombie], inventory: { cobblestone: 16 } });
  let placed = 0;
  under.bot.placeBlock = (async () => { placed++; }) as never;
  const ctx = { ...context(under.bot), shelters: () => [home] };
  assert.deepEqual(homeAbove(under.bot, [home]), home);
  const result = await flee.run(ctx, { distance: 10 });
  assert.equal(result.status, "failed");
  assert.match(result.reason ?? "", /under a large shelter at 0,74,0 .* climb_out digs you up/);
  assert.equal(placed, 0, "no walls under a home");
  assert.ok(ctx.logged.some((line) => /could not get up into the shelter above you/.test(line)), "tried its doorway first");
  // Beside it, or far under it, is not under it.
  assert.equal(homeAbove(fakeBot({ position: { x: 6.5, y: 64, z: 0.5 } }).bot, [home]), null);
  assert.equal(homeAbove(fakeBot({ position: { x: 0.5, y: 60, z: 0.5 } }).bot, [home]), null);
});
