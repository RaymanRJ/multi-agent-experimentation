import { test } from "node:test";
import assert from "node:assert/strict";
import { createWatch, SUPPRESSED, type WorldSnapshot } from "./interrupts.js";

const calm: WorldSnapshot = { health: 20, hostiles: [], timeOfDay: 1000 };
const zombie = (distance: number, id = 1) => ({ id, name: "zombie", distance });

test("quiet world never interrupts", () => {
  const w = createWatch(calm);
  assert.equal(w.check(calm), null);
  assert.equal(w.check({ ...calm, timeOfDay: 5000 }), null);
});

test("damage since start interrupts, with the new health", () => {
  const w = createWatch(calm);
  assert.match(w.check({ ...calm, health: 14 })!, /took damage \(health 14\)/);
});

test("already-low health is not damage", () => {
  const w = createWatch({ ...calm, health: 8 });
  assert.equal(w.check({ ...calm, health: 8 }), null);
});

test("damage after healing counts", () => {
  const w = createWatch({ ...calm, health: 10 });
  assert.equal(w.check({ ...calm, health: 16 }), null);
  assert.match(w.check({ ...calm, health: 15 })!, /damage/);
});

test("a hostile arriving inside 6 blocks interrupts", () => {
  const w = createWatch(calm);
  assert.equal(w.check({ ...calm, hostiles: [zombie(12)] }), null);
  assert.match(w.check({ ...calm, hostiles: [zombie(5)] })!, /zombie came within 6 blocks/);
});

test("a hostile already inside the threshold at start does not interrupt", () => {
  const w = createWatch({ ...calm, hostiles: [zombie(5)] });
  assert.equal(w.check({ ...calm, hostiles: [zombie(5)] }), null);
  assert.equal(w.check({ ...calm, hostiles: [zombie(4)] }), null);
});

test("a known hostile that closes in by the margin interrupts", () => {
  const w = createWatch({ ...calm, hostiles: [zombie(5)] });
  assert.match(w.check({ ...calm, hostiles: [zombie(3)] })!, /came within/);
});

test("a different hostile appearing near a known one interrupts", () => {
  const w = createWatch({ ...calm, hostiles: [zombie(5, 1)] });
  assert.match(w.check({ ...calm, hostiles: [zombie(5, 1), zombie(5, 2)] })!, /came within/);
});

test("day to night interrupts; starting at night does not", () => {
  assert.equal(createWatch(calm).check({ ...calm, timeOfDay: 11999 }), null);
  assert.match(createWatch(calm).check({ ...calm, timeOfDay: 12000 })!, /night is falling/);
  const night = createWatch({ ...calm, timeOfDay: 14000 });
  assert.equal(night.check({ ...calm, timeOfDay: 15000 }), null);
});

test("only one interrupt per run", () => {
  const w = createWatch(calm);
  assert.ok(w.check({ ...calm, health: 10 }));
  assert.equal(w.check({ ...calm, health: 5 }), null);
});

test("flee with a zombie chasing it is left alone", () => {
  const w = createWatch({ ...calm, hostiles: [zombie(5)] }, SUPPRESSED["flee"]);
  assert.equal(w.check({ ...calm, health: 12, hostiles: [zombie(2)], timeOfDay: 13000 }), null);
});

test("suppressing one trigger leaves the others", () => {
  const w = createWatch(calm, ["damage"]);
  assert.equal(w.check({ ...calm, health: 10 }), null);
  assert.match(w.check({ ...calm, hostiles: [zombie(3)] })!, /came within/);
});
