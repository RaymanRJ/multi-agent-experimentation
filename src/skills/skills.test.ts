/**
 * Each skill's checks before it acts, and the messages a model reads when it can't: run against a
 * fake bot that carries the real game data (src/testing/fakeBot.ts). What happens once a skill
 * moves, digs or places is checked live by scripts/skill-smoke.sh.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { SKILLS, findSkill } from "./index.js";
import { runSkill } from "./util.js";
import { context, fakeBot, floor } from "../testing/fakeBot.js";

const run = (name: string, setup: Parameters<typeof fakeBot>[0], args: Record<string, unknown> = {}, stop = false) => {
  const { bot } = fakeBot(setup);
  return findSkill(name)!.run(context(bot, stop), args);
};
const zombie = (distance: number) => ({ name: "zombie", type: "hostile", position: { x: 0.5 + distance, y: 64, z: 0.5 } });

test("skill list - unique names, a description and args for each, found by name", () => {
  const names = SKILLS.map((skill) => skill.name);
  assert.equal(new Set(names).size, names.length);
  for (const skill of SKILLS) {
    assert.ok(skill.description.length > 40, `${skill.name} has a real description`);
    for (const [arg, type] of Object.entries(skill.args)) {
      assert.ok(type === "number" || type === "string", `${skill.name}.${arg}`);
      assert.match(skill.description, new RegExp(arg), `${skill.name}'s description explains ${arg}`);
    }
    assert.equal(findSkill(skill.name), skill);
  }
  assert.equal(findSkill("teleport"), undefined);
});

test("eat - not hungry, no food, and the most filling safe food first", async () => {
  assert.equal((await run("eat", { food: 20 })).status, "success");
  const none = await run("eat", { food: 10, inventory: { cobblestone: 5 } });
  assert.deepEqual([none.status, none.reason], ["failed", "no food in inventory"]);
  const onlyBad = await run("eat", { food: 10, inventory: { rotten_flesh: 3 } });
  assert.equal(onlyBad.status, "failed", "rotten flesh is never eaten");
  const ate = await run("eat", { food: 10, inventory: { apple: 1, cooked_beef: 1, rotten_flesh: 1 } });
  assert.equal(ate.status, "success");
  assert.equal(ate.detail?.["ate"], "cooked_beef");
});

test("wait - clamps its seconds and stops when the run ends", async () => {
  assert.deepEqual((await run("wait", {}, { seconds: 500 })).detail, { seconds: 60 });
  assert.deepEqual((await run("wait", {}, { seconds: "soon" })).detail, { seconds: 5 });
  const stopped = await run("wait", {}, { seconds: 30 }, true);
  assert.deepEqual([stopped.status, stopped.reason], ["aborted", "the run is ending"]);
});

test("sleep - refuses by day, with monsters near, and with no bed", async () => {
  assert.match((await run("sleep", { timeOfDay: 6000 })).reason!, /daytime/);
  assert.match((await run("sleep", { timeOfDay: 18000, entities: [zombie(3)] })).reason!, /monsters nearby/);
  assert.equal((await run("sleep", { timeOfDay: 18000 })).reason, "no bed nearby or in inventory");
});

test("mine_ore - names the valid ores, the pickaxe needed, and where the ore is", async () => {
  assert.match((await run("mine_ore", {}, { ore: "gravel" })).reason!, /not an ore — use one of coal, .*iron.*diamond/);
  assert.match((await run("mine_ore", { inventory: { wooden_pickaxe: 1 } }, { ore: "iron" })).reason!, /iron ore needs at least a stone_pickaxe/);
  assert.match((await run("mine_ore", { inventory: { stone_pickaxe: 1 } }, { ore: "diamond" })).reason!, /needs at least a iron_pickaxe|needs at least an iron_pickaxe/);
  const nothing = await run("mine_ore", { inventory: { stone_pickaxe: 1 } }, { ore: "iron" });
  assert.equal(nothing.status, "failed");
  assert.match(nothing.reason!, /no iron ore in reach/);
  // Ore far below, in a cave wall a player could see: point the model at it.
  const below = await run("mine_ore", {
    inventory: { stone_pickaxe: 1 },
    blocks: { "0,40,0": "iron_ore", "1,40,0": "air", "0,39,0": "stone" },
  }, { ore: "iron" });
  assert.match(below.reason!, /blocks below you — descend closer first/);
  const stopped = await run("mine_ore", { inventory: { stone_pickaxe: 1 } }, { ore: "iron" }, true);
  assert.equal(stopped.status, "aborted");
  const chased = await run("mine_ore", { inventory: { stone_pickaxe: 1 }, entities: [zombie(4)] }, { ore: "coal" });
  assert.match(chased.reason!, /stopped mining because zombie/);
});

test("mine_stone - needs a pickaxe first", async () => {
  assert.equal((await run("mine_stone", {}, { count: 3 })).reason, "need a wooden_pickaxe — craft one first");
});

test("gather_wood - a count it already holds is a success with nothing to do; it stops for a mob or the end", async () => {
  const enough = await run("gather_wood", { inventory: { oak_log: 12 } }, { count: 10 });
  assert.equal(enough.status, "success");
  assert.match(enough.reason!, /already have 12 logs/);
  assert.equal((await run("gather_wood", {}, { count: 5 }, true)).status, "aborted");
  assert.match((await run("gather_wood", { entities: [zombie(3)] }, { count: 5 })).reason!, /stopped gathering because zombie/);
});

test("explore - stops for a mob or the end, and gives up when every way is blocked", async () => {
  assert.equal((await run("explore", {}, { distance: 32 }, true)).status, "aborted");
  assert.match((await run("explore", { entities: [zombie(3)] }, { distance: 32 })).reason!, /stopped exploring because zombie/);
  const blocked = await run("explore", { blocks: floor(64) }, { distance: 32 });
  assert.equal(blocked.status, "failed");
  assert.match(blocked.reason!, /gave up after \d+ attempts to walk onward were blocked/);
});

test("flee - nothing to flee from is a quick success", async () => {
  const calm = await run("flee", {}, { distance: 24 });
  assert.deepEqual([calm.status, calm.detail], ["success", { note: "no threat" }]);
});

test("flee - cornered with nothing to build with fails and says why", async () => {
  const cornered = await run("flee", { entities: [zombie(3)], blocks: floor(64) }, { distance: 24 });
  assert.equal(cornered.status, "failed");
  assert.match(cornered.reason!, /could not wall yourself in .*no dirt, cobblestone or planks/);
});

test("smelt - names what it can smelt, the raw item short, and the fuel short", async () => {
  assert.match((await run("smelt", {}, { item: "diamond" })).reason!, /not something this can smelt — use one of .*iron_ingot/);
  const short = await run("smelt", { inventory: { raw_iron: 1 } }, { item: "iron_ingot", count: 3 });
  assert.equal(short.reason, "need 2 more raw_iron to make 3 iron_ingot");
  const byRaw = await run("smelt", { inventory: { raw_iron: 1 } }, { item: "raw_iron", count: 3 });
  assert.equal(byRaw.reason, "need 2 more raw_iron to make 3 iron_ingot", "the raw name works too");
  const cold = await run("smelt", { inventory: { raw_iron: 3 } }, { item: "iron_ingot", count: 3 });
  assert.match(cold.reason!, /not enough fuel to smelt 3 raw_iron: carry coal/);
});

test("descend and tunnel - need a pickaxe, and keep an iron one for ore", async () => {
  assert.match((await run("descend", { blocks: floor(64, "stone") }, { y: 16 })).reason!, /need a pickaxe to dig/);
  assert.match((await run("tunnel", { blocks: floor(64, "stone") }, { length: 8 })).reason!, /need a pickaxe to dig/);
  const saving = await run("descend", { inventory: { iron_pickaxe: 1 }, worn: { iron_pickaxe: 240 }, blocks: floor(64, "stone") }, { y: 16 });
  assert.match(saving.reason!, /stopped to save your iron_pickaxe \(10 uses left\) for mining ore/);
});

test("runSkill - an error a skill didn't catch becomes a failed result, and the pathfinder is stopped", async () => {
  const { bot } = fakeBot();
  let cleared = false;
  bot.pathfinder.setGoal = () => { cleared = true; };
  const broken = { name: "broken", description: "", args: {}, run: async () => { throw new Error("boom"); } };
  const result = await runSkill(broken, context(bot), {});
  assert.deepEqual(result, { status: "failed", reason: "broken hit an unexpected error: boom" });
  assert.ok(cleared);
  const fine = await runSkill(findSkill("wait")!, context(bot), { seconds: 1 });
  assert.equal(fine.status, "success");
});

const teammate = (distance: number) => ({ name: "player", type: "player", username: "qwen", position: { x: 0.5 + distance, y: 64, z: 0.5 } });

test("give - says what's missing before it moves", async () => {
  const has = { inventory: { cobblestone: 5 }, entities: [teammate(1)] };
  assert.match((await run("give", has, { item: "cobblestone" })).reason!, /say who to give to/);
  assert.match((await run("give", has, { to: "tester", item: "cobblestone" })).reason!, /yourself/);
  assert.match((await run("give", has, { to: "qwen" })).reason!, /say what to give/);
  assert.match((await run("give", has, { to: "qwen", item: "cobble" })).reason!, /no item called cobble/);
  assert.match((await run("give", has, { to: "qwen", item: "stick" })).reason!, /you have no stick to give/);
  assert.match((await run("give", { inventory: { cobblestone: 5 } }, { to: "qwen", item: "cobblestone" })).reason!, /qwen is not in sight/);
  assert.equal((await run("give", has, { to: "qwen", item: "cobblestone" }, true)).status, "aborted");
});

test("give - reports a teammate it can't reach", async () => {
  const result = await run("give", { inventory: { cobblestone: 5 }, entities: [teammate(12)] }, { to: "qwen", item: "cobblestone" });
  assert.equal(result.status, "failed");
  assert.match(result.reason!, /could not reach qwen/);
});

test("give - tosses no more than it holds, and succeeds when the teammate picks it up", async () => {
  const { bot, calls, emit, setInventory } = fakeBot({ inventory: { cobblestone: 5 }, entities: [teammate(1.5)] });
  const pending = findSkill("give")!.run(context(bot), { to: "QWEN", item: "cobblestone", count: 9 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(calls, ["chat @qwen bringing you 5 cobblestone, stay where you are", "toss 5 cobblestone"], "already beside them: no walking, and only the 5 it has");
  emit("playerCollect", { username: "someone_else" }, {});
  emit("playerCollect", { username: "qwen" }, {});
  setInventory({});
  assert.deepEqual(await pending, { status: "success", detail: { gave: 5, item: "cobblestone", to: "QWEN" } });
});

test("pick_up - fails plainly when nothing is lying nearby", async () => {
  assert.match((await run("pick_up", {})).reason!, /no dropped item within 8 blocks/);
  assert.match((await run("pick_up", { entities: [zombie(3)] }, { item: "cobblestone" })).reason!, /no dropped cobblestone/);
});

test("give - owns up when some of the toss came back to the giver", async () => {
  const { bot, emit, setInventory } = fakeBot({ inventory: { cobblestone: 5 }, entities: [teammate(1)] });
  const pending = findSkill("give")!.run(context(bot), { to: "qwen", item: "cobblestone", count: 3 });
  await new Promise((resolve) => setImmediate(resolve));
  emit("playerCollect", { username: "qwen" }, {});
  setInventory({ cobblestone: 4 });
  const result = await pending;
  assert.equal(result.status, "success");
  assert.match(result.reason!, /qwen got 1 of the 3 cobblestone; the rest came back to you/);
});
