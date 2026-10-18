import { test } from "node:test";
import assert from "node:assert";
import { alreadyHeld, planksHint, swapWood } from "./craft.js";

const WOODS = ["dark_oak", "mangrove", "spruce", "oak"];

test("swapWood - swaps the wood type and nothing else", () => {
  assert.strictEqual(swapWood("oak_planks", "dark_oak", WOODS), "dark_oak_planks");
  assert.strictEqual(swapWood("dark_oak_planks", "oak", WOODS), "oak_planks");
  assert.strictEqual(swapWood("stripped_oak_log", "spruce", WOODS), "stripped_spruce_log");
});

test("swapWood - null for the same wood or a non-wood item", () => {
  assert.strictEqual(swapWood("oak_planks", "oak", WOODS), null);
  assert.strictEqual(swapWood("stone_pickaxe", "oak", WOODS), null);
  assert.strictEqual(swapWood("stick", "dark_oak", WOODS), null);
});

test("planksHint - names the skill that gets each raw material", () => {
  assert.match(planksHint(new Map([["oak_planks", 2]])), /gather_wood/);
  assert.match(planksHint(new Map([["cobblestone", 3]])), /mine_stone/);
  assert.match(planksHint(new Map([["iron_ingot", 3]])), /smelt/);
  assert.equal(planksHint(new Map([["string", 3]])), "");
});

test("alreadyHeld - says so only when the item is already in the inventory", () => {
  assert.equal(alreadyHeld("stone_axe", 1), " — you already have 1 stone_axe");
  assert.equal(alreadyHeld("stone_axe", 0), "");
});

// Planning against the real recipes, through a fake bot (src/testing/fakeBot.ts). The craft itself
// talks to the server's window protocol and is checked live by scripts/skill-smoke.sh.
import { craft, craftableNow } from "./craft.js";
import { context, fakeBot } from "../testing/fakeBot.js";

const tryCraft = (inventory: Record<string, number>, args: Record<string, unknown>) =>
  craft.run(context(fakeBot({ inventory }).bot), args);

test("craft - unknown item, smelted item and uncraftable item each get their own answer", async () => {
  assert.match((await tryCraft({}, { item: "wodden_pickaxe" })).reason!, /"wodden_pickaxe" is not a known item name/);
  assert.equal(
    (await tryCraft({}, { item: "iron_ingot" })).reason,
    "iron_ingot is smelted from raw_iron, not crafted — use smelt with item iron_ingot",
  );
  assert.match((await tryCraft({}, { item: "cobblestone" })).reason!, /cannot be crafted — it has no crafting recipe/);
});

test("craft - a mined item is not sent after its storage block", { todo: "known bug: says 'need 1 more diamond_block to craft 1 diamond'" }, async () => {
  // diamond (like emerald, coal, redstone) has one recipe: unpacking its block. iron_ingot has the
  // same problem and is handled by pointing at the furnace; mined items are not handled yet.
  assert.doesNotMatch((await tryCraft({}, { item: "diamond" })).reason!, /diamond_block/);
});

test("craft - a shortfall names what is missing, the skill that gets it, and a tool already held", async () => {
  const stone = await tryCraft({ oak_planks: 4 }, { item: "stone_pickaxe" });
  assert.equal(stone.status, "failed");
  assert.match(stone.reason!, /^need 3 more cobblestone to craft 1 stone_pickaxe \(.*mine_stone/);
  assert.deepEqual(stone.detail, { missing: { cobblestone: 3 } });
  const again = await tryCraft({ oak_planks: 4, stone_pickaxe: 1 }, { item: "stone_pickaxe" });
  assert.match(again.reason!, /— you already have 1 stone_pickaxe$/);
  const wood = await tryCraft({ cobblestone: 3 }, { item: "stone_pickaxe" });
  assert.match(wood.reason!, /oak_planks.*gather_wood first/);
  const iron = await tryCraft({ stick: 2 }, { item: "iron_pickaxe" });
  assert.match(iron.reason!, /need 3 more iron_ingot .*mine_ore, then smelt/);
});

test("craft - counts intermediates: logs make the planks a tool needs, so it goes ahead and crafts", async () => {
  const { bot, calls } = fakeBot({ inventory: { oak_log: 1 } });
  const result = await craft.run(context(bot), { item: "stick", count: 4 });
  assert.ok(calls.includes("packet craft_recipe_request"), "planned, then asked the server to craft");
  assert.match(result.reason!, /^crafting stick failed: the server did not fill the crafting grid/);
});

test("craft - a failed craft while making a crafting table is reported, not thrown", { todo: "known bug: the error escapes skill.run, and the agent loop does not catch it" }, async () => {
  // 2 logs = 8 planks: a table (4), 3 for the head and 1 for two sticks; the table is made first.
  const result = await tryCraft({ oak_log: 2 }, { item: "wooden_pickaxe" });
  assert.equal(result.status, "failed");
});

test("craft - planks asked by the wrong wood name are made from the wood held", async () => {
  const result = await tryCraft({ dark_oak_log: 1 }, { item: "oak_planks", count: 4 });
  assert.doesNotMatch(result.reason ?? "", /need \d+ more oak_log/, "does not send the model after oak");
});

test("craftableNow - lists useful things makeable now, never ones already held", () => {
  assert.deepEqual(craftableNow(fakeBot({ inventory: {} }).bot), []);
  const logs = craftableNow(fakeBot({ inventory: { dark_oak_log: 3 } }).bot);
  assert.ok(logs.includes("wooden_pickaxe"));
  assert.ok(!logs.includes("stone_pickaxe"));
  const stone = craftableNow(fakeBot({ inventory: { oak_log: 2, cobblestone: 8, stone_pickaxe: 1 } }).bot);
  assert.ok(stone.includes("stone_axe") && stone.includes("furnace"));
  assert.ok(!stone.includes("stone_pickaxe"), "already held");
});
