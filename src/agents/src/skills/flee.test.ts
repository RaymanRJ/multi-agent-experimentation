import { test } from "node:test";
import assert from "node:assert/strict";
import { Vec3 } from "vec3";
import { enclosure, flee } from "./flee.js";
import { context, fakeBot, floor } from "../testing/fakeBot.js";

test("enclosure - every cell has a filled or solid neighbour by the time it is placed", () => {
  const feet = new Vec3(0, 64, 0);
  const cells = enclosure(feet);
  assert.equal(cells.length, 10);
  const key = (v: Vec3) => `${v.x},${v.y},${v.z}`;
  const filled = new Set<string>();
  const floor = (v: Vec3) => v.y === feet.y - 1;
  const faces = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const;
  for (const cell of cells) {
    const supported = faces.some(([x, y, z]) => {
      const n = cell.offset(x, y, z);
      return floor(n) || filled.has(key(n));
    });
    assert.ok(supported, `nothing to build ${key(cell)} against`);
    filled.add(key(cell));
  }
  assert.ok(filled.has(key(feet.offset(0, 2, 0))), "covers the head");
  assert.ok(!filled.has(key(feet)) && !filled.has(key(feet.offset(0, 1, 0))), "leaves the bot's own space open");
});

test("flee - paths that fail after a run report the run, not being cornered", async () => {
  const { bot } = fakeBot({ position: { x: 0, y: 64, z: 0 }, blocks: floor(64, "stone", 40), entities: [{ name: "zombie", type: "hostile", position: { x: 5, y: 64, z: 0 } }] });
  const zombie = Object.values(bot.entities)[0]!;
  let legs = 0;
  bot.pathfinder.goto = (async () => {
    if (legs++ > 0) throw new Error("no path");
    bot.entity.position = new Vec3(-20, 64, 0); // got 20 blocks away; the zombie keeps up
    zombie.position = new Vec3(-12, 64, 0);
  }) as never;
  const result = await flee.run(context(bot), { distance: 32 });
  assert.equal(result.status, "failed");
  assert.match(result.reason ?? "", /^ran 20 blocks but 1 hostile/);
  assert.doesNotMatch(result.reason ?? "", /could not find a path away/);
});
