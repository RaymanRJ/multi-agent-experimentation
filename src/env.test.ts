import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { env, loadEnv } from "./env.js";

test("loadEnv - reads KEY=value lines, skips comments and blanks, never overrides the environment", () => {
  const file = join(mkdtempSync(join(tmpdir(), "env-")), ".env");
  writeFileSync(file, "# a comment\n\nMAE_TEST_A = one \nMAE_TEST_B=two=2\nnot a pair\nMAE_TEST_SET=from-file\n");
  process.env["MAE_TEST_SET"] = "from-shell";
  loadEnv(file);
  assert.equal(process.env["MAE_TEST_A"], "one");
  assert.equal(process.env["MAE_TEST_B"], "two=2", "only the first = splits");
  assert.equal(process.env["MAE_TEST_SET"], "from-shell", "the shell wins over the file");
});

test("loadEnv - a missing file is not an error", () => {
  assert.doesNotThrow(() => loadEnv(join(tmpdir(), "no-such-dir", ".env")));
});

test("env - falls back when unset or empty", () => {
  delete process.env["MAE_TEST_UNSET"];
  process.env["MAE_TEST_EMPTY"] = "";
  process.env["MAE_TEST_FULL"] = "x";
  assert.equal(env("MAE_TEST_UNSET", "fallback"), "fallback");
  assert.equal(env("MAE_TEST_EMPTY", "fallback"), "fallback");
  assert.equal(env("MAE_TEST_FULL", "fallback"), "x");
});
