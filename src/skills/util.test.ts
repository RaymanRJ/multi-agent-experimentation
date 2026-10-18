import { test } from "node:test";
import assert from "node:assert/strict";
import { nearestUncrowded, opensOnClick } from "./util.js";

test("opensOnClick - tables, furnaces, beds and doors open; building blocks don't", () => {
  for (const name of ["crafting_table", "furnace", "chest", "red_bed", "oak_door", "spruce_trapdoor", "stone_button"]) {
    assert.equal(opensOnClick(name), true, name);
  }
  for (const name of ["dirt", "cobblestone", "dark_oak_planks", "oak_log", "stone"]) assert.equal(opensOnClick(name), false, name);
});

test("nearestUncrowded - nearest first, but targets beside another agent last, never dropped", async () => {
  const { fakeBot } = await import("../testing/fakeBot.js");
  const { Vec3 } = await import("vec3");
  const { bot } = fakeBot({ entities: [{ name: "player", type: "player", username: "qwen", position: { x: 2.5, y: 64, z: 0.5 } }] });
  const near = new Vec3(3, 64, 0), mid = new Vec3(-6, 64, 0), far = new Vec3(0, 64, 12);
  assert.deepEqual(nearestUncrowded(bot, [far, near, mid]), [mid, far, near]);
  assert.deepEqual(nearestUncrowded(fakeBot().bot, [far, near, mid]), [near, mid, far], "alone: plain nearest first");
});

test("build_shelter layout - one storey needs 43 blocks, two storeys 87 with a hatch between the rooms", async () => {
  const { layout } = await import("./buildShelter.js");
  const count = (l: ReturnType<typeof layout>) => l.walls.length + l.roof.length;
  assert.equal(count(layout(1)), 43);
  const two = layout(2);
  assert.equal(count(two), 87);
  assert.equal(Math.max(...two.roof.map((c) => c.y)), 5);
  assert.equal(two.roof.filter((c) => c.y === 2).length, 8, "a floor of 9 cells less the hatch");
});
