import { test } from "node:test";
import assert from "node:assert/strict";
import { isDoor, shut } from "./buildShelter.js";

const block = (name: string, boundingBox: string, open?: boolean) => ({ name, boundingBox, getProperties: () => (open === undefined ? {} : { open }) });

test("shut - a solid block or a closed wooden door is shut; an open door or air is not", () => {
  assert.equal(shut(block("cobblestone", "block")), true);
  assert.equal(shut(block("dark_oak_door", "block", false)), true);
  assert.equal(shut(block("dark_oak_door", "block", true)), false, "an open door lets mobs in");
  assert.equal(shut(block("air", "empty")), false);
  assert.equal(shut(null), false);
});

test("isDoor - wooden doors only: an iron door needs redstone to open", () => {
  assert.equal(isDoor("oak_door"), true);
  assert.equal(isDoor("dark_oak_door"), true);
  assert.equal(isDoor("iron_door"), false);
  assert.equal(isDoor("oak_trapdoor"), false);
});
