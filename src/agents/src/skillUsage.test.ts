import { test } from "node:test";
import assert from "node:assert/strict";
import type { LoggedStep } from "./types.js";
import { renderSkillUsage, skillUsage } from "./skillUsage.js";

const step = (n: number, skill: string, status: "success" | "failed" | "aborted", ticks: number, extra: Partial<LoggedStep> = {}): LoggedStep =>
  ({ step: n, at: "2026-10-20T00:00:00Z", observation: {} as never, decision: { skill, args: {} }, result: { status }, decisionMs: 0, calls: [], ticks, ...extra }) as LoggedStep;

test("skillUsage - counts runs, choices and outcomes per skill, and lists skills never chosen", () => {
  const met = { goalMet: true as const, model: "A", steps: [step(1, "gather_wood", "success", 100), step(2, "craft", "failed", 150), step(3, "craft", "success", 200)] };
  const other = { goalMet: false as const, model: "B", steps: [step(1, "gather_wood", "aborted", 50), step(2, "say", "failed", 60, { result: { status: "failed", reason: "no such skill: say" } })] };
  const u = skillUsage([met, other]);
  const craft = u.rows.find((r) => r.skill === "craft")!;
  const wood = u.rows.find((r) => r.skill === "gather_wood")!;
  assert.deepEqual([craft.runs, craft.chosen, craft.worked, craft.failed, craft.inMet, craft.inOther], [1, 2, 1, 1, 1, 0]);
  assert.deepEqual([wood.runs, wood.chosen, wood.interrupted, wood.inMet, wood.inOther], [2, 2, 1, 1, 1]);
  assert.equal(u.rows[0]!.skill, "gather_wood", "most runs first");
  assert.ok(u.never.includes("shear") && !u.never.includes("craft"));
  assert.deepEqual(u.invented, { say: 1 });
  assert.equal(craft.ticks, 100, "ticks are the span since the previous step");
  const text = renderSkillUsage(u).join("\n");
  assert.match(text, /\| `craft` \| 1 of 2 \| 2 \| 50% \| 50% \| 0% \|/);
  assert.match(text, /Never chosen:.*`shear`/);
  assert.match(text, /`say` ×1/);
});

test("skillUsage - the model's thinking is not counted as the skill's game time", () => {
  const u = skillUsage([{ goalMet: true, model: "A", steps: [step(1, "wait", "success", 100, { decisionMs: 2000 })] }]);
  assert.equal(u.rows[0]!.ticks, 60, "100 ticks, of which 2 s (40 ticks) were thinking");
  assert.equal(u.totalTicks, 100);
});
