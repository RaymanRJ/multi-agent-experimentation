import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import type { Bot } from "mineflayer";
import { observe } from "./observe.js";
import { fakeBot } from "./testing/fakeBot.js";
import { watchBreaks, wearingOut } from "./toolWear.js";

const base = { step: 1, scenario: "survival" as const, goal: "", recentEvents: [] as string[] };

test("wearingOut - lists tools in their last quarter, with uses left; fresh tools and blocks are left out", () => {
  // stone_pickaxe lasts 131: 120 used leaves 11. wooden_axe lasts 59: 10 used leaves 49 (fresh enough).
  const { bot } = fakeBot({ inventory: { stone_pickaxe: 1, wooden_axe: 1, cobblestone: 5 }, worn: { stone_pickaxe: 120, wooden_axe: 10 } });
  assert.deepEqual(wearingOut(bot), { stone_pickaxe: 11 });
  assert.deepEqual(observe(bot, base).wearingOut, { stone_pickaxe: 11 });
  assert.equal("wearingOut" in observe(fakeBot({ inventory: { stone_pickaxe: 1 } }).bot, base), false, "omitted when nothing is worn");
});

/** Just enough bot for watchBreaks: an inventory that emits updateSlot, and health. */
function slotBot(): { bot: Bot; inventory: EventEmitter & { held: Array<{ name: string }> } } {
  const inventory = Object.assign(new EventEmitter(), { held: [] as Array<{ name: string }> });
  const bot = { health: 20, inventory: Object.assign(inventory, { items: () => inventory.held }) } as unknown as Bot;
  return { bot, inventory };
}
const tool = (name: string, max: number, used: number) => ({ name, maxDurability: max, durabilityUsed: used });
const settle = () => new Promise((resolve) => setTimeout(resolve, 30));

test("watchBreaks - a spent tool leaving its slot for good is a break", async () => {
  const { bot, inventory } = slotBot();
  const broke: string[] = [];
  watchBreaks(bot, (name) => broke.push(name), 10);
  inventory.emit("updateSlot", 36, tool("stone_pickaxe", 131, 130), null);
  await settle();
  assert.deepEqual(broke, ["stone_pickaxe"]);
});

test("watchBreaks - a spent tool moved to another slot, a fresh tool leaving, or a death is not a break", async () => {
  const { bot, inventory } = slotBot();
  const broke: string[] = [];
  watchBreaks(bot, (name) => broke.push(name), 10);
  // Equipping: it leaves one slot and turns up in another.
  inventory.emit("updateSlot", 12, tool("stone_pickaxe", 131, 130), null);
  inventory.held.push({ name: "stone_pickaxe" });
  // Given away or dropped with plenty of uses left.
  inventory.emit("updateSlot", 13, tool("wooden_axe", 59, 5), null);
  await settle();
  // Dead: every slot empties.
  (bot as { health: number }).health = 0;
  inventory.emit("updateSlot", 14, tool("iron_pickaxe", 250, 249), null);
  await settle();
  assert.deepEqual(broke, []);
});
