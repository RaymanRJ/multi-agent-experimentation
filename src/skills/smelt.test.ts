import { test } from "node:test";
import assert from "node:assert/strict";
import { chooseFuel } from "./smelt.js";
import { oreKind } from "./mineOre.js";

test("chooseFuel - coal first, topped up with wood; null when short", () => {
  assert.deepEqual(chooseFuel({ coal: 1, oak_planks: 4 }, 3), [["coal", 1]]);
  assert.deepEqual(chooseFuel({ oak_planks: 4 }, 3), [["oak_planks", 2]]);
  assert.deepEqual(chooseFuel({ coal: 1, oak_log: 2 }, 10), [["coal", 1], ["oak_log", 2]]);
  assert.equal(chooseFuel({ stick: 1 }, 3), null);
});

test("oreKind - accepts the ore, its block name, or its deepslate variant", () => {
  assert.equal(oreKind("iron"), "iron");
  assert.equal(oreKind("iron_ore"), "iron");
  assert.equal(oreKind("Deepslate_Diamond_Ore"), "diamond");
  assert.equal(oreKind("stone"), null);
});
