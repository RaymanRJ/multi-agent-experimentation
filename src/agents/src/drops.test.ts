import { test } from "node:test";
import assert from "node:assert/strict";
import { Vec3 } from "vec3";
import { DROP_LIFETIME_TICKS, DropLog, dropKey, dropLines, type Drop } from "./drops.js";

const drop = (over: Partial<Drop> = {}): Drop => ({ by: "la", x: 100, y: 64, z: 100, items: { raw_iron: 15, dirt: 40 }, at: 1000, ...over });
const far = new Vec3(130, 64, 140);

test("a drop is listed with whose, what, where, how long ago and how far", () => {
  const [line] = dropLines([drop()], far, 1000 + 20 * 80, "la");
  assert.match(line!, /^your 40 dirt, 15 raw iron, dropped at 100,64,100 when you died, 80s ago, 50 blocks from you; dropped items vanish 220s from now$/);
  const [other] = dropLines([drop()], far, 1200, "lb");
  assert.match(other!, /^la's .* when la died/);
});

test("a drop is gone after five minutes", () => {
  assert.equal(dropLines([drop()], far, 1000 + DROP_LIFETIME_TICKS, "la").length, 0);
  const log = new DropLog();
  log.died(drop());
  assert.equal(log.mine(1000 + DROP_LIFETIME_TICKS - 1).length, 1);
  assert.equal(log.mine(1000 + DROP_LIFETIME_TICKS).length, 0);
});

test("dying with nothing drops nothing", () => {
  const log = new DropLog();
  log.died(drop({ items: {} }));
  assert.equal(log.mine(1000).length, 0);
});

test("from near the spot it lists what is still lying there, and the team hears the latest look", () => {
  const log = new DropLog();
  const near = new Vec3(104, 64, 100);
  assert.deepEqual(log.current([drop()], [], 1200, far, () => ({})).map((d) => d.items), [drop().items], "too far to tell");
  assert.deepEqual(log.current([drop()], [], 1200, near, () => ({ dirt: 12 })).map((d) => d.items), [{ dirt: 12 }], "part picked up");
  // A teammate who never went there hears what is left through the board.
  assert.deepEqual(new DropLog().current([drop()], [log.seen(1200)], 1300, far, () => undefined).map((d) => d.items), [{ dirt: 12 }]);
  assert.equal(log.current([drop()], [], 1250, near, () => ({})).length, 0, "all gone");
  assert.equal(new DropLog().current([drop()], [log.seen(1300)], 1300, far, () => undefined).length, 0);
  // An older look from someone else does not bring it back.
  assert.equal(log.current([drop()], [{ [dropKey(drop())]: { items: { dirt: 12 }, at: 1100 } }], 1300, far, () => undefined).length, 0);
});

test("the same drop heard twice is listed once", () => {
  assert.equal(new DropLog().current([drop(), drop()], [], 1200, far, () => undefined).length, 1);
});
