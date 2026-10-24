import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TeamBoard, combine, inChests, mergeShelters, stillWorking, type ChestViews } from "./team.js";

test("mergeShelters - one entry per shelter, finished when the first agent saw it so", () => {
  const built = { x: 0, y: 64, z: 0, storeys: 2, size: 5 as const, complete: true, by: "qa", finishedAt: 100 };
  const wentIn = { ...built, by: "qa", finishedAt: 300 };
  const unfinished = { x: 9, y: 64, z: 0, storeys: 1, complete: false };
  assert.deepEqual(mergeShelters([[wentIn], [built, unfinished]]), [{ ...wentIn, finishedAt: 100 }, unfinished]);
});

const member = (inventory: Record<string, number>, more: Partial<{ shelterBuilt: boolean; shelterStoreys: number; goalMet: boolean; chests: ChestViews }> = {}) =>
  ({ inventory, shelterBuilt: false, nightSurvivedSinceShelter: false, shelterStoreys: 0, goalMet: false, ...more });

test("combine - adds up what the team holds, and counts a shelter built by anyone", () => {
  const team = combine([member({ stone_pickaxe: 1, cobblestone: 2 }), member({ cobblestone: 3, stone_axe: 1 }, { shelterBuilt: true, shelterStoreys: 2 })]);
  assert.deepEqual(team.inventory, { stone_pickaxe: 1, cobblestone: 5, stone_axe: 1 });
  assert.equal(team.shelterBuilt, true);
  assert.equal(team.shelterStoreys, 2);
  assert.equal(combine([member({})]).shelterBuilt, false);
});

test("TeamBoard - each agent writes its own state and reads its teammates'", () => {
  const root = mkdtempSync(join(tmpdir(), "board-"));
  try {
    const haiku = new TeamBoard(root, "team-t1-1", "haiku", ["haiku", "qwen"]);
    const qwen = new TeamBoard(root, "team-t1-1", "qwen", ["haiku", "qwen"]);
    assert.deepEqual(haiku.read(), { qwen: undefined }, "a teammate that hasn't written yet");
    qwen.publish(member({ stone_sword: 1 }, { goalMet: true }));
    const seen = haiku.read()["qwen"]!;
    assert.deepEqual(seen.inventory, { stone_sword: 1 });
    assert.equal(seen.goalMet, true);
    assert.deepEqual(stillWorking(haiku.read()), []);
    assert.deepEqual(stillWorking(qwen.read()), ["haiku"]);
    assert.deepEqual(readdirSync(haiku.dir), ["qwen.json"], "no temporary file left behind");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("TeamBoard - an episode name can't point outside the board", () => {
  const root = mkdtempSync(join(tmpdir(), "board-"));
  try {
    const board = new TeamBoard(root, "../../etc", "a", ["a", "b"]);
    assert.ok(board.dir.startsWith(join(root, ".teams")), board.dir);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("chests - the team sees each chest as whoever opened it last, and can add them up", () => {
  const a = member({}, { chests: { "1,64,1": { holds: { cooked_beef: 12 }, seenAt: 100 } } });
  const b = member({}, { chests: { "1,64,1": { holds: { cooked_beef: 5 }, seenAt: 200 }, "9,64,9": { holds: { cobblestone: 40, cooked_beef: 3 }, seenAt: 150 } } });
  const team = combine([a, b]);
  assert.deepEqual(team.chests?.["1,64,1"]?.holds, { cooked_beef: 5 }, "b took 7 after a stored 12");
  assert.deepEqual(inChests(team.chests), { cooked_beef: 8, cobblestone: 40 });
  assert.deepEqual(inChests(undefined), {});
});
