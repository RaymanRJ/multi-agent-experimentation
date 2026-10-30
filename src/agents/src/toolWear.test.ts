import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import type { Bot } from "mineflayer";
import { observe } from "./observe.js";
import { fakeBot } from "./testing/fakeBot.js";
import { toolUses, toolWear, watchBreaks, wearSpent } from "./toolWear.js";

const base = { step: 1, scenario: "survival" as const, goal: "", recentEvents: [] as string[] };

test("toolUses - every tool held, fresh or worn, with its uses left; blocks are left out (tluna6 rep 2)", () => {
  // stone_pickaxe lasts 131: 120 used leaves 11. wooden_axe lasts 59: 10 used leaves 49.
  const { bot } = fakeBot({ inventory: { stone_pickaxe: 1, wooden_axe: 1, cobblestone: 5 }, worn: { stone_pickaxe: 120, wooden_axe: 10 } });
  assert.deepEqual(toolUses(bot), { stone_pickaxe: "11 of 131 uses left", wooden_axe: "49 of 59 uses left" });
  assert.deepEqual(observe(bot, base).tools, { stone_pickaxe: "11 of 131 uses left", wooden_axe: "49 of 59 uses left" });
  assert.deepEqual(observe(fakeBot({ inventory: { iron_pickaxe: 1 } }).bot, base).tools, { iron_pickaxe: "250 of 250 uses left" }, "a fresh tool is shown too");
  assert.equal("tools" in observe(fakeBot({ inventory: { cobblestone: 3 } }).bot, base), false, "omitted when no tool is held");
});

test("wearSpent - says what a skill cost each tool still held, and nothing for one untouched", () => {
  const before = { iron_pickaxe: { left: [120], max: 250 }, stone_pickaxe: { left: [40], max: 131 } };
  const after = { iron_pickaxe: { left: [84], max: 250 }, stone_pickaxe: { left: [40], max: 131 } };
  assert.deepEqual(wearSpent("descend", before, after), ["descend spent 36 uses of your iron_pickaxe: 84 of 250 left"]);
  assert.deepEqual(wearSpent("descend", before, { iron_pickaxe: { left: [84], max: 250 } }), ["descend spent 36 uses of your iron_pickaxe: 84 of 250 left"], "a broken tool is left to the break event");
  assert.equal(toolWear(fakeBot({ inventory: { cobblestone: 3 } }).bot).cobblestone, undefined);
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
