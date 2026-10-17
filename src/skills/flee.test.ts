import { test } from "node:test";
import assert from "node:assert/strict";
import { Vec3 } from "vec3";
import { enclosure } from "./flee.js";

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
