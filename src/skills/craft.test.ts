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
