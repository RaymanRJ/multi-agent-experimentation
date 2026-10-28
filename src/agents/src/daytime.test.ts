import { test } from "node:test";
import assert from "node:assert/strict";
import { newDayBegan } from "./daytime.js";

test("newDayBegan - the time going round to morning, through the night or by sleeping it away", () => {
  assert.equal(newDayBegan(23950, 30), true, "through the night");
  assert.equal(newDayBegan(12600, 0), true, "slept from dusk, before NIGHT_START");
  assert.equal(newDayBegan(1000, 1020), false, "an ordinary day");
  assert.equal(newDayBegan(14000, 14020), false, "an ordinary night");
});
