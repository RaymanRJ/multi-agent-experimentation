import { test } from "node:test";
import assert from "node:assert/strict";
import { opensOnClick } from "./util.js";

test("opensOnClick - tables, furnaces, beds and doors open; building blocks don't", () => {
  for (const name of ["crafting_table", "furnace", "chest", "red_bed", "oak_door", "spruce_trapdoor", "stone_button"]) {
    assert.equal(opensOnClick(name), true, name);
  }
  for (const name of ["dirt", "cobblestone", "dark_oak_planks", "oak_log", "stone"]) assert.equal(opensOnClick(name), false, name);
});
