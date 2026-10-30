import type { Bot } from "mineflayer";
import type { Item } from "prismarine-item";

/**
 * Tools wear out: a wooden pickaxe lasts 59 uses, a stone one 131. A player sees the durability bar
 * shrink and hears the tool break; the agent saw only an item gone from its inventory (32 times in
 * the logs before this, all pickaxes, mostly deep in descend or mine_stone). This gives it both.
 */

/** A tool slot emptying with this many uses or fewer left is a tool breaking, not one being moved. */
const BREAK_USES = 3;

function usesLeft(item: Item): number | null {
  const max = item.maxDurability;
  if (!max) return null;
  return max - (item.durabilityUsed ?? 0);
}

/** Every tool held, by kind: the uses left on each one (fewest first), and how many a new one has. */
export function toolWear(bot: Bot): Record<string, { left: number[]; max: number }> {
  const wear: Record<string, { left: number[]; max: number }> = {};
  for (const item of bot.inventory.items()) {
    const left = usesLeft(item);
    if (left === null) continue;
    (wear[item.name] ??= { left: [], max: item.maxDurability }).left.push(left);
  }
  for (const kind of Object.values(wear)) kind.left.sort((a, b) => a - b);
  return wear;
}

/**
 * Every tool held with the uses it has left, as the agent sees it before choosing a skill: "84 of 250 uses
 * left". Only the worn ones were shown before, in their last quarter: in tluna6 rep 2 la dug with its only
 * iron pickaxe for 40 decisions, the one the goal needed, and heard of it only when it broke.
 */
export function toolUses(bot: Bot): Record<string, string> {
  const shown: Record<string, string> = {};
  for (const [name, { left, max }] of Object.entries(toolWear(bot))) {
    const uses = left.length === 1 ? `${left[0]}` : `${left.slice(0, -1).join(", ")} and ${left[left.length - 1]}`;
    shown[name] = `${uses} of ${max} uses left`;
  }
  return shown;
}

/**
 * What a skill cost the tools, from their wear before and after it: "descend spent 36 uses of your
 * iron_pickaxe: 84 of 250 left". A tool no longer held is left out (a break says so by itself).
 */
export function wearSpent(skill: string, before: ReturnType<typeof toolWear>, after: ReturnType<typeof toolWear>): string[] {
  const lines: string[] = [];
  for (const [name, now] of Object.entries(after)) {
    const was = before[name];
    if (!was || was.left.length !== now.left.length) continue;
    const spent = was.left.reduce((a, b) => a + b, 0) - now.left.reduce((a, b) => a + b, 0);
    if (spent <= 0) continue;
    lines.push(`${skill} spent ${spent} use${spent === 1 ? "" : "s"} of your ${name}: ${now.left.join(" and ")} of ${now.max} left`);
  }
  return lines;
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
