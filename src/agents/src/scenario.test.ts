import { test } from "node:test";
import assert from "node:assert/strict";
import { GOALS, GOAL_CHECKS, GOAL_GAPS, HERDS, SCENARIOS, TEAM_GOALS, herdCommands, goalTask, isNight, NightWatch, presetName, resolveGoal } from "./scenario.js";

test("resolveGoal - no goal uses the scenario's own", () => {
  assert.equal(resolveGoal(SCENARIOS.survival, undefined), SCENARIOS.survival.goal);
  assert.equal(resolveGoal(SCENARIOS.sandbox, "  "), SCENARIOS.sandbox.goal);
});

test("resolveGoal - preset names, case-insensitive", () => {
  assert.equal(resolveGoal(SCENARIOS.sandbox, "shelter"), GOALS["shelter"]);
  assert.equal(resolveGoal(SCENARIOS.sandbox, "Tools"), GOALS["tools"]);
});

test("resolveGoal - a sentence is used as the goal itself", () => {
  assert.equal(resolveGoal(SCENARIOS.survival, "Mine 10 stone"), "Mine 10 stone");
});

test("resolveGoal - an unknown single word is rejected as a likely typo", () => {
  assert.throws(() => resolveGoal(SCENARIOS.sandbox, "shleter"), /unknown goal "shleter"/);
});

test("outpost - needs all four stone tools, a shelter, and a night survived after it", () => {
  const tools = { stone_pickaxe: 1, stone_axe: 1, stone_sword: 1, stone_shovel: 1 };
  const check = GOAL_CHECKS["outpost"]!;
  const done = { skill: "wait", status: "success", inventory: tools, shelterBuilt: true, nightSurvivedSinceShelter: true };
  assert.equal(check(done), true);
  assert.equal(check({ ...done, nightSurvivedSinceShelter: false }), false);
  assert.equal(check({ ...done, shelterBuilt: false }), false);
  assert.equal(check({ ...done, inventory: { ...tools, stone_shovel: 0 } }), false);
  assert.equal(isNight(18000), true);
  assert.equal(isNight(23500), false);
});

test("goal gaps name what is missing, and nothing once the goal is met", () => {
  const state = { skill: "done", status: "success", inventory: { stone_pickaxe: 1, stone_axe: 1 }, shelterBuilt: true, nightSurvivedSinceShelter: false };
  assert.deepEqual(GOAL_GAPS["tools"]!(state), []);
  assert.deepEqual(GOAL_GAPS["iron"]!(state), ["you have no iron_pickaxe"]);
  assert.deepEqual(GOAL_GAPS["outpost"]!(state), [
    "you have no stone_sword",
    "you have no stone_shovel",
    "you have not yet survived a night since building the shelter",
  ]);
});

const OPEN_ENDED = new Set(["gather", "explore"]);
const state = (inventory: Record<string, number>, more: Partial<{ skill: string; status: string; shelterBuilt: boolean; nightSurvivedSinceShelter: boolean; shelterStoreys: number }> = {}) =>
  ({ skill: "wait", status: "success", inventory, shelterBuilt: false, nightSurvivedSinceShelter: false, ...more });

test("every preset with an end has a check and gaps; open-ended ones have neither", () => {
  for (const preset of Object.keys(GOALS)) {
    const task = goalTask(preset);
    if (OPEN_ENDED.has(task)) {
      assert.equal(GOAL_CHECKS[task], undefined, task);
      continue;
    }
    assert.ok(GOAL_CHECKS[task], `${preset} has a check`);
    assert.ok(GOAL_GAPS[task], `${preset} has gaps`);
  }
});

test("goal checks and gaps agree: unmet goals list a gap, met ones list none", () => {
  const kit = { stone_pickaxe: 1, stone_axe: 1, stone_sword: 1, stone_shovel: 1 };
  const cases: Array<[string, ReturnType<typeof state>, ReturnType<typeof state>]> = [
    ["tools", state({}), state({ stone_pickaxe: 1 })],
    ["iron", state({ stone_pickaxe: 1, iron_ingot: 3 }), state({ iron_pickaxe: 1 })],
    ["diamond", state({ diamond: 4 }), state({ diamond_boots: 1 })],
    ["outpost", state(kit, { shelterBuilt: true }), state(kit, { shelterBuilt: true, nightSurvivedSinceShelter: true })],
    ["team-camp", state(kit, { shelterBuilt: true }), state(kit, { shelterBuilt: true, shelterStoreys: 2 })],
  ];
  for (const [goal, unmet, met] of cases) {
    assert.equal(GOAL_CHECKS[goal]!(unmet), false, `${goal} not met`);
    assert.ok(GOAL_GAPS[goal]!(unmet).length > 0, `${goal} names a gap`);
    assert.equal(GOAL_CHECKS[goal]!(met), true, `${goal} met`);
    assert.deepEqual(GOAL_GAPS[goal]!(met), [], `${goal} has no gap left`);
  }
});

test("shelter - met only by a build_shelter that succeeds", () => {
  const check = GOAL_CHECKS["shelter"]!;
  assert.equal(check(state({}, { skill: "build_shelter", status: "success" })), true);
  assert.equal(check(state({}, { skill: "build_shelter", status: "failed" })), false);
  assert.equal(check(state({ oak_planks: 64 }, { skill: "wait", shelterBuilt: true })), false, "only the build itself");
});

test("guided presets share their task's success rule", () => {
  assert.equal(goalTask("tools-guided"), "tools");
  assert.equal(goalTask("shelter-guided"), "shelter");
  assert.equal(goalTask("iron"), "iron");
});

test("presetName - finds a preset by its text, and nothing for free text", () => {
  for (const [name, text] of Object.entries(GOALS)) assert.equal(presetName(text), name);
  assert.equal(presetName("Mine 10 stone"), undefined);
});

test("isNight - from 13000 until 23000", () => {
  assert.equal(isNight(12999), false);
  assert.equal(isNight(13000), true);
  assert.equal(isNight(22999), true);
  assert.equal(isNight(23000), false);
  assert.equal(isNight(0), false);
});

test("scenario parity - sandbox and survival differ only in setup and goal text", () => {
  const { sandbox, survival } = SCENARIOS;
  const rest = (s: typeof sandbox) => {
    const { setup: _setup, goal: _goal, ...other } = s;
    return Object.keys(other).filter((k) => k !== "name");
  };
  assert.deepEqual(rest(sandbox), rest(survival));
  assert.notDeepEqual(sandbox.setup, survival.setup);
});

test("team-camp - every member must carry a stone tool, and the shelter must have two storeys", () => {
  const check = GOAL_CHECKS["team-camp"]!, gaps = GOAL_GAPS["team-camp"]!;
  const kit = { stone_pickaxe: 1, stone_axe: 1, stone_sword: 1, stone_shovel: 1 };
  const base = { skill: "wait", status: "success", inventory: kit, shelterBuilt: true, nightSurvivedSinceShelter: false, shelterStoreys: 2 };
  assert.equal(check({ ...base, members: { haiku: { stone_pickaxe: 1, stone_axe: 1 }, qwen: { stone_sword: 1, stone_shovel: 1 } } }), true);
  const hoarded = { ...base, members: { haiku: kit, qwen: { wooden_pickaxe: 1 } } };
  assert.equal(check(hoarded), false);
  assert.deepEqual(gaps(hoarded), ["qwen carries no stone tool"]);
  assert.deepEqual(gaps({ ...base, shelterStoreys: 1, members: { haiku: kit } }), ["nobody on the team has built a two-storey shelter yet"]);
});

test("NightWatch - a night survived after the shelter, alive, from dusk to sunrise", () => {
  const w = new NightWatch();
  w.tick(false, 14000, false); // a night before the shelter doesn't count
  w.tick(false, 1000, false);
  assert.equal(w.survived, false);
  w.tick(true, 12000, false);
  w.tick(true, 14000, false);
  assert.equal(w.survived, false, "still dark");
  w.tick(true, 23100, false);
  assert.equal(w.survived, true);
  w.died();
  assert.equal(w.survived, true, "a death after the night doesn't undo it");
});

test("NightWatch - dying at night forfeits that night; the next one must be survived", () => {
  const w = new NightWatch();
  w.tick(true, 14000, false);
  w.died();
  w.tick(true, 18000, false); // still the same night, after respawning
  w.tick(true, 23100, false); // its sunrise
  assert.equal(w.survived, false, "the night it died in is lost");
  w.tick(true, 14000, false);
  w.tick(true, 23100, false);
  assert.equal(w.survived, true);
});

test("NightWatch - sleeping through the night counts", () => {
  const w = new NightWatch();
  w.tick(true, 12600, true); // in bed at dusk, before isNight
  w.tick(true, 0, false); // the night was skipped
  assert.equal(w.survived, true);
});

test("herds - both scenarios place the same animals, each with its own tag, in force-loaded chunks", () => {
  const herd = herdCommands();
  for (const scenario of Object.values(SCENARIOS)) assert.deepEqual(scenario.setup.filter((c) => herd.includes(c)), herd);
  const summons = herd.filter((c) => c.includes(" summon "));
  assert.equal(summons.length, HERDS.reduce((n, h) => n + h.count, 0));
  const tags = summons.map((c) => c.match(/tag=(\S+)\]/)![1]);
  assert.equal(new Set(tags).size, tags.length, "a tag per animal, so placing twice adds nothing");
  assert.equal(herd.filter((c) => c.startsWith("forceload add")).length, herd.filter((c) => c.startsWith("forceload remove")).length);
});

test("team-homestead - every member sleeps and carries an iron pickaxe, a two-storey shelter, 10 cooked meat in chests", () => {
  const gaps = GOAL_GAPS["team-homestead"]!, check = GOAL_CHECKS["team-homestead"]!;
  const chests = { "1,64,1": { holds: { cooked_beef: 6, cooked_porkchop: 4 }, seenAt: 1 } };
  const done = {
    skill: "store", status: "success", inventory: {}, shelterBuilt: true, nightSurvivedSinceShelter: false, shelterStoreys: 2, chests,
    members: { qa: { iron_pickaxe: 1 }, qb: { iron_pickaxe: 1, cobblestone: 3 } },
    membersSlept: { qa: true, qb: true },
  };
  assert.equal(check(done), true);
  assert.deepEqual(gaps({ ...done, shelterStoreys: 1, members: { qa: { iron_pickaxe: 1 }, qb: {} }, membersSlept: { qa: true, qb: false }, chests: {} }), [
    "nobody on the team has built a two-storey shelter yet",
    "qb has not slept in a bed yet",
    "qb carries no iron_pickaxe",
    "the chests the team has opened hold 0 cooked meat, not 10",
  ]);
  assert.ok(TEAM_GOALS.has("team-homestead"));
  // Alone, an agent is a team of one.
  assert.deepEqual(gaps({ skill: "", status: "", inventory: { iron_pickaxe: 1 }, shelterBuilt: true, nightSurvivedSinceShelter: false, shelterStoreys: 2, sleptInBed: true, chests }), []);
});

test("team-base - one large two-storey shelter that every member slept inside, iron pickaxes and meat as team-homestead", () => {
  const gaps = GOAL_GAPS["team-base"]!, check = GOAL_CHECKS["team-base"]!;
  const chests = { "1,64,1": { holds: { cooked_mutton: 10 }, seenAt: 1 } };
  const base = { x: 0, y: 64, z: 0, storeys: 2, size: 5 as const, complete: true };
  const hut = { x: 40, y: 64, z: 0, storeys: 2, size: 3 as const, complete: true };
  const done = {
    skill: "sleep", status: "success", inventory: {}, shelterBuilt: true, nightSurvivedSinceShelter: false, chests,
    shelters: [hut, base],
    members: { qa: { iron_pickaxe: 1 }, qb: { iron_pickaxe: 1 } },
    membersSleptIn: { qa: ["0,64,0"], qb: ["40,64,0", "0,64,0"] },
  };
  assert.equal(check(done), true);
  // Slept, but in a different shelter: not the shared one.
  assert.deepEqual(gaps({ ...done, membersSleptIn: { qa: ["0,64,0"], qb: ["40,64,0"] } }), ["qb has not slept in a bed inside the large shelter at 0,64,0"]);
  // Only small huts, or a large one left unfinished.
  assert.deepEqual(gaps({ ...done, shelters: [hut, { ...base, complete: false }] }).slice(0, 1), ["nobody on the team has finished a large two-storey shelter yet"]);
  assert.deepEqual(gaps({ ...done, shelters: [{ ...base, storeys: 1 }] }).slice(0, 1), ["nobody on the team has finished a large two-storey shelter yet"]);
  assert.ok(TEAM_GOALS.has("team-base"));
  assert.match(GOALS["team-base"]!, /one large two-storey shelter/);
});
