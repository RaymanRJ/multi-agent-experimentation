import { test } from "node:test";
import assert from "node:assert/strict";
import { Vec3 } from "vec3";
import { floorCells, insideClosedShelter, layout } from "./buildShelter.js";
import { fakeBot } from "../testing/fakeBot.js";
import { observe } from "../observe.js";

const spot = { x: 0, y: 64, z: 0, storeys: 1 };
/** Every floor, wall, roof and doorway cell of a one-storey shelter at the origin, minus `skip`. */
function hut(skip: Vec3[] = []): Record<string, string> {
  const { walls, roof, door } = layout(1);
  const blocks: Record<string, string> = {};
  for (const cell of [...floorCells(), ...walls, ...roof, ...door]) {
    if (skip.some((s) => s.equals(cell))) continue;
    blocks[`${cell.x},${64 + cell.y},${cell.z}`] = "oak_planks";
  }
  return blocks;
}

test("insideClosedShelter - inside a whole shelter, yes; a floor hole, an open doorway or standing outside, no", () => {
  const inside = { x: 0.5, y: 64, z: 0.5 };
  assert.equal(insideClosedShelter(fakeBot({ blocks: hut(), position: inside }).bot, spot), true);
  assert.equal(insideClosedShelter(fakeBot({ blocks: hut([new Vec3(-1, -1, -1)]), position: inside }).bot, spot), false, "floor hole");
  assert.equal(insideClosedShelter(fakeBot({ blocks: hut([new Vec3(0, 1, 2)]), position: inside }).bot, spot), false, "doorway open");
  assert.equal(insideClosedShelter(fakeBot({ blocks: hut(), position: { x: 5.5, y: 64, z: 0.5 } }).bot, spot), false, "outside");
});

test("observe - inShelter only when the agent says so", () => {
  const base = { step: 1, scenario: "survival" as const, goal: "", recentEvents: [] as string[] };
  const { bot } = fakeBot();
  assert.equal(observe(bot, { ...base, inShelter: true }).inShelter, true);
  assert.equal("inShelter" in observe(bot, base), false);
});
