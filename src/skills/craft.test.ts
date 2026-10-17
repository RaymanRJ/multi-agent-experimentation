import { test } from "node:test";
import assert from "node:assert";
import { swapWood } from "./craft.js";

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
