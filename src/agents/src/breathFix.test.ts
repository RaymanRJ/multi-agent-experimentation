import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createRequire } from "node:module";
import type { Bot } from "mineflayer";
import { fixOwnAir } from "./breathFix.js";

const registry = createRequire(import.meta.url)("minecraft-data")("1.21.1");

test("fixOwnAir - another creature's air never becomes the bot's", () => {
  const bot = Object.assign(new EventEmitter(), { registry, entity: { metadata: [] as unknown[] }, oxygenLevel: undefined as number | undefined }) as unknown as Bot;
  fixOwnAir(bot);
  bot.oxygenLevel = 400; // what mineflayer sets for an axolotl's 6000 ticks of air
  bot.emit("breath");
  assert.equal(bot.oxygenLevel, 20, "nothing recorded for the bot: full");
  (bot.entity.metadata as unknown[])[1] = 150; // the bot's own air: half
  bot.oxygenLevel = 19; // a squid's, arriving after
  bot.emit("breath");
  assert.equal(bot.oxygenLevel, 10);
});
