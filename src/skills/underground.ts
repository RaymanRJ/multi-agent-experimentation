import pathfinderPkg from "mineflayer-pathfinder";
import { Vec3 } from "vec3";
import type { Bot } from "mineflayer";
import type { Skill, SkillContext, SkillResult } from "../types.js";
import { countInventory } from "../observe.js";
import { asNumber, isExposed, liquidBeside, threatened, withTimeout } from "./util.js";

const { goals } = pathfinderPkg;

/** Deepest feet height we dig to: bedrock starts at -64 and is uneven up to -60. */
export const LOWEST_Y = -58;
const DIG_TIMEOUT_MS = 15_000;
const STEP_TIMEOUT_MS = 10_000;
const MAX_SKILL_MS = 6 * 60_000;
const PICKAXES = ["netherite_pickaxe", "diamond_pickaxe", "iron_pickaxe", "stone_pickaxe", "golden_pickaxe", "wooden_pickaxe"];
const HEADINGS: Array<{ name: string; dx: number; dz: number }> = [
  { name: "north", dx: 0, dz: -1 },
  { name: "east", dx: 1, dz: 0 },
  { name: "south", dx: 0, dz: 1 },
  { name: "west", dx: -1, dz: 0 },
];

/** The heading each bot last dug in, so repeated calls keep one straight line. Keyed by username. */
const lastHeading = new Map<string, number>();

/** Why a cell can't be cleared safely, or null if it can (or is already open). */
function unsafe(bot: Bot, cell: Vec3): string | null {
  const block = bot.blockAt(cell);
  if (!block) return "unloaded ground";
  if (block.name === "lava" || block.name === "water") return block.name;
  if (block.boundingBox === "empty") return null;
  if (block.name === "bedrock" || !bot.canDigBlock(block)) return `unbreakable ${block.name}`;
  const liquid = liquidBeside(bot, cell);
  return liquid ? `${liquid} behind the ${block.name}` : null;
}

/** Why the bot can't stand at `feet`'s floor, or null if the floor is solid. */
function badFloor(bot: Bot, feet: Vec3): string | null {
  const floor = bot.blockAt(feet.offset(0, -1, 0));
  if (!floor) return "unloaded ground";
  if (floor.name === "lava" || floor.name === "water") return `${floor.name} below`;
  if (floor.boundingBox !== "block") return "a drop into a cave";
  return null;
}

async function equipPickaxe(bot: Bot): Promise<string | null> {
  const inventory = countInventory(bot);
  const best = PICKAXES.find((name) => (inventory[name] ?? 0) > 0);
  if (!best) return null;
  const item = bot.inventory.items().find((i) => i.name === best);
  if (item) await bot.equip(item, "hand");
  return best;
}

/** Digs the cells top-down. Gravel and sand fall into a cleared space, so it goes round a few times. */
async function clear(bot: Bot, cells: Vec3[]): Promise<void> {
  for (let round = 0; round < 4; round++) {
    const solid = cells.map((cell) => bot.blockAt(cell)).filter((block) => block && block.boundingBox !== "empty");
    if (solid.length === 0) return;
    for (const block of solid) await withTimeout(bot.dig(block!), DIG_TIMEOUT_MS, `digging ${block!.name}`);
    await bot.waitForTicks(6);
  }
  throw new Error("blocks kept falling into the gap");
}

/**
 * One step from the bot's feet along `heading`, `dy` up or down (-1 for a stair, 0 for a tunnel).
 * Checks everything first, digs, then walks in. Returns null on success or why it refused.
 */
async function step(bot: Bot, heading: { dx: number; dz: number }, dy: number): Promise<string | null> {
  const feet = bot.entity.position.floored();
  const next = feet.offset(heading.dx, dy, heading.dz);
  // A stair needs headroom over the step down as well as space for feet and head.
  const cells = dy < 0 ? [next.offset(0, 2, 0), next.offset(0, 1, 0), next] : [next.offset(0, 1, 0), next];
  for (const cell of cells) {
    const problem = unsafe(bot, cell);
    if (problem) return problem;
  }
  const floor = badFloor(bot, next);
  if (floor) return floor;
  await clear(bot, cells);
  await bot.waitForTicks(2);
  try {
    await withTimeout(bot.pathfinder.goto(new goals.GoalBlock(next.x, next.y, next.z)), STEP_TIMEOUT_MS, "stepping");
  } catch (error) {
    bot.pathfinder.setGoal(null);
    return `could not step in: ${(error as Error).message}`;
  }
  return null;
}

/** Exposed ore within 16 blocks, by name: what the model can now go and mine. */
export function oreInSight(bot: Bot, radius = 16): Record<string, number> {
  const ids = Object.values(bot.registry.blocksByName).filter((b) => b.name.endsWith("_ore")).map((b) => b.id);
  const seen: Record<string, number> = {};
  for (const point of bot.findBlocks({ matching: ids, maxDistance: radius, count: 128 })) {
    const block = bot.blockAt(point);
    if (block && isExposed(bot, point)) seen[block.name] = (seen[block.name] ?? 0) + 1;
  }
  return seen;
}

function headingIndex(name: unknown): number | null {
  const index = HEADINGS.findIndex((h) => h.name === String(name ?? "").trim().toLowerCase());
  return index >= 0 ? index : null;
}

export const descend: Skill = {
  name: "descend",
  description:
    "Dig a staircase down until your feet are at height `y` (sea level is 63, diamonds are most common near -58, " +
    `iron around 16; the lowest allowed is ${LOWEST_Y}). Needs any pickaxe. Checks every block before breaking it and ` +
    "turns away from lava, water and drops into caves; stops if every way down is unsafe. A staircase can be walked " +
    "back up. Returns the height reached and the ore now in sight. Takes a few minutes for a long way down; call it " +
    "again to continue.",
  args: { y: "number" },

  async run(ctx: SkillContext, rawArgs): Promise<SkillResult> {
    const bot = ctx.bot;
    const startY = Math.floor(bot.entity.position.y);
    const target = Math.max(LOWEST_Y, Math.min(startY - 1, Math.floor(asNumber(rawArgs["y"], startY - 16))));
    if (!(await equipPickaxe(bot))) return { status: "failed", reason: "need a pickaxe to dig down — craft one first" };

    const report = (extra: Record<string, unknown> = {}) => ({ y: Math.floor(bot.entity.position.y), oreInSight: oreInSight(bot), ...extra });
    const startedAt = Date.now();
    let heading = lastHeading.get(bot.username) ?? Math.floor(Math.random() * 4);
    while (Math.floor(bot.entity.position.y) > target) {
      if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending", detail: report() };
      const danger = threatened(ctx);
      if (danger) return { status: "aborted", reason: `stopped digging because ${danger}`, detail: report() };
      if (Date.now() - startedAt > MAX_SKILL_MS) {
        return { status: "failed", reason: `reached y=${Math.floor(bot.entity.position.y)} of ${target} before running out of time — call descend again to continue`, detail: report() };
      }
      let moved = false;
      const refusals: string[] = [];
      for (let turn = 0; turn < 4 && !moved; turn++) {
        const index = (heading + turn) % 4;
        const problem = await step(bot, HEADINGS[index]!, -1).catch((error: Error) => error.message);
        if (problem === null) {
          heading = index;
          moved = true;
        } else {
          refusals.push(`${HEADINGS[index]!.name}: ${problem}`);
        }
      }
      if (!moved) {
        lastHeading.set(bot.username, (heading + 1) % 4);
        return {
          status: "failed",
          reason: `stopped at y=${Math.floor(bot.entity.position.y)}: every way down is unsafe (${refusals.join("; ")})`,
          detail: report(),
        };
      }
    }
    lastHeading.set(bot.username, heading);
    return { status: "success", detail: report() };
  },
};

export const tunnel: Skill = {
  name: "tunnel",
  description:
    "Dig a straight tunnel, 2 blocks high, `length` blocks long (up to 32), at your current height: the way to uncover " +
    "ore hidden inside rock, since mine_ore only finds ore you can see. Takes an optional `direction` (north, east, " +
    "south or west); by default it keeps going the way you last dug. Needs any pickaxe. Stops before lava, water or a " +
    "drop. Returns how far it got and the ore now in sight, for mine_ore.",
  args: { length: "number", direction: "string" },

  async run(ctx: SkillContext, rawArgs): Promise<SkillResult> {
    const bot = ctx.bot;
    const length = Math.max(1, Math.min(32, Math.floor(asNumber(rawArgs["length"], 16))));
    if (!(await equipPickaxe(bot))) return { status: "failed", reason: "need a pickaxe to dig a tunnel — craft one first" };
    const index = headingIndex(rawArgs["direction"]) ?? lastHeading.get(bot.username) ?? Math.floor(Math.random() * 4);
    const heading = HEADINGS[index]!;
    lastHeading.set(bot.username, index);

    let dug = 0;
    const report = () => ({ dug, direction: heading.name, y: Math.floor(bot.entity.position.y), oreInSight: oreInSight(bot) });
    for (; dug < length; dug++) {
      if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending", detail: report() };
      const danger = threatened(ctx);
      if (danger) return { status: "aborted", reason: `stopped digging because ${danger}`, detail: report() };
      const problem = await step(bot, heading, 0).catch((error: Error) => error.message);
      if (problem) {
        // Next call should try another way rather than hit the same wall.
        lastHeading.set(bot.username, (index + 1) % 4);
        if (dug === 0) return { status: "failed", reason: `cannot tunnel ${heading.name}: ${problem} — try another direction`, detail: report() };
        return { status: "success", reason: `stopped after ${dug} blocks: ${problem} ahead`, detail: report() };
      }
    }
    return { status: "success", detail: report() };
  },
};
