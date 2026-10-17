import { test } from "node:test";
import assert from "node:assert/strict";

import { ScriptedPolicy } from "./scripted.js";
import type { Decision, Observation } from "../types.js";

function obs(over: Partial<Observation> = {}): Observation {
  return {
    step: 1,
    scenario: "sandbox",
    goal: "",
    position: { x: 0, y: 64, z: 0 },
    health: 20,
    food: 20,
    timeOfDay: 1000,
    isDay: true,
    inventory: {},
    nearbyBlocks: {},
    hostiles: [],
    otherAgents: [],
    recentEvents: [],
    ...over,
  };
}

async function next(p: ScriptedPolicy, o: Observation): Promise<Decision | null> {
  const out = await p.decide(o, []);
  assert.deepEqual(out.calls, []);
  return out.decision;
}

/** Feed back "<skill> <status>" as the agent loop does. */
function after(d: Decision, status: "success" | "failed" | "aborted", over: Partial<Observation> = {}): Observation {
  return obs({ ...over, recentEvents: [`${d.skill} ${status}${status === "success" ? "" : " (reason)"}`] });
}

test("progression follows the inventory", async () => {
  const p = new ScriptedPolicy();
  let d = await next(p, obs());
  assert.deepEqual([d?.skill, d?.args], ["gather_wood", { count: 3 }]);

  d = await next(p, obs({ inventory: { oak_log: 4 } }));
  assert.deepEqual([d?.skill, d?.args], ["craft", { item: "wooden_pickaxe", count: 1 }]);

  d = await next(p, obs({ inventory: { oak_log: 1, wooden_pickaxe: 1 } }));
  assert.deepEqual([d?.skill, d?.args], ["mine_stone", { count: 3 }]);

  d = await next(p, obs({ inventory: { oak_log: 2, cobblestone: 3, wooden_pickaxe: 1 } }));
  assert.deepEqual([d?.skill, d?.args], ["craft", { item: "stone_pickaxe", count: 1 }]);

  d = await next(p, obs({ inventory: { oak_log: 1, stone_pickaxe: 1, wooden_pickaxe: 1 } }));
  assert.equal(d?.skill, "gather_wood");
  assert.equal((d?.args as { count: number }).count, 11);

  d = await next(p, obs({ inventory: { oak_log: 11, stone_pickaxe: 1 } }));
  assert.equal(d?.skill, "build_shelter");
});

test("not enough wood for the stone pickaxe gathers more first", async () => {
  const d = await next(new ScriptedPolicy(), obs({ inventory: { wooden_pickaxe: 1, cobblestone: 3 } }));
  assert.equal(d?.skill, "gather_wood");
});

test("ignores scenario and goal text", async () => {
  const a = await next(new ScriptedPolicy(), obs({ scenario: "sandbox", goal: "build a house" }));
  const b = await next(new ScriptedPolicy(), obs({ scenario: "survival", goal: "survive" }));
  assert.deepEqual(a, b);
});

test("close hostile -> flee; distant hostile is ignored", async () => {
  let d = await next(new ScriptedPolicy(), obs({ hostiles: [{ name: "zombie", distance: 5 }] }));
  assert.equal(d?.skill, "flee");
  d = await next(new ScriptedPolicy(), obs({ hostiles: [{ name: "zombie", distance: 15 }] }));
  assert.equal(d?.skill, "gather_wood");
});

test("flee is capped, then the plan continues", async () => {
  const p = new ScriptedPolicy();
  const o = obs({ hostiles: [{ name: "zombie", distance: 4 }] });
  const skills: string[] = [];
  for (let i = 0; i < 5; i++) skills.push((await next(p, o))!.skill);
  assert.deepEqual(skills, ["flee", "flee", "flee", "gather_wood", "gather_wood"]);
});

test("hungry with food -> eat; hungry without food -> carry on", async () => {
  let d = await next(new ScriptedPolicy(), obs({ food: 6, inventory: { bread: 2 } }));
  assert.equal(d?.skill, "eat");
  d = await next(new ScriptedPolicy(), obs({ food: 6, inventory: { rotten_flesh: 2 } }));
  assert.equal(d?.skill, "gather_wood");
});

test("night with a bed -> sleep; without one it keeps working", async () => {
  let d = await next(new ScriptedPolicy(), obs({ isDay: false, timeOfDay: 14000, inventory: { red_bed: 1 } }));
  assert.equal(d?.skill, "sleep");
  d = await next(new ScriptedPolicy(), obs({ isDay: false, timeOfDay: 14000 }));
  assert.equal(d?.skill, "gather_wood");
});

test("failed gather -> explore -> retry, and gives up (ends) after repeated failures", async () => {
  const p = new ScriptedPolicy();
  let d = (await next(p, obs()))!;
  assert.equal(d.skill, "gather_wood");
  d = (await next(p, after(d, "failed")))!;
  assert.equal(d.skill, "explore");
  d = (await next(p, after(d, "success")))!;
  assert.equal(d.skill, "gather_wood");
  d = (await next(p, after(d, "failed")))!;
  assert.equal(d.skill, "explore");
  d = (await next(p, after(d, "success")))!;
  assert.equal(d.skill, "gather_wood");
  assert.equal(await next(p, after(d, "failed")), null);
});

test("stone that cannot be found is skipped; the plan moves on to wood", async () => {
  const p = new ScriptedPolicy();
  const inv = { oak_log: 1, wooden_pickaxe: 1 };
  let d = (await next(p, obs({ inventory: inv })))!;
  for (let i = 0; i < 14 && d.skill !== "gather_wood"; i++) {
    assert.ok(["mine_stone", "explore"].includes(d.skill));
    d = (await next(p, after(d, d.skill === "explore" ? "success" : "failed", { inventory: inv })))!;
  }
  assert.equal(d.skill, "gather_wood");
});

test("a short shelter asks for more wood, then builds; then holds until the run ends", async () => {
  const p = new ScriptedPolicy();
  const inv = { oak_log: 11, stone_pickaxe: 1 };
  let d = (await next(p, obs({ inventory: inv })))!;
  assert.equal(d.skill, "build_shelter");
  d = (await next(p, obs({ inventory: inv, recentEvents: ["build_shelter failed (need 4 more building blocks)"] })))!;
  assert.equal(d.skill, "explore");
  d = (await next(p, after(d, "success", { inventory: inv })))!;
  assert.equal(d.skill, "gather_wood");
  assert.equal((d.args as { count: number }).count, 12);
  d = (await next(p, after(d, "success", { inventory: { oak_log: 12, stone_pickaxe: 1 } })))!;
  assert.equal(d.skill, "build_shelter");

  d = (await next(p, after(d, "success", { isDay: false, timeOfDay: 15000, hostiles: [{ name: "zombie", distance: 3 }] })))!;
  assert.equal(d.skill, "wait"); // sheltered: hold, do not flee
  d = (await next(p, after(d, "success", { isDay: false, timeOfDay: 16000 })))!;
  assert.equal(d.skill, "wait");
  const kit = { stone_pickaxe: 1, stone_axe: 1, stone_sword: 1, stone_shovel: 1, iron_pickaxe: 1, diamond_boots: 1 };
  d = (await next(p, after(d, "success", { isDay: true, timeOfDay: 2000, inventory: kit })))!;
  assert.equal(d.skill, "wait"); // morning too: the time budget, not the policy, ends the run
});

test("after the shelter, by day, it makes the other stone tools, then holds", async () => {
  const p = new ScriptedPolicy();
  const built = { oak_log: 12, stone_pickaxe: 1 };
  let d = (await next(p, obs({ inventory: built })))!;
  assert.equal(d.skill, "build_shelter");
  d = (await next(p, after(d, "success", { inventory: { stone_pickaxe: 1, oak_log: 2 } })))!;
  assert.equal(d.skill, "mine_stone");
  assert.equal((d.args as { count: number }).count, 6);
  d = (await next(p, after(d, "success", { inventory: { stone_pickaxe: 1, oak_log: 2, cobblestone: 6 } })))!;
  assert.deepEqual([d.skill, d.args], ["craft", { item: "stone_axe", count: 1 }]);
  d = (await next(p, after(d, "success", { isDay: false, timeOfDay: 15000, inventory: { stone_pickaxe: 1, stone_axe: 1, oak_log: 1, cobblestone: 3 } })))!;
  assert.equal(d.skill, "wait"); // never leaves the shelter at night for tools
});

test("always terminates, even when every skill fails forever", async () => {
  const p = new ScriptedPolicy();
  let o = obs();
  let n = 0;
  for (; n < 200; n++) {
    const d = await next(p, o);
    if (!d) break;
    o = after(d, d.skill === "explore" ? "success" : "failed");
  }
  assert.ok(n < 100, `ran ${n} decisions`);
});

test("terminates when skills claim success but nothing changes", async () => {
  const p = new ScriptedPolicy();
  let o = obs();
  let n = 0;
  for (; n < 300; n++) {
    const d = await next(p, o);
    if (!d) break;
    o = after(d, "success");
  }
  assert.ok(n < 100, `ran ${n} decisions`);
});

test("a craft that reports success but leaves no item is counted as a failure", async () => {
  const p = new ScriptedPolicy();
  const inv = { oak_log: 4 };
  let d = (await next(p, obs({ inventory: inv })))!;
  assert.equal(d.skill, "craft");
  let abandoned = false;
  for (let i = 0; i < 10; i++) {
    d = (await next(p, after(d, "success", { inventory: inv })))!;
    if (d.skill !== "craft") { abandoned = true; break; }
  }
  assert.ok(abandoned, "gave up on a pickaxe that never appears");
});

test("after the outpost it digs for iron, smelts it, then goes down for diamonds", async () => {
  const p = new ScriptedPolicy();
  const kit = { stone_pickaxe: 1, stone_axe: 1, stone_sword: 1, stone_shovel: 1 };
  let d = (await next(p, obs({ inventory: { oak_log: 12, stone_pickaxe: 1 } })))!;
  d = (await next(p, after(d, "success", { inventory: kit })))!; // shelter built
  assert.deepEqual([d.skill, d.args], ["mine_ore", { ore: "iron", count: 3 }]);
  d = (await next(p, after(d, "failed", { inventory: { ...kit, cobblestone: 3 } })))!;
  assert.deepEqual([d.skill, d.args], ["craft", { item: "stone_pickaxe", count: 1 }]); // a spare before digging
  d = (await next(p, after(d, "success", { inventory: { ...kit, stone_pickaxe: 2 } })))!;
  assert.deepEqual([d.skill, d.args], ["descend", { y: 16 }]);
  d = (await next(p, after(d, "success", { inventory: { ...kit, stone_pickaxe: 2 }, position: { x: 0, y: 16, z: 0 } })))!;
  assert.equal(d.skill, "mine_ore");
  const iron = { ...kit, raw_iron: 3, oak_log: 3, cobblestone: 8 };
  d = (await next(p, after(d, "success", { inventory: iron, position: { x: 0, y: 16, z: 0 } })))!;
  assert.deepEqual([d.skill, d.args], ["smelt", { item: "iron_ingot", count: 3 }]);
  d = (await next(p, after(d, "success", { inventory: { ...kit, iron_ingot: 3 }, position: { x: 0, y: 16, z: 0 } })))!;
  assert.deepEqual([d.skill, d.args], ["craft", { item: "iron_pickaxe", count: 1 }]);
  d = (await next(p, after(d, "success", { inventory: { ...kit, stone_pickaxe: 2, iron_pickaxe: 1 }, position: { x: 0, y: 16, z: 0 } })))!;
  assert.deepEqual([d.skill, d.args], ["descend", { y: -58 }]);
});

test("out mining after the shelter, a close hostile means flee, then wait once fleeing is used up", async () => {
  const p = new ScriptedPolicy();
  const inv = { oak_log: 12, stone_pickaxe: 1 };
  let d = (await next(p, obs({ inventory: inv })))!;
  assert.equal(d.skill, "build_shelter");
  d = (await next(p, after(d, "success", { inventory: inv })))!; // by day: off to make tools / mine
  assert.notEqual(d.skill, "flee");
  const skills: string[] = [];
  for (let i = 0; i < 4; i++) {
    d = (await next(p, after(d, "aborted", { inventory: inv, hostiles: [{ name: "skeleton", distance: 7 }] })))!;
    skills.push(d.skill);
  }
  assert.deepEqual(skills, ["flee", "flee", "flee", "wait"]);
});

test("after the shelter, losing every pickaxe (a death) starts the plan again from wood", async () => {
  const p = new ScriptedPolicy();
  let d = (await next(p, obs({ inventory: { oak_log: 12, stone_pickaxe: 1 } })))!;
  assert.equal(d.skill, "build_shelter");
  d = (await next(p, after(d, "success", { inventory: { oak_log: 2, stone_pickaxe: 1 } })))!;
  d = (await next(p, obs({ inventory: {}, recentEvents: ["you died and respawned", `${d.skill} failed (need a wooden_pickaxe — craft one first)`] })))!;
  assert.equal(d.skill, "gather_wood");
});
