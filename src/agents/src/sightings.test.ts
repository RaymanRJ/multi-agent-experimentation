import { test } from "node:test";
import assert from "node:assert/strict";
import { Vec3 } from "vec3";
import { AnimalMemory, describeOreSightings, describeSightings, direction, OreMemory, ORE_TTL_MS, SIGHTING_TTL_MS } from "./sightings.js";
import { fakeBot } from "./testing/fakeBot.js";

/** Stone all round x, y, z (radius 1), so ore put there is buried, not exposed. */
function encase(blocks: Record<string, string>, x: number, y: number, z: number): void {
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) blocks[`${x + dx},${y + dy},${z + dz}`] = "stone";
}

test("OreMemory - remembers exposed ore as veins, not buried ore; flags a vein with water above it, not one with water beside; forgets one found mined out", () => {
  const blocks: Record<string, string> = { "10,64,0": "iron_ore", "11,64,0": "deepslate_iron_ore", "12,64,0": "water", "0,64,12": "coal_ore", "0,65,12": "water" };
  encase(blocks, 0, 64, -15);
  blocks["0,64,-15"] = "iron_ore"; // buried in stone: no player could see it
  const { bot, world } = fakeBot({ position: { x: 0.5, y: 64, z: 0.5 }, blocks });
  const memory = new OreMemory("la");
  memory.look(bot, 1_000);
  const spots = memory.list().sort((a, b) => a.name.localeCompare(b.name));
  assert.deepEqual(spots.map((s) => [s.name, s.count, s.wet ?? false]), [["coal ore", 1, true], ["iron ore", 2, false]]);

  world.delete("10,64,0"); world.delete("11,64,0"); // mined
  memory.look(bot, 2_000);
  assert.deepEqual(memory.list().map((s) => s.name), ["coal ore"], "the iron, looked at again and gone, is forgotten");
});

test("describeOreSightings - out of view only, with direction, height and who; forgotten after 30 minutes", () => {
  const now = 40 * 60_000;
  const here = new Vec3(0, 74, 0);
  const spots = [
    { name: "iron ore", count: 3, x: -6, y: 32, z: 13, at: now - 5 * 60_000, by: "sonnet" },
    { name: "coal ore", count: 2, x: 4, y: 72, z: 4, at: now, by: "la" },
    { name: "iron ore", count: 1, x: 30, y: 74, z: 0, at: now, by: "la", wet: true },
  ];
  assert.deepEqual(describeOreSightings(here, spots, "la", now), [
    "1 iron ore at 30,74,0, 30 blocks east, seen by you just now (beside lava, under water or below water, which mine_ore won't mine)",
    "3 iron ore at -6,32,13, 14 blocks south-west and 42 below you, seen by sonnet 5 min ago",
  ]);
  assert.deepEqual(describeOreSightings(here, spots, "la", now + ORE_TTL_MS), []);
});

const sheep = (x: number, z: number) => ({ name: "sheep", type: "animal", position: { x, y: 64, z } });

test("AnimalMemory - remembers a group per kind in view, its size and middle; not what is out of view", () => {
  const { bot } = fakeBot({ position: { x: 0.5, y: 64, z: 0.5 }, entities: [sheep(10, 0), sheep(12, 2), sheep(80, 0)] });
  const memory = new AnimalMemory("la");
  memory.look(bot, 1_000);
  assert.deepEqual(memory.list(), [{ name: "sheep", count: 2, x: 11, y: 64, z: 1, at: 1_000, by: "la" }]);
});

test("describeSightings - out of view only, nearest first, with direction, who and when; a teammate's too", () => {
  const now = 10 * 60_000;
  const here = new Vec3(0, 64, 0);
  const spots = [
    { name: "sheep", count: 3, x: 0, y: 64, z: 45, at: now - 2 * 60_000, by: "lb" },
    { name: "cow", count: 2, x: 30, y: 64, z: -30, at: now - 20_000, by: "la" },
    { name: "pig", count: 1, x: 10, y: 64, z: 5, at: now, by: "la" },
  ];
  assert.deepEqual(describeSightings(here, spots, "la", now), [
    "2 cow at 30,64,-30, 42 blocks north-east, seen by you just now",
    "3 sheep at 0,64,45, 45 blocks south, seen by lb 2 min ago",
  ]);
  assert.deepEqual(describeSightings(here, spots, "la", now + SIGHTING_TTL_MS), [], "forgotten after 10 minutes");
});

test("direction - north is -z, as in the game", () => {
  const o = new Vec3(0, 0, 0);
  assert.equal(direction(o, 0, -10), "north");
  assert.equal(direction(o, 10, 0), "east");
  assert.equal(direction(o, -10, 10), "south-west");
});
