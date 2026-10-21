import type { Bot } from "mineflayer";
import type { Item } from "prismarine-item";

/**
 * Tools wear out: a wooden pickaxe lasts 59 uses, a stone one 131. A player sees the durability bar
 * shrink and hears the tool break; the agent saw only an item gone from its inventory (32 times in
 * the logs before this, all pickaxes, mostly deep in descend or mine_stone). This gives it both.
 */

/** Shown once a tool has a quarter of its life or less left. */
const WEAR_SHOWN_FROM = 0.25;
/** A tool slot emptying with this many uses or fewer left is a tool breaking, not one being moved. */
const BREAK_USES = 3;

function usesLeft(item: Item): number | null {
  const max = item.maxDurability;
  if (!max) return null;
  return max - (item.durabilityUsed ?? 0);
}

/** Uses left on each tool that is wearing out, the most worn of a kind when there are several. */
export function wearingOut(bot: Bot): Record<string, number> {
  const worn: Record<string, number> = {};
  for (const item of bot.inventory.items()) {
    const left = usesLeft(item);
    if (left === null || left > item.maxDurability * WEAR_SHOWN_FROM) continue;
    worn[item.name] = Math.min(worn[item.name] ?? Infinity, left);
  }
  return worn;
}

function held(bot: Bot, name: string): number {
  return bot.inventory.items().filter((item) => item.name === name).length;
}

/**
 * Calls `onBreak` with the tool's name when one breaks. A nearly-spent tool leaving its slot could
 * also be the tool being moved (equipped); it is a break only if no copy turns up elsewhere a moment
 * later. A death empties every slot, so nothing is reported while the bot is dead.
 */
export function watchBreaks(bot: Bot, onBreak: (name: string) => void, settleMs = 250): void {
  bot.inventory.on("updateSlot", (_slot: number, oldItem: Item | null, newItem: Item | null) => {
    if (!oldItem || (newItem && newItem.name === oldItem.name)) return;
    const left = usesLeft(oldItem);
    if (left === null || left > BREAK_USES || bot.health <= 0) return;
    const before = held(bot, oldItem.name);
    setTimeout(() => {
      if (bot.health > 0 && held(bot, oldItem.name) <= before) onBreak(oldItem.name);
    }, settleMs);
  });
}
