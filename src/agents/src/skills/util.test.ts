import { test } from "node:test";
import assert from "node:assert/strict";
import { context, fakeBot } from "../testing/fakeBot.js";
import { Vec3 } from "vec3";
import { groundAbove, nearestUncrowded, onTreetops, opensOnClick, spareGoodTools, threatened } from "./util.js";

test("threatened - for digging, a mob behind solid rock doesn't count; one in view or right beside does", () => {
  const creeper = (x: number) => ({ name: "creeper", type: "hostile", position: { x, y: 64, z: 0.5 } });
  // A wall of stone 3 high at x = 3, between the agent and a creeper in the next cave.
  const wall: Record<string, string> = {};
  for (let y = 63; y <= 67; y++) for (let z = -3; z <= 3; z++) wall[`3,${y},${z}`] = "stone";
  const at = (x: number, blocks: Record<string, string>) => context(fakeBot({ position: { x: 0.5, y: 64, z: 0.5 }, blocks, entities: [creeper(x)] }).bot);
  assert.equal(threatened(at(6.5, wall), 8, true), null, "behind the wall");
  assert.match(threatened(at(6.5, wall)) ?? "", /creeper is 6 blocks away/, "the old rule: any mob near");
  assert.match(threatened(at(6.5, {}), 8, true) ?? "", /creeper is 6 blocks away/, "nothing between them");
  assert.match(threatened(at(2.0, wall), 8, true) ?? "", /creeper is 2 blocks away/, "right beside: counts, wall or not");
});

test("opensOnClick - tables, furnaces, beds and doors open; building blocks don't", () => {
  for (const name of ["crafting_table", "furnace", "chest", "red_bed", "oak_door", "spruce_trapdoor", "stone_button"]) {
    assert.equal(opensOnClick(name), true, name);
  }
  for (const name of ["dirt", "cobblestone", "dark_oak_planks", "oak_log", "stone"]) assert.equal(opensOnClick(name), false, name);
});

test("nearestUncrowded - nearest first, but targets beside another agent last, never dropped", async () => {
  const { fakeBot } = await import("../testing/fakeBot.js");
  const { Vec3 } = await import("vec3");
  const { bot } = fakeBot({ entities: [{ name: "player", type: "player", username: "qwen", position: { x: 2.5, y: 64, z: 0.5 } }] });
  const near = new Vec3(3, 64, 0), mid = new Vec3(-6, 64, 0), far = new Vec3(0, 64, 12);
  assert.deepEqual(nearestUncrowded(bot, [far, near, mid]), [mid, far, near]);
  assert.deepEqual(nearestUncrowded(fakeBot().bot, [far, near, mid]), [near, mid, far], "alone: plain nearest first");
});

test("build_shelter layout - one storey needs 43 blocks, two storeys 87 with a hatch between the rooms", async () => {
  const { layout } = await import("./buildShelter.js");
  const count = (l: ReturnType<typeof layout>) => l.walls.length + l.roof.length;
  assert.equal(count(layout(1)), 43);
  const two = layout(2);
  assert.equal(count(two), 87);
  assert.equal(Math.max(...two.roof.map((c) => c.y)), 5);
  assert.equal(two.roof.filter((c) => c.y === 2).length, 8, "a floor of 9 cells less the hatch");
});

test("groundAbove - solid blocks over the head, leaves not counted", async () => {
  const { fakeBot, floor } = await import("../testing/fakeBot.js");
  assert.equal(groundAbove(fakeBot({ blocks: floor(64) }).bot), 0, "open sky");
  assert.equal(groundAbove(fakeBot({ blocks: { ...floor(64), "0,70,0": "oak_leaves" } }).bot), 0, "under a tree");
  assert.equal(groundAbove(fakeBot({ blocks: { "0,66,0": "oak_planks" } }).bot), 1, "a shelter roof");
  const cave = { "0,66,0": "stone", "0,67,0": "stone", "0,68,0": "water", "0,75,0": "dirt", "0,76,0": "grass_block" };
  assert.equal(groundAbove(fakeBot({ blocks: cave }).bot), 4, "water isn't solid");
});

test("onTreetops - on leaves with a drop beneath, not on leaves over ground nor on grass", () => {
  const at = { x: 0, y: 81, z: 0 };
  const canopy = { "0,80,0": "dark_oak_leaves", "0,79,0": "dark_oak_leaves", "0,72,0": "grass_block" };
  assert.equal(onTreetops(fakeBot({ position: at, blocks: canopy }).bot), true);
  // Leaves all the way down to the ground: a bush, nothing to fall through.
  const bush = { "0,80,0": "oak_leaves", "0,79,0": "dirt" };
  assert.equal(onTreetops(fakeBot({ position: at, blocks: bush }).bot), false);
  assert.equal(onTreetops(fakeBot({ position: at, blocks: { "0,80,0": "grass_block" } }).bot), false);
});

test("spareGoodTools - digs with the cheapest tool quick enough, an iron one only when nothing cheaper is", () => {
  const pick = (inventory: Record<string, number>, block: string) => {
    const { bot } = fakeBot({ inventory, blocks: { "0,64,0": block } });
    (bot.pathfinder as unknown as { bestHarvestTool: unknown }).bestHarvestTool = () => ({ name: "fastest" });
    spareGoodTools(bot);
    return (bot.pathfinder.bestHarvestTool(bot.blockAt(new Vec3(0, 64, 0))!) as { name: string } | null)?.name ?? "hand";
  };
  assert.equal(pick({ iron_pickaxe: 1, stone_pickaxe: 1 }, "stone"), "stone_pickaxe");
  assert.equal(pick({ iron_pickaxe: 1 }, "dirt"), "hand", "a hand digs dirt quickly enough");
  assert.equal(pick({ iron_pickaxe: 1, cobblestone: 4 }, "dirt"), "cobblestone", "held in place of the pickaxe, it digs as a hand does");
  assert.equal(pick({ iron_pickaxe: 1 }, "stone"), "fastest", "stone by hand takes 7.5 s: the iron one is used");
});
