import pathfinderPkg from "mineflayer-pathfinder";
import type { Bot } from "mineflayer";
import type { Block } from "prismarine-block";
import type { Skill, SkillContext, SkillResult } from "../types.js";
import { countInventory } from "../observe.js";
import { craft, placeNearby } from "./craft.js";
import { asNumber, closeStrayWindow, openOrWalk, withTimeout } from "./util.js";

const { goals } = pathfinderPkg;

/**
 * A chest lets agents share without meeting: one leaves food at camp, another takes it later. `give`
 * needs both in one place. Items move a whole stack at a time with a shift-click, one click per
 * server reply: mineflayer's own deposit and withdraw send a burst of clicks, which on this server
 * ends with items in the wrong slots (the same fault that broke table crafting; see craft.ts).
 */
export const CHEST_RANGE = 32;
const WALK_TIMEOUT_MS = 30_000;
const MAX_CHESTS_CHECKED = 4;

type Window = NonNullable<Bot["currentWindow"]>;
type Counts = Record<string, number>;

function chestsNear(bot: Bot): Block[] {
  const ids = ["chest", "trapped_chest"].map((name) => bot.registry.blocksByName[name]?.id).filter((id): id is number => id !== undefined);
  return bot
    .findBlocks({ matching: ids, maxDistance: CHEST_RANGE, count: 16 })
    .map((point) => bot.blockAt(point))
    .filter((block): block is Block => block !== null)
    .sort((a, b) => a.position.distanceTo(bot.entity.position) - b.position.distanceTo(bot.entity.position));
}

function where(block: Block): string {
  return `${block.position.x},${block.position.y},${block.position.z}`;
}

/** What the chest part of an open window holds. */
function chestContents(window: Window): Counts {
  const counts: Counts = {};
  for (const item of window.containerItems()) counts[item.name] = (counts[item.name] ?? 0) + item.count;
  return counts;
}

export function describe(counts: Counts): string {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return entries.length ? entries.map(([name, count]) => `${count} ${name}`).join(", ") : "nothing";
}

function difference(after: Counts, before: Counts, sign: 1 | -1): Counts {
  const moved: Counts = {};
  for (const name of new Set([...Object.keys(after), ...Object.keys(before)])) {
    const change = sign * ((after[name] ?? 0) - (before[name] ?? 0));
    if (change > 0) moved[name] = change;
  }
  return moved;
}

/** Shift-clicks one slot and waits for the server to answer before the next click. */
async function moveStack(bot: Bot, window: Window, slot: number): Promise<void> {
  await bot.clickWindow(slot, 0, 1);
  await bot.waitForTicks(4);
}

/**
 * Part of a stack, one paced click at a time: pick the stack up, put one down per right-click in an empty
 * slot of the inventory, and put the rest back. A whole stack for "take 1" emptied the team's food chest
 * in tbase1 (10 cooked mutton for the goal, taken to eat one).
 */
async function moveSome(bot: Bot, window: Window, slot: number, count: number): Promise<boolean> {
  const empty = window.slots.findIndex((item, i) => i >= window.inventoryStart && i < window.inventoryEnd && !item);
  if (empty < 0) return false;
  await bot.clickWindow(slot, 0, 0);
  await bot.waitForTicks(2);
  for (let i = 0; i < count; i++) {
    await bot.clickWindow(empty, 1, 0);
    await bot.waitForTicks(2);
  }
  await bot.clickWindow(slot, 0, 0);
  await bot.waitForTicks(4);
  return true;
}

async function walkTo(bot: Bot, chest: Block): Promise<void> {
  const { x, y, z } = chest.position;
  await withTimeout(bot.pathfinder.goto(new goals.GoalNear(x, y, z, 2)), WALK_TIMEOUT_MS, "walking to the chest").catch(() => undefined);
}

/** Kept by `store` unless asked for by name: what an agent works or eats with. */
function keptByDefault(bot: Bot, name: string): boolean {
  const item = bot.registry.itemsByName[name];
  return !!item && (!!item.maxDurability || name in bot.registry.foodsByName);
}

/** A chest to store into: the nearest one, or one placed from the inventory, or one crafted from planks. */
async function chestToFill(ctx: SkillContext): Promise<Block | string> {
  const near = chestsNear(ctx.bot)[0];
  if (near) return near;
  if ((countInventory(ctx.bot)["chest"] ?? 0) === 0) {
    const made = await craft.run(ctx, { item: "chest", count: 1 });
    if (made.status !== "success") return `no chest within ${CHEST_RANGE} blocks, and could not make one: ${made.reason ?? made.status}`;
  }
  const placed = await placeNearby(ctx, "chest");
  return placed ?? "no chest within reach, and no open ground to put one down — move somewhere clearer";
}

export const store: Skill = {
  name: "store",
  description:
    `Put items into a chest, for yourself or others to take later. Uses the nearest chest within ${CHEST_RANGE} blocks; ` +
    "with none, puts one down (crafting it from 8 planks if you have none). `item` is what to store; without it, " +
    "stores everything except tools, weapons and food. `count` is how many at least (whole stacks are moved, so it " +
    "may be a few more); without it, all you hold of that item. Returns what was stored and what the chest now holds.",
  args: { item: "string?", count: "number?" },

  async run(ctx: SkillContext, args): Promise<SkillResult> {
    const bot = ctx.bot;
    const item = typeof args["item"] === "string" && args["item"].trim() ? args["item"].trim().toLowerCase() : null;
    const wanted = Math.max(1, Math.floor(asNumber(args["count"], Infinity)));
    const held = countInventory(bot);
    const names = item ? [item] : Object.keys(held).filter((name) => !keptByDefault(bot, name) && name !== "chest");
    if (item && !held[item]) return { status: "failed", reason: `you hold no ${item}` };
    if (names.length === 0) return { status: "failed", reason: "nothing to store: you hold only tools, weapons and food (name an item to store one of those)" };

    const chest = await chestToFill(ctx);
    if (typeof chest === "string") return { status: "failed", reason: chest };
    await walkTo(bot, chest);
    await closeStrayWindow(bot);
    let window: Window;
    try {
      window = await openOrWalk(bot, chest, "chest");
    } catch (error) {
      return { status: "failed", reason: (error as Error).message };
    }
    const before = countInventory(bot);
    let holds: Counts;
    let full = false;
    try {
      let moved = 0;
      for (const stack of window.items().filter((stack) => names.includes(stack.name))) {
        if (moved >= wanted || ctx.shouldStop()) break;
        if (window.emptySlotCount() === 0 && !window.containerItems().some((s) => s.name === stack.name && s.count < s.stackSize)) {
          full = true;
          break;
        }
        await moveStack(bot, window, stack.slot);
        moved += stack.count;
      }
      holds = chestContents(window);
    } finally {
      bot.closeWindow(window);
    }
    await bot.waitForTicks(4);
    const stored = difference(countInventory(bot), before, -1);
    const summary = `the chest at ${where(chest)} now holds ${describe(holds)}`;
    if (Object.keys(stored).length === 0) {
      return { status: "failed", reason: full ? `the chest at ${where(chest)} is full (${describe(holds)})` : `nothing was stored; ${summary}`, detail: { chests: [{ at: where(chest), holds }] } };
    }
    return {
      status: "success",
      reason: `stored ${describe(stored)}${full ? " (the chest is now full)" : ""}; ${summary}`,
      detail: { chests: [{ at: where(chest), holds }], stored },
    };
  },
};

export const take: Skill = {
  name: "take",
  description:
    `Take items out of a chest within ${CHEST_RANGE} blocks. \`item\` is what to take; \`count\` is how many; ` +
    "without it, all the chest has. Looks in the nearest chests " +
    "first. Returns what was taken and what each chest it opened holds.",
  args: { item: "string", count: "number?" },

  async run(ctx: SkillContext, args): Promise<SkillResult> {
    const bot = ctx.bot;
    const item = String(args["item"] ?? "").trim().toLowerCase();
    if (!item) return { status: "failed", reason: "say what to take: `item` is required" };
    const wanted = Math.max(1, Math.floor(asNumber(args["count"], Infinity)));
    const chests = chestsNear(bot).slice(0, MAX_CHESTS_CHECKED);
    if (chests.length === 0) return { status: "failed", reason: `no chest within ${CHEST_RANGE} blocks` };

    const start = countInventory(bot);
    const seen: string[] = [];
    const views: Array<{ at: string; holds: Counts }> = [];
    let full = false;
    for (const chest of chests) {
      if (ctx.shouldStop() || full) break;
      const taken = (countInventory(bot)[item] ?? 0) - (start[item] ?? 0);
      if (taken >= wanted) break;
      await walkTo(bot, chest);
      await closeStrayWindow(bot);
      let window: Window;
      try {
        window = await openOrWalk(bot, chest, "chest");
      } catch (error) {
        seen.push(`the chest at ${where(chest)} did not open`);
        continue;
      }
      try {
        let moved = taken;
        for (const stack of window.containerItems().filter((stack) => stack.name === item)) {
          if (moved >= wanted || ctx.shouldStop()) break;
          if (bot.inventory.emptySlotCount() === 0) {
            full = true;
            break;
          }
          const left = wanted - moved;
          if (stack.count > left) {
            if (!(await moveSome(bot, window, stack.slot, left))) { full = true; break; }
            moved += left;
          } else {
            await moveStack(bot, window, stack.slot);
            moved += stack.count;
          }
        }
        await bot.waitForTicks(2);
        const holds = chestContents(window);
        views.push({ at: where(chest), holds });
        seen.push(`the chest at ${where(chest)} holds ${describe(holds)}`);
      } finally {
        bot.closeWindow(window);
      }
      await bot.waitForTicks(4);
    }
    const gained = difference(countInventory(bot), start, 1);
    const looked = seen.join("; ");
    if (!gained[item]) {
      return { status: "failed", reason: `no ${item} in the ${chests.length === 1 ? "chest" : "chests"} nearby: ${looked}`, detail: { chests: views } };
    }
    return {
      status: "success",
      reason: `took ${describe(gained)}${full ? " (your inventory is full)" : ""}; ${looked}`,
      detail: { chests: views, taken: gained },
    };
  },
};
