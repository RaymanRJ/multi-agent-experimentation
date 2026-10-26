import { test } from "node:test";
import assert from "node:assert/strict";
import { chooseFuel, smelt } from "./smelt.js";
import { context, fakeBot } from "../testing/fakeBot.js";
import { smeltProduct } from "./util.js";
import { oreKind } from "./mineOre.js";

test("chooseFuel - one kind when one covers it, the best first; a mix only when none does; null when short", () => {
  assert.deepEqual(chooseFuel({ coal: 1, oak_planks: 4 }, 3), [["coal", 1]]);
  assert.deepEqual(chooseFuel({ oak_planks: 4 }, 3), [["oak_planks", 2]]);
  // tbase1: 2 planks topped up with logs went into one fuel slot and failed "destination full".
  assert.deepEqual(chooseFuel({ dark_oak_planks: 2, dark_oak_log: 8, stick: 4 }, 10), [["dark_oak_log", 7]]);
  assert.deepEqual(chooseFuel({ coal: 1, oak_log: 2 }, 10), [["coal", 1], ["oak_log", 2]]);
  assert.equal(chooseFuel({ stick: 1 }, 3), null);
});

test("smelt - an interrupt while it makes the furnace is an interrupt, not a failure (tlunap1 rep 3)", async () => {
  const { bot } = fakeBot({ inventory: { raw_iron: 3, coal: 1, cobblestone: 8 } });
  const result = await smelt.run(context(bot, true), { item: "raw_iron", count: 3 });
  assert.equal(result.status, "aborted", "agent.ts then puts the interrupt's reason in place of the run is ending");
});

test("oreKind - accepts the ore, its block name, or its deepslate variant", () => {
  assert.equal(oreKind("iron"), "iron");
  assert.equal(oreKind("iron_ore"), "iron");
  assert.equal(oreKind("Deepslate_Diamond_Ore"), "diamond");
  assert.equal(oreKind("stone"), null);
});

test("smeltProduct - accepts the product or its raw item", () => {
  assert.equal(smeltProduct("iron_ingot"), "iron_ingot");
  assert.equal(smeltProduct("raw_iron"), "iron_ingot");
  assert.equal(smeltProduct(" Raw_Gold "), "gold_ingot");
  assert.equal(smeltProduct("sand"), "glass");
  assert.equal(smeltProduct("iron_pickaxe"), null);
});
