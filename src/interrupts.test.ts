import { test } from "node:test";
import assert from "node:assert/strict";
import { createWatch, MESSAGE_COOLDOWN_MS, SUPPRESSED, suppressedFor, type WorldSnapshot } from "./interrupts.js";

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
  assert.equal(createWatch({ ...calm, timeOfDay: 11000 }).check({ ...calm, timeOfDay: 11999 }), null);
  assert.match(createWatch(calm).check({ ...calm, timeOfDay: 12000 })!, /night is falling/);
  const night = createWatch({ ...calm, timeOfDay: 14000 });
  assert.equal(night.check({ ...calm, timeOfDay: 15000 }), null);
});

test("dusk interrupts a skill started in daylight, with the time left; not one started at dusk", () => {
  assert.equal(createWatch(calm).check({ ...calm, timeOfDay: 10799 }), null);
  assert.match(createWatch(calm).check({ ...calm, timeOfDay: 10800 })!, /sun is setting — night falls in about 60 seconds/);
  assert.equal(createWatch({ ...calm, timeOfDay: 10900 }).check({ ...calm, timeOfDay: 11500 }), null);
});

test("build_shelter is not cut short by dusk or nightfall", () => {
  const w = createWatch(calm, suppressedFor("build_shelter", null, 0));
  assert.equal(w.check({ ...calm, timeOfDay: 11000 }), null);
  assert.equal(w.check({ ...calm, timeOfDay: 12500 }), null);
  assert.match(w.check({ ...calm, health: 5 })!, /took damage/);
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

test("a message addressed to the agent interrupts once; one already waiting at the start does not", () => {
  const base = { health: 20, hostiles: [], timeOfDay: 1000 };
  const watch = createWatch({ ...base, directed: 1, lastDirected: { from: "agent_b", text: "old" } });
  assert.equal(watch.check({ ...base, directed: 1, lastDirected: { from: "agent_b", text: "old" } }), null);
  const reason = watch.check({ ...base, directed: 2, lastDirected: { from: "agent_b", text: "can you mine the stone?" } });
  assert.match(reason ?? "", /agent_b said to you: "can you mine the stone\?"/);
  assert.equal(watch.check({ ...base, directed: 3, lastDirected: { from: "agent_b", text: "again" } }), null);
});

test("flee, eat and sleep are not interrupted by messages", () => {
  const base = { health: 20, hostiles: [], timeOfDay: 1000 };
  const watch = createWatch({ ...base, directed: 0 }, SUPPRESSED["flee"]);
  assert.equal(watch.check({ ...base, directed: 1, lastDirected: { from: "agent_b", text: "hi" } }), null);
});

test("damage while out of air says the agent is drowning", () => {
  const w = createWatch(calm);
  assert.match(w.check({ ...calm, health: 18, oxygen: 0 })!, /out of air/);
  assert.doesNotMatch(createWatch(calm).check({ ...calm, health: 18, oxygen: 20 })!, /out of air/);
});

test("a message interrupts at most once per cooldown, so replies don't abort every skill", () => {
  assert.deepEqual(suppressedFor("gather_wood", null, 0), []);
  assert.deepEqual(suppressedFor("gather_wood", 1000, 1000 + MESSAGE_COOLDOWN_MS - 1), ["message"]);
  assert.deepEqual(suppressedFor("gather_wood", 1000, 1000 + MESSAGE_COOLDOWN_MS), []);
  assert.deepEqual(suppressedFor("flee", 1000, 2000), SUPPRESSED["flee"]);
});

test("the watch reports which trigger fired", () => {
  const start: WorldSnapshot = { health: 20, hostiles: [], timeOfDay: 1000, directed: 0, lastDirected: null };
  const watch = createWatch(start);
  assert.equal(watch.firedBy(), null);
  assert.match(watch.check({ ...start, directed: 1, lastDirected: { from: "qb", text: "hi" } }) ?? "", /qb said to you/);
  assert.equal(watch.firedBy(), "message");
});
