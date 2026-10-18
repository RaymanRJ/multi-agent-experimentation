import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TeamBoard, combine, stillWorking } from "./team.js";

const member = (inventory: Record<string, number>, more: Partial<{ shelterBuilt: boolean; shelterStoreys: number; goalMet: boolean }> = {}) =>
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
