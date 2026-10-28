import { test } from "node:test";
import assert from "node:assert/strict";
import { respawn } from "./respawn.js";
import { context, fakeBot } from "../testing/fakeBot.js";

test("respawn - says plainly that everything carried is lost, and where it comes back", () => {
  assert.match(respawn.description, /You lose everything you carry/);
  assert.match(respawn.description, /bed you last slept in/);
});

test("respawn - without a way to send server commands, refuses before doing anything", async () => {
  const { bot } = fakeBot({ position: { x: 0.5, y: 64, z: 0.5 }, inventory: { cobblestone: 3 } });
  const result = await respawn.run(context(bot), {});
  assert.equal(result.status, "failed");
});
