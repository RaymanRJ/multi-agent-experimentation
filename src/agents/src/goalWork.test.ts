import { test } from "node:test";
import assert from "node:assert/strict";
import { GOAL_PARTS, aimsOf, classify, disruptionOf, disruptions, goalAtEnd, goalWork, needs, type Member } from "./goalWork.js";
import type { LoggedStep, Observation, SkillResult } from "./types.js";

const parts = GOAL_PARTS["team-base"]!;
const obs = (inventory: Record<string, number> = {}, position = { x: 0, y: 64, z: 0 }): Observation => ({
  step: 1, scenario: "survival", goal: "", position, health: 20, food: 20,
  timeOfDay: 1000, isDay: true, inventory, nearbyBlocks: {}, hostiles: [], otherAgents: [], recentEvents: [],
});
let n = 0;
const step = (skill: string, args: Record<string, unknown>, before: Record<string, number>, after: Record<string, number>, result: SkillResult = { status: "success" }, extra: Partial<LoggedStep> = {}): LoggedStep => {
  n++;
  return { step: n, at: new Date(Date.UTC(2026, 9, 20, 10) + n * 1000).toISOString(), observation: obs(before), decision: { skill, args }, result, decisionMs: 0, calls: [], ticks: n * 100, inventoryAfter: after, ...extra };
};
const base = (by: string, reason = "the large two-storey shelter is finished") =>
  step("build_shelter", { size: "large", storeys: 2 }, {}, {}, { status: "success", reason, detail: { size: 5, storeys: 2, position: { x: 0, y: 64, z: 0 }, by } });

test("classify - a death between steps counts what was held at the end of the step before (bpoc6)", () => {
  // la drowned after one skill ended and before its next observation: that observation shows it empty-handed.
  const died = step("flee", { distance: 32 }, {}, {}, { status: "success" }, { deaths: [{ x: 32, y: 56, z: 9, cause: "drowned", ticks: 43600, timeOfDay: 20257 }] });
  assert.deepEqual(classify(died, parts).setbacks, [], "without the step before, nothing seems lost");
  assert.deepEqual(classify(died, parts, false, { iron_pickaxe: 3, cobblestone: 5 }).setbacks, [{ part: "iron pickaxes", how: "died", items: { iron_pickaxe: 3 } }]);
});

test("classify - what a death dropped, gone a step late, is not a tool worn out (bpoc8)", () => {
  const after = step("flee", { distance: 16 }, { iron_pickaxe: 2 }, {});
  assert.deepEqual(classify(after, parts).setbacks, [{ part: "iron pickaxes", how: "wore out", items: { iron_pickaxe: 2 } }], "with no death before, a vanished tool wore out");
  assert.deepEqual(classify(after, parts, false, { iron_pickaxe: 2 }, true).setbacks, [], "right after a death: already counted there");
});

test("classify - toward a part, groundwork, staying alive, and nothing", () => {
  assert.deepEqual(classify(step("mine_ore", { ore: "iron" }, {}, { raw_iron: 2 }), parts).parts, ["iron pickaxes"]);
  assert.equal(classify(step("mine_ore", { ore: "iron" }, {}, { raw_iron: 2 }), parts).kind, "toward");
  assert.equal(classify(step("gather_wood", { count: 8 }, {}, { oak_log: 8 }), parts).kind, "groundwork");
  assert.equal(classify(step("flee", {}, {}, {}), parts).kind, "safety");
  assert.equal(classify(step("mine_ore", { ore: "iron" }, {}, {}, { status: "failed", reason: "out of reach" }), parts).kind, "nothing");
  assert.equal(classify(base("a"), parts).kind, "toward", "building the base is the part itself");
  assert.equal(classify(step("hunt", { target: "sheep" }, {}, { white_wool: 1, mutton: 2 }), parts).parts.join(), "beds,cooked meat in a chest");
});

test("classify - walking into the base is staying alive; replacing more than the doorway is work on it", () => {
  const into = base("b", "you are inside a large two-storey shelter (b's) at 0,64,0, 2 missing blocks filled, with the doorway closed");
  assert.equal(classify(into, parts).kind, "safety");
  const mended = base("b", "you are inside a large two-storey shelter (b's) at 0,64,0, 5 missing blocks filled, with the doorway closed");
  assert.deepEqual(classify(mended, parts).parts, ["the large two-storey base"]);
});

test("classify - the first sleep is the goal, later ones get through the night", () => {
  const sleep = () => step("sleep", {}, {}, {}, { status: "failed", reason: "got up", detail: { slept: true } });
  assert.deepEqual(classify(sleep(), parts).parts, ["beds"]);
  assert.equal(classify(sleep(), parts, true).kind, "safety");
});

test("classify - setbacks: dying with goal items, a tool worn out, meat taken from the chest", () => {
  const died = classify(step("mine_ore", { ore: "iron" }, { raw_iron: 3, cooked_mutton: 2 }, {}, { status: "aborted" }, { deaths: [{ x: 0, y: 0, z: 0, cause: "was slain by Zombie", ticks: 1, timeOfDay: 1 }] }), parts);
  assert.deepEqual(died.setbacks.map((s) => [s.part, s.how]), [["iron pickaxes", "died"], ["cooked meat in a chest", "died"]]);
  const worn = classify(step("tunnel", { length: 10 }, { iron_pickaxe: 1 }, { cobblestone: 10 }), parts);
  assert.deepEqual(worn.setbacks.map((s) => s.how), ["wore out"]);
  const took = classify(step("take", { item: "cooked_mutton" }, {}, { cooked_mutton: 10 }, { status: "success", detail: { taken: { cooked_mutton: 10 } } }), parts);
  assert.equal(took.kind, "team");
  assert.deepEqual(took.setbacks.map((s) => [s.how, s.items]), [["took from the chest", { cooked_mutton: 10 }]]);
});

test("aimsOf - build_shelter aims at the base only until it stands; wood and stone are preparing", () => {
  const m: Member = { name: "a", offset: 0, steps: [step("build_shelter", { size: "large" }, {}, {}), step("gather_wood", {}, {}, {}), step("build_shelter", { size: "large" }, {}, {})] };
  const doneAt = (m.steps[0]!.ticks ?? 0) + 1;
  assert.deepEqual(aimsOf(m, parts, doneAt), [["the large two-storey base"], ["preparing"], []]);
});

test("disruptions - what cut the work off, what came next, and when it was back at work", () => {
  const m: Member = {
    name: "a", offset: 0,
    steps: [
      step("mine_ore", { ore: "iron" }, {}, {}, { status: "aborted", reason: "interrupted: a zombie came within 6 blocks (now 6)" }),
      { ...step("flee", {}, {}, {}), decision: { skill: "flee", args: {}, rationale: "get away first" } },
      step("wait", { seconds: 10 }, {}, {}),
      step("mine_ore", { ore: "iron" }, {}, { raw_iron: 1 }),
      step("explore", {}, {}, {}, { status: "aborted", reason: "interrupted: the run is ending" }),
    ],
  };
  const ds = disruptions(m, parts);
  assert.equal(ds.length, 1, "the run ending is not a disruption");
  assert.equal(ds[0]!.kind, "mob");
  assert.deepEqual(ds[0]!.aimed, ["iron pickaxes"]);
  assert.equal(ds[0]!.next?.rationale, "get away first");
  assert.deepEqual(ds[0]!.back, { decisions: 3, ticks: 200, parts: ["iron pickaxes"] });
});

test("goalWork - help and hindrance between teammates, and the goal at the end", () => {
  const a: Member = {
    name: "a", offset: 0,
    steps: [
      base("a"),
      step("store", { item: "cooked_mutton" }, { cooked_mutton: 10 }, {}, { status: "success", detail: { stored: { cooked_mutton: 10 }, chests: [{ at: "1,64,1", holds: { cooked_mutton: 10 } }] } }),
      step("sleep", {}, {}, {}, { status: "success", detail: { slept: true } }),
    ],
  };
  const b: Member = {
    name: "b", offset: 0,
    steps: [
      base("a", "you are inside a large two-storey shelter (a's) at 0,64,0 with the doorway closed"),
      step("take", { item: "cooked_mutton", count: 1 }, {}, { cooked_mutton: 10 }, { status: "success", detail: { taken: { cooked_mutton: 10 }, chests: [{ at: "1,64,1", holds: {} }] } }),
      step("give", { to: "a", item: "iron_pickaxe" }, { iron_pickaxe: 1 }, {}, { status: "success", detail: { gave: 1 } }),
    ],
  };
  const w = goalWork([a, b], "team-base")!;
  assert.ok(w.help.includes("b gave iron pickaxe to a"));
  assert.ok(w.help.includes("b used a's shelter 1 time"));
  assert.match(w.hindrance.join(), /b took 10 cooked mutton that a had stored/);
  assert.equal(w.toward["the large two-storey base"]!["a"], 1);
  assert.deepEqual(w.events["beds"]!.map((e) => e.text), ["a slept in a bed for the first time"]);
  const end = goalAtEnd([a, b], "team-base")!;
  assert.deepEqual(end.map((p) => p.met), [true, false, false, false]);
  assert.equal(end[1]!.how, "1 of 2 (not b)");
  assert.equal(end[3]!.how, "0 at the end");
  assert.equal(goalWork([a], "explore"), null, "a goal without parts gets no section");
});

test("needs - handovers asked for or not, and a spare bed kept while a teammate had none", () => {
  const made = step("craft", { item: "white_bed", count: 2 }, {}, { white_bed: 2 });
  const ask = { ...step("wait", {}, {}, {}), decision: { skill: "wait", args: {}, say: { to: "b", text: "b, please bring the beds here" } } };
  const noBed = step("sleep", {}, {}, {}, { status: "failed", reason: "every bed nearby is taken by someone sleeping in it, and you have none to put down" });
  const a: Member = { name: "a", offset: 0, steps: [ask, noBed] };
  const asked = { ...step("give", { to: "a", item: "white_bed" }, { white_bed: 2 }, { white_bed: 1 }, { status: "success", detail: { gave: 1 } }) };
  asked.observation = { ...asked.observation, messages: [{ from: "a", to: "b", text: "please bring the beds here", ageSeconds: 3 }] };
  const unasked = step("give", { to: "a", item: "cobblestone" }, { cobblestone: 8 }, {}, { status: "success", detail: { gave: 8 } });
  const b: Member = { name: "b", offset: 0, steps: [made, asked, unasked] };
  const n = needs([a, b]);
  assert.equal(n.gives, 2);
  assert.equal(n.askedGives, 1, "the bed was asked for; the cobblestone wasn't");
  assert.deepEqual(n.spareBeds, [{ lacking: "a", holder: "b", asked: true, handed: true }]);
});

test("classify - a chosen respawn drops what it held, as its own choice, and breaks nothing off", () => {
  const chosen = step("respawn", {}, { white_wool: 3 }, {}, { status: "success" }, { deaths: [{ x: 0, y: 58, z: 0, cause: "chose to respawn", ticks: 100, timeOfDay: 1000 }] });
  assert.deepEqual(classify(chosen, parts).setbacks, [{ part: "beds", how: "respawned", items: { white_wool: 3 } }]);
  assert.equal(disruptionOf(chosen), null);
});
