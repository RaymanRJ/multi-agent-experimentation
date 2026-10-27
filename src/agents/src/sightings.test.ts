import { test } from "node:test";
import assert from "node:assert/strict";
import { Vec3 } from "vec3";
import { AnimalMemory, describeSightings, direction, SIGHTING_TTL_MS } from "./sightings.js";
import { fakeBot } from "./testing/fakeBot.js";

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
