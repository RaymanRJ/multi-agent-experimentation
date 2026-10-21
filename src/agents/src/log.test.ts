import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RunLog } from "./log.js";

test("RunLog - one JSON object per line, appended in order, under runs/", () => {
  const dir = mkdtempSync(join(tmpdir(), "runlog-"));
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const log = new RunLog("2026-01-01T00-00-00-000Z", "tester");
    assert.equal(log.file, "runs/2026-01-01T00-00-00-000Z-tester.jsonl");
    log.write({ step: 1 } as never);
    log.write({ step: 2, ended: "goal met" } as never);
    const lines = readFileSync(join(dir, log.file), "utf8").trim().split("\n").map((line) => JSON.parse(line));
    assert.deepEqual(lines, [{ step: 1 }, { step: 2, ended: "goal met" }]);
  } finally {
    process.chdir(cwd);
  }
});
