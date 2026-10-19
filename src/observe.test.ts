import { test } from "node:test";
import assert from "node:assert/strict";
import { observe } from "./observe.js";
import { fakeBot } from "./testing/fakeBot.js";

const base = { step: 3, scenario: "survival" as const, goal: "Craft a stone pickaxe.", recentEvents: [] as string[] };

test("observe - position, vitals, inventory and time, compressed", () => {
  const { bot } = fakeBot({ position: { x: 10.4, y: 70, z: -3.6 }, health: 17.5, food: 12, timeOfDay: 9000, inventory: { oak_log: 3, cobblestone: 2 } });
  const o = observe(bot, base);
  assert.deepEqual(o.position, { x: 10, y: 70, z: -4 });
  assert.equal(o.health, 18);
  assert.equal(o.food, 12);
  assert.equal(o.isDay, true);
  assert.equal(o.ticksUntilNight, 3000);
  assert.deepEqual(o.inventory, { oak_log: 3, cobblestone: 2 });
});

test("observe - at night there is no countdown", () => {
  const o = observe(fakeBot({ timeOfDay: 15000 }).bot, base);
  assert.equal(o.isDay, false);
  assert.equal("ticksUntilNight" in o, false);
});

test("observe - counts nearby blocks of interest only, and only ore a player could see", () => {
  const { bot } = fakeBot({
    blocks: {
      "3,64,0": "oak_log", "3,65,0": "oak_log", "4,63,0": "dirt",
      "5,63,0": "iron_ore", // open air above: visible
      "8,40,8": "coal_ore", "8,41,8": "stone", "8,39,8": "stone", "9,40,8": "stone", "7,40,8": "stone", "8,40,9": "stone", "8,40,7": "stone",
    },
  });
  const o = observe(bot, base);
  assert.equal(o.nearbyBlocks["oak_log"], 2);
  assert.equal(o.nearbyBlocks["dirt"], undefined, "dirt is not of interest");
  assert.equal(o.nearbyBlocks["iron_ore"], 1);
  assert.equal(o.nearbyBlocks["coal_ore"], undefined, "buried ore is not seen");
});

test("observe - hostiles nearest first, at most five; other agents with what they are doing", () => {
  const { bot } = fakeBot({
    entities: [
      ...[9, 3, 15, 6, 12, 20].map((d) => ({ name: "zombie", type: "hostile", position: { x: 0.5 + d, y: 64, z: 0.5 } })),
      { name: "player", type: "player", position: { x: 10.5, y: 64, z: 0.5 } },
    ],
  });
  (Object.values(bot.entities).find((e) => e.type === "player") as { username?: string }).username = "qa";
  const o = observe(bot, { ...base, activities: new Map([["qa", "gather_wood"]]) });
  assert.deepEqual(o.hostiles.map((h) => h.distance), [3, 6, 9, 12, 15]);
  assert.deepEqual(o.otherAgents, [{ name: "qa", distance: 10, doing: "gather_wood" }]);
});

test("observe - optional fields appear only when given", () => {
  const bare = observe(fakeBot().bot, base);
  for (const field of ["messages", "stillNeeded", "plan", "canCraft"]) assert.equal(field in bare, false, field);
  const full = observe(fakeBot({ inventory: { oak_log: 3 } }).bot, {
    ...base, recentEvents: ["a", "b", "c", "d", "e", "f", "g"], messages: [], stillNeeded: ["you have no stone_pickaxe"], plan: "wood, then stone",
  });
  assert.deepEqual(full.stillNeeded, ["you have no stone_pickaxe"]);
  assert.equal(full.plan, "wood, then stone");
  assert.deepEqual(full.recentEvents, ["b", "c", "d", "e", "f", "g"], "the last six events");
  assert.ok(full.canCraft?.includes("wooden_pickaxe"));
  assert.equal("stillNeeded" in observe(fakeBot().bot, { ...base, stillNeeded: [] }), false, "an empty list is left out");
});

test("observe - underground only under 3 or more blocks of ground, not under a shelter roof", () => {
  const rock = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`0,${66 + i},0`, "stone"]));
  assert.equal("underground" in observe(fakeBot().bot, base), false, "open sky");
  assert.equal("underground" in observe(fakeBot({ blocks: rock(1) }).bot, base), false, "a roof");
  assert.equal(observe(fakeBot({ blocks: rock(20) }).bot, base).underground, 20);
});
