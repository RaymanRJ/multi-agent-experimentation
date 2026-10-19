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
      assert.ok(["number", "string", "number?", "string?"].includes(type), `${skill.name}.${arg}`);
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

test("sleep - refuses outside the hours beds work, with monsters near, and with no bed", async () => {
  assert.match((await run("sleep", { timeOfDay: 12191 })).reason!, /too early to sleep: beds can be used from about 12541 \(18 seconds from now\)/);
  assert.match((await run("sleep", { timeOfDay: 23500 })).reason!, /it is morning, too late to sleep/);
  assert.match((await run("sleep", { timeOfDay: 18000, entities: [zombie(3)] })).reason!, /monsters nearby/);
  assert.match((await run("sleep", { timeOfDay: 12600 })).reason!, /no bed nearby or in inventory — a bed is crafted from 3 wool and 3 planks, and wool comes from sheep/);
  const { bot } = fakeBot({ timeOfDay: 18000, blocks: { ...floor(64), "2,64,0": "red_bed" } });
  (bot as unknown as { parseBedMetadata: () => { occupied: boolean } }).parseBedMetadata = () => ({ occupied: true });
  const taken = await findSkill("sleep")!.run(context(bot), {});
  assert.match(taken.reason!, /^every bed nearby is taken by someone sleeping in it, and you have none to put down/);
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

test("gather_wood - a count it already holds fails, saying count is a total; it stops for a mob or the end", async () => {
  const enough = await run("gather_wood", { inventory: { oak_log: 12 } }, { count: 10 });
  assert.equal(enough.status, "failed");
  assert.match(enough.reason!, /already have 12 logs.*count is the total to hold.*ask for 22/);
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

test("climb_out - done under open sky; won't dig beside water, or start from it with nowhere dry", async () => {
  const sky = await run("climb_out", { blocks: floor(64, "stone") });
  assert.deepEqual([sky.status, sky.reason], ["success", "already under open sky"]);
  const roof: Record<string, string> = { ...floor(64, "stone") };
  for (let y = 66; y < 80; y++) for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) roof[`${x},${y},${z}`] = "stone";
  for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) roof[`${x},66,${z}`] = "water";
  const wet = await run("climb_out", { inventory: { wooden_pickaxe: 1 }, blocks: roof });
  assert.equal(wet.status, "failed");
  assert.match(wet.reason!, /under 14 blocks of ground: every way up is unsafe \((\w+: water behind the stone; ){4}straight up: above: water behind the stone\) — tunnel or walk somewhere else/);
  const swimming = await run("climb_out", { blocks: { ...roof, "0,64,0": "water" } });
  assert.match(swimming.reason!, /in water, and could not reach dry ground within 8 blocks/);
});

test("hunt and shear - say what's missing before they move", async () => {
  assert.match((await run("hunt", {})).reason!, /say what to hunt/);
  assert.match((await run("hunt", {}, { target: "tester" })).reason!, /cannot attack yourself/);
  assert.match((await run("hunt", {}, { target: "cow" })).reason!, /^no cow within 32 blocks — explore to find one/);
  assert.match((await run("hunt", { entities: [zombie(40)] }, { target: "zombie" })).reason!, /no zombie within 32 blocks/, "too far away");
  assert.match((await run("shear", {})).reason!, /need shears — craft them from 2 iron_ingot/);
  assert.match((await run("shear", { inventory: { shears: 1 } })).reason!, /^no sheep within 32 blocks — explore to find some/);
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
  assert.deepEqual(calls, ["chat @qwen [auto] bringing you 5 cobblestone, stay where you are", "toss 5 cobblestone", "back on", "back off", "goto"], "already beside them: no walking, only the 5 it has, then a step back, and a path away when the step back went nowhere");
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

test("go_to - says what's missing, and won't chase an agent it can't see", async () => {
  assert.match((await run("go_to", {})).reason!, /say where to go/);
  assert.match((await run("go_to", {}, { to: "tester" })).reason!, /already where you are/);
  assert.match((await run("go_to", {}, { to: "qwen" })).reason!, /qwen is not in sight; ask them where they are/);
  assert.match((await run("go_to", {}, { x: 900, z: 0 })).reason!, /more than 512/);
  assert.equal((await run("go_to", {}, { x: 50, z: 0 }, true)).status, "aborted");
  assert.match((await run("go_to", { entities: [zombie(3)] }, { x: 50, z: 0 })).reason!, /stopped walking because zombie/);
});

test("go_to - gives up when every leg is blocked, and is done at once when already there", async () => {
  const blocked = await run("go_to", {}, { x: 50, z: 0 });
  assert.equal(blocked.status, "failed");
  assert.match(blocked.reason!, /blocked 3 times/);
  assert.equal((await run("go_to", { entities: [teammate(2)] }, { to: "qwen" })).status, "success");
  assert.equal((await run("go_to", {}, { x: 0, z: 0 })).status, "success", "already at x and z");
  assert.match((await run("go_to", {}, { x: 0, y: 90, z: 0 })).reason!, /blocked 3 times .* 26 blocks short/, "but not at the height asked for");
});

test("build_shelter - won't clear a space with lava beside it", async () => {
  const blocks = { ...floor(64), "1,65,1": "dirt", "2,65,1": "lava" };
  const result = await run("build_shelter", { inventory: { oak_planks: 64 }, blocks }, { storeys: 2 });
  assert.equal(result.status, "failed");
  assert.match(result.reason!, /lava in or beside the space/);
});

test("tell_agent - checks the agent, the skill and its args, then sends one request line", async () => {
  const setup = { players: ["qwen"] };
  assert.match((await run("tell_agent", setup, { to: "bob", skill: "craft", args: "{}" })).reason!, /no other agent called "bob"/);
  assert.match((await run("tell_agent", setup, { to: "qwen", skill: "fly", args: "{}" })).reason!, /no skill called "fly"/);
  assert.match((await run("tell_agent", setup, { to: "qwen", skill: "ask_agent", args: "{}" })).reason!, /not to ask_agent/);
  assert.match((await run("tell_agent", setup, { to: "qwen", skill: "craft", args: "not json" })).reason!, /must be an object/);
  assert.match((await run("tell_agent", setup, { to: "qwen", skill: "give", args: '{"to":"tester"}' })).reason!, /give needs item in args/, "count is optional");
  assert.match((await run("tell_agent", setup, { to: "Tester", skill: "craft", args: "{}" })).reason!, /tester is you/);
  assert.equal((await run("tell_agent", setup, { to: "qwen", skill: "go_to", args: '{"to":"tester"}' })).status, "success", "go_to needs only one of its args");
  const { bot, calls } = fakeBot(setup);
  const result = await findSkill("tell_agent")!.run(context(bot), { to: "QWEN", skill: "craft", args: '{"item":"stone_axe","count":1,"extra":1}' });
  assert.equal(result.status, "success");
  assert.deepEqual(calls, ['chat @qwen [tell] craft {"item":"stone_axe","count":1}'], "only the skill's own args are passed on");
});

test("ask_agent - returns the answer addressed to the asker, not other chatter", async () => {
  const { bot, calls, emit } = fakeBot({ players: ["haiku"] });
  bot.chat = (line: string) => {
    calls.push(`chat ${line}`);
    emit("chat", "haiku", "[act] gather_wood({})");
    emit("chat", "haiku", "@sonnet not you");
    emit("chat", "haiku", "gathering wood for everyone");
    emit("chat", "haiku", "@tester [auto] bringing you 1 stone_shovel, stay where you are");
    emit("chat", "haiku", "@tester [tell] craft {}");
    emit("chat", "haiku", "@tester 40 oak logs");
  };
  const result = await findSkill("ask_agent")!.run(context(bot), { to: "haiku", question: "how many logs?" });
  assert.deepEqual(calls, ["chat @haiku [ask] how many logs?"]);
  assert.deepEqual(result, { status: "success", reason: 'haiku answered: "40 oak logs"', detail: { to: "haiku", question: "how many logs?", reply: "40 oak logs" } });
  assert.equal((await run("ask_agent", { players: ["haiku"] }, { to: "haiku", question: "?" }, true)).status, "aborted");
  assert.match((await run("ask_agent", {}, { to: "haiku", question: "?" })).reason!, /no other agent called "haiku"/);
  assert.match((await run("ask_agent", { players: ["haiku"] }, { to: "tester", question: "?" })).reason!, /tester is you/);
});

test("give - won't drop items for a receiver under water", async () => {
  const blocks = { "1,65,0": "water", "2,65,0": "water" };
  const result = await run("give", { inventory: { cobblestone: 5 }, entities: [teammate(1.5)], blocks }, { to: "qwen", item: "cobblestone", count: 5 });
  assert.match(result.reason!, /qwen is under water/);
});

test("mine_stone - stone touching water is a hazard, stone in the open is not", async () => {
  const { exposure } = await import("./mineStone.js");
  const { Vec3 } = await import("vec3");
  const { bot } = fakeBot({ blocks: { "0,60,0": "stone", "1,60,0": "water", "5,60,0": "stone", "5,59,0": "stone", "4,60,0": "stone", "6,60,0": "stone", "5,60,1": "stone", "5,60,-1": "stone" } });
  assert.equal(exposure(context(bot), new Vec3(0, 60, 0)), "hazard", "water is an open side to the game, but not one to mine from");
  assert.equal(exposure(context(bot), new Vec3(5, 60, 0)), "open", "air above it");
});
