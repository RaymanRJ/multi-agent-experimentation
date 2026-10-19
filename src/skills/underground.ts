import pathfinderPkg from "mineflayer-pathfinder";
import { Vec3 } from "vec3";
import type { Bot } from "mineflayer";
import type { Skill, SkillContext, SkillResult } from "../types.js";
import { countInventory } from "../observe.js";
import { asNumber, groundAbove, isExposed, liquidBeside, threatened, withTimeout } from "./util.js";

const { goals } = pathfinderPkg;

/** Deepest feet height we dig to: bedrock starts at -64 and is uneven up to -60. */
export const LOWEST_Y = -58;
const DIG_TIMEOUT_MS = 15_000;
const STEP_TIMEOUT_MS = 10_000;
/** A fall this short costs no health, so it is a step, not a hazard (agents spawn on tree canopies). */
const MAX_SAFE_DROP = 3;
const MAX_SKILL_MS = 6 * 60_000;
/**
 * Pickaxes for bulk digging, cheapest first. A staircase to diamond depth breaks ~400 blocks: more
 * than an iron pickaxe lasts (250), and diamonds need one. So iron and better are only dug with
 * when nothing cheaper is left, and never below KEEP_USES (seen in the skill smoke test).
 */
const DIGGERS = ["stone_pickaxe", "wooden_pickaxe", "golden_pickaxe", "iron_pickaxe", "diamond_pickaxe", "netherite_pickaxe"];
const PRECIOUS = new Set(["iron_pickaxe", "diamond_pickaxe", "netherite_pickaxe"]);
const KEEP_USES = 16;
/** A block slower than this to dig with the held pickaxe gets the best tool instead. */
const SLOW_DIG_MS = 3000;
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

function usesLeft(item: { maxDurability?: number; durabilityUsed?: number }): number {
  return item.maxDurability ? item.maxDurability - (item.durabilityUsed ?? 0) : Infinity;
}

/**
 * Holds the cheapest pickaxe fit for digging. Returns null when it has one in hand, or why not:
 * no pickaxe at all, or only an iron (or better) one that is being saved for ore.
 */
async function equipDigger(bot: Bot): Promise<string | null> {
  const candidates = bot.inventory
    .items()
    .filter((item) => DIGGERS.includes(item.name))
    // Cheapest kind first; within a kind, finish the most worn one.
    .sort((a, b) => DIGGERS.indexOf(a.name) - DIGGERS.indexOf(b.name) || usesLeft(a) - usesLeft(b));
  const usable = candidates.find((item) => !(PRECIOUS.has(item.name) && usesLeft(item) <= KEEP_USES));
  if (usable) {
    if (bot.heldItem?.slot !== usable.slot) await bot.equip(usable, "hand");
    return null;
  }
  const saved = candidates[0];
  return saved
    ? `stopped to save your ${saved.name} (${usesLeft(saved)} uses left) for mining ore — craft a stone_pickaxe to dig with`
    : "need a pickaxe to dig — craft one first";
}

/** "your stone_pickaxe broke" for each pickaxe held at the start and gone now. */
function brokenSince(bot: Bot, before: Record<string, number>): string {
  const now = countInventory(bot);
  const broke = DIGGERS.filter((name) => (now[name] ?? 0) < (before[name] ?? 0));
  return broke.length ? ` Your ${broke.join(" and ")} wore out and broke.` : "";
}

/** Digs the cells top-down. Gravel and sand fall into a cleared space, so it goes round a few times. */
async function clear(bot: Bot, cells: Vec3[]): Promise<void> {
  for (let round = 0; round < 4; round++) {
    const solid = cells.map((cell) => bot.blockAt(cell)).filter((block) => block && block.boundingBox !== "empty");
    if (solid.length === 0) return;
    for (const block of solid) {
      // Ore a cheap pickaxe can't harvest (redstone, diamond) takes it ages; use the right tool for that block.
      if (bot.digTime(block!) > SLOW_DIG_MS) {
        const better = bot.pathfinder.bestHarvestTool(block!);
        if (better) await bot.equip(better, "hand");
      }
      await withTimeout(bot.dig(block!), DIG_TIMEOUT_MS, `digging ${block!.name}`);
    }
    await bot.waitForTicks(6);
  }
  throw new Error("blocks kept falling into the gap");
}

/**
 * One step from the bot's feet along `heading`, `dy` up or down (-1 for a stair down, 0 for a
 * tunnel, 1 for a stair up). Checks everything first, digs, then walks in. Returns null on success
 * or why it refused.
 */
async function step(bot: Bot, heading: { dx: number; dz: number }, dy: number): Promise<string | null> {
  const feet = bot.entity.position.floored();
  const next = feet.offset(heading.dx, dy, heading.dz);
  // A stair down needs headroom over the step as well as space for feet and head; a stair up needs
  // room over the bot's own head to jump.
  const cells =
    dy < 0 ? [next.offset(0, 2, 0), next.offset(0, 1, 0), next]
    : dy > 0 ? [feet.offset(0, 2, 0), next.offset(0, 1, 0), next]
    : [next.offset(0, 1, 0), next];
  for (const cell of cells) {
    const problem = unsafe(bot, cell);
    if (problem) return problem;
  }
  let landing = next;
  // Only a step across or down may land lower; a stair up stands on the block it climbs onto.
  for (let drop = 0; dy <= 0 && drop < MAX_SAFE_DROP && badFloor(bot, landing) === "a drop into a cave"; drop++) {
    const below = landing.offset(0, -1, 0);
    if (bot.blockAt(below)?.boundingBox !== "empty" || unsafe(bot, below)) break;
    landing = below;
  }
  const floor = badFloor(bot, landing);
  if (floor) return floor;
  await clear(bot, cells);
  await bot.waitForTicks(2);
  try {
    await withTimeout(bot.pathfinder.goto(new goals.GoalBlock(landing.x, landing.y, landing.z)), STEP_TIMEOUT_MS, "stepping");
  } catch (error) {
    bot.pathfinder.setGoal(null);
    return `could not step in: ${(error as Error).message}`;
  }
  return null;
}

const GROUND = ["grass_block", "dirt", "coarse_dirt", "podzol", "rooted_dirt", "moss_block", "stone", "sand", "gravel", "deepslate", "andesite", "diorite", "granite", "mud"];

/**
 * Agents often spawn on top of a tree canopy, with air below the leaves. Digging a staircase from
 * there means stepping into that air, so first walk to the nearest real ground within 16 blocks.
 * Returns why it could not, or null when on the ground (already, or now).
 */
async function toGround(bot: Bot): Promise<string | null> {
  const under = bot.blockAt(bot.entity.position.floored().offset(0, -1, 0));
  if (!under || !(under.name.endsWith("_leaves") || under.name.endsWith("_log"))) return null;
  const ids = GROUND.map((name) => bot.registry.blocksByName[name]?.id).filter((id): id is number => id !== undefined);
  const here = bot.entity.position;
  const spots = bot
    .findBlocks({ matching: ids, maxDistance: 16, count: 256 })
    .filter((p) => bot.blockAt(p.offset(0, 1, 0))?.boundingBox === "empty" && bot.blockAt(p.offset(0, 2, 0))?.boundingBox === "empty")
    .sort((a, b) => a.distanceTo(here) - b.distanceTo(here));
  for (const spot of spots.slice(0, 5)) {
    try {
      await withTimeout(bot.pathfinder.goto(new goals.GoalBlock(spot.x, spot.y + 1, spot.z)), 20_000, "climbing down to the ground");
      return null;
    } catch {
      bot.pathfinder.setGoal(null);
    }
  }
  return "standing on a tree and could not climb down to the ground";
}

/** True when the bot is in water or floating on it: its feet or head in water, or no solid block underfoot. */
function inWater(bot: Bot): boolean {
  const feet = bot.entity.position.floored();
  if ([feet, feet.offset(0, 1, 0)].some((cell) => bot.blockAt(cell)?.name === "water")) return true;
  return bot.blockAt(feet.offset(0, -1, 0))?.name === "water";
}

/**
 * A staircase can't start from water: every first step would dig beside it. So first walk to the
 * nearest dry place to stand within 8 blocks, highest first, since the way out is up.
 * Returns why it could not, or null when on dry ground (already, or now).
 */
async function outOfWater(bot: Bot): Promise<string | null> {
  if (!inWater(bot)) return null;
  const ids = Object.values(bot.registry.blocksByName).filter((b) => b.boundingBox === "block").map((b) => b.id);
  const here = bot.entity.position;
  const dry = (cell: Vec3) => {
    const block = bot.blockAt(cell);
    return !!block && block.boundingBox === "empty" && block.name !== "water" && block.name !== "lava";
  };
  const spots = bot
    .findBlocks({ matching: ids, maxDistance: 8, count: 512 })
    .filter((p) => dry(p.offset(0, 1, 0)) && dry(p.offset(0, 2, 0)) && !liquidBeside(bot, p.offset(0, 1, 0)))
    .sort((a, b) => b.y - a.y || a.distanceTo(here) - b.distanceTo(here));
  for (const spot of spots.slice(0, 5)) {
    try {
      await withTimeout(bot.pathfinder.goto(new goals.GoalBlock(spot.x, spot.y + 1, spot.z)), 15_000, "getting out of the water");
      if (!inWater(bot)) return null;
    } catch {
      bot.pathfinder.setGoal(null);
    }
  }
  return "in water, and could not reach dry ground within 8 blocks to dig from";
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
    "back up. Pickaxes wear out (stone lasts about 130 blocks, iron 250, and the surface to diamond depth is about 400), " +
    "so it digs with your cheapest pickaxe and will not wear an iron one below 16 uses — carry spare stone pickaxes. " +
    "Returns the height reached and the ore now in sight. Takes a few minutes for a long way down; call it again to continue.",
  args: { y: "number" },

  async run(ctx: SkillContext, rawArgs): Promise<SkillResult> {
    const bot = ctx.bot;
    const startY = Math.floor(bot.entity.position.y);
    const target = Math.max(LOWEST_Y, Math.min(startY - 1, Math.floor(asNumber(rawArgs["y"], startY - 16))));
    const tools = countInventory(bot);
    const noDigger = await equipDigger(bot);
    if (noDigger) return { status: "failed", reason: noDigger };
    const grounded = await toGround(bot);
    if (grounded) return { status: "failed", reason: grounded };

    const report = (extra: Record<string, unknown> = {}) => ({ y: Math.floor(bot.entity.position.y), oreInSight: oreInSight(bot), ...extra });
    const startedAt = Date.now();
    let heading = lastHeading.get(bot.username) ?? Math.floor(Math.random() * 4);
    while (Math.floor(bot.entity.position.y) > target) {
      if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending", detail: report() };
      const danger = threatened(ctx);
      if (danger) return { status: "aborted", reason: `stopped digging because ${danger}`, detail: report() };
      if (Date.now() - startedAt > MAX_SKILL_MS) {
        return { status: "failed", reason: `reached y=${Math.floor(bot.entity.position.y)} of ${target} before running out of time — call descend again to continue.${brokenSince(bot, tools)}`, detail: report() };
      }
      const noTool = await equipDigger(bot);
      if (noTool) return { status: "failed", reason: `reached y=${Math.floor(bot.entity.position.y)} of ${target} and ${noTool}.${brokenSince(bot, tools)}`, detail: report() };
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
          reason: `stopped at y=${Math.floor(bot.entity.position.y)}: every way down is unsafe (${refusals.join("; ")}) — explore or tunnel somewhere else and try again.${brokenSince(bot, tools)}`,
          detail: report(),
        };
      }
    }
    lastHeading.set(bot.username, heading);
    const broke = brokenSince(bot, tools);
    return { status: "success", ...(broke && { reason: broke.trim() }), detail: report() };
  },
};

export const tunnel: Skill = {
  name: "tunnel",
  description:
    "Dig a straight tunnel, 2 blocks high, `length` blocks long (up to 32), at your current height: the way to uncover " +
    "ore hidden inside rock, since mine_ore only finds ore you can see. Takes an optional `direction` (north, east, " +
    "south or west); by default it keeps going the way you last dug. Digs with your cheapest pickaxe, sparing an iron one " +
    "as descend does. Stops before lava, water or a drop. Returns how far it got and the ore now in sight, for mine_ore.",
  args: { length: "number", direction: "string?" },

  async run(ctx: SkillContext, rawArgs): Promise<SkillResult> {
    const bot = ctx.bot;
    const length = Math.max(1, Math.min(32, Math.floor(asNumber(rawArgs["length"], 16))));
    const tools = countInventory(bot);
    const noDigger = await equipDigger(bot);
    if (noDigger) return { status: "failed", reason: noDigger };
    const grounded = await toGround(bot);
    if (grounded) return { status: "failed", reason: grounded };
    const index = headingIndex(rawArgs["direction"]) ?? lastHeading.get(bot.username) ?? Math.floor(Math.random() * 4);
    const heading = HEADINGS[index]!;
    lastHeading.set(bot.username, index);

    let dug = 0;
    const report = () => ({ dug, direction: heading.name, y: Math.floor(bot.entity.position.y), oreInSight: oreInSight(bot) });
    for (; dug < length; dug++) {
      if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending", detail: report() };
      const danger = threatened(ctx);
      if (danger) return { status: "aborted", reason: `stopped digging because ${danger}`, detail: report() };
      const noTool = await equipDigger(bot);
      if (noTool) return { status: dug ? "success" : "failed", reason: `dug ${dug} blocks, then ${noTool}.${brokenSince(bot, tools)}`, detail: report() };
      const problem = await step(bot, heading, 0).catch((error: Error) => error.message);
      if (problem) {
        // Next call should try another way rather than hit the same wall.
        lastHeading.set(bot.username, (index + 1) % 4);
        if (dug === 0) return { status: "failed", reason: `cannot tunnel ${heading.name}: ${problem} — try another direction`, detail: report() };
        return { status: "success", reason: `stopped after ${dug} blocks: ${problem} ahead.${brokenSince(bot, tools)}`, detail: report() };
      }
    }
    const broke = brokenSince(bot, tools);
    return { status: "success", ...(broke && { reason: broke.trim() }), detail: report() };
  },
};

/** Blocks a climb may stand on, in the order it spends them: cheap ones first, logs last (they make tools). */
const PILLAR_BLOCKS = [
  "cobblestone", "dirt", "cobbled_deepslate", "stone", "andesite", "diorite", "granite", "netherrack", "gravel", "sand",
  "oak_planks", "spruce_planks", "birch_planks", "jungle_planks", "acacia_planks", "dark_oak_planks", "mangrove_planks", "cherry_planks",
  "oak_log", "spruce_log", "birch_log", "jungle_log", "acacia_log", "dark_oak_log", "mangrove_log", "cherry_log",
];

/**
 * Up one block where there is nothing to cut a stair into (an open cave): clear the block over the
 * head, then jump and place a block underfoot at the top of the jump, as a player builds a pillar.
 * Returns null on success or why it could not.
 */
async function pillar(bot: Bot): Promise<string | null> {
  const feet = bot.entity.position.floored();
  const problem = unsafe(bot, feet.offset(0, 2, 0));
  if (problem) return `above: ${problem}`;
  const floor = bot.blockAt(feet.offset(0, -1, 0));
  if (!floor || floor.boundingBox !== "block") return "not standing on solid ground";
  const held = countInventory(bot);
  const name = PILLAR_BLOCKS.find((block) => (held[block] ?? 0) > 0);
  const item = name && bot.inventory.items().find((i) => i.name === name);
  if (!item) return "nothing to stand on: building up needs a block such as dirt, cobblestone, planks or logs";
  await clear(bot, [feet.offset(0, 2, 0)]);
  await bot.equip(item, "hand");
  bot.pathfinder.setGoal(null);
  await bot.lookAt(feet.offset(0.5, 0, 0.5), true);
  bot.setControlState("jump", true);
  try {
    for (let tick = 0; tick < 20 && bot.entity.position.y < feet.y + 1; tick++) await bot.waitForTicks(1);
    if (bot.entity.position.y < feet.y + 1) return "could not jump high enough to build up";
    await withTimeout(bot.placeBlock(floor, new Vec3(0, 1, 0)), 3000, "placing a block underfoot");
  } catch (error) {
    return `could not build up: ${(error as Error).message}`;
  } finally {
    bot.setControlState("jump", false);
  }
  for (let tick = 0; tick < 20 && !bot.entity.onGround; tick++) await bot.waitForTicks(1);
  return bot.entity.position.floored().y > feet.y ? null : "the block underfoot did not hold";
}

export const climbOut: Skill = {
  name: "climb_out",
  description:
    "Dig a staircase up until there is open sky above you: the way back to the surface from a cave or a mine. Uses your " +
    "cheapest pickaxe, sparing an iron one as descend does, or your hands when you have none (much slower through stone). " +
    "Checks every block before breaking it and turns away from lava and water; if you are in water it first moves to dry " +
    "ground nearby. Where there is no rock to cut steps into, as in an open cave, it builds up instead, standing on blocks " +
    "from your inventory (dirt or cobblestone first, logs last). Stops if every way up is unsafe. Returns the height reached. Takes a few minutes from deep down; call " +
    "it again to continue.",
  args: {},

  async run(ctx: SkillContext): Promise<SkillResult> {
    const bot = ctx.bot;
    const startY = Math.floor(bot.entity.position.y);
    const report = () => ({ y: Math.floor(bot.entity.position.y), climbed: Math.floor(bot.entity.position.y) - startY, groundAbove: groundAbove(bot) });
    if (groundAbove(bot) === 0) return { status: "success", reason: "already under open sky", detail: report() };
    const tools = countInventory(bot);
    // No pickaxe, or only one being saved for ore: dig by hand. Getting out matters more.
    await equipDigger(bot);
    const wet = await outOfWater(bot);
    if (wet) return { status: "failed", reason: wet, detail: report() };

    const startedAt = Date.now();
    let heading = lastHeading.get(bot.username) ?? Math.floor(Math.random() * 4);
    while (groundAbove(bot) > 0) {
      if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending", detail: report() };
      const danger = threatened(ctx);
      if (danger) return { status: "aborted", reason: `stopped climbing because ${danger}`, detail: report() };
      if (Date.now() - startedAt > MAX_SKILL_MS) {
        return { status: "failed", reason: `climbed to y=${Math.floor(bot.entity.position.y)}, still under ${groundAbove(bot)} blocks of ground, before running out of time — call climb_out again to continue.${brokenSince(bot, tools)}`, detail: report() };
      }
      await equipDigger(bot);
      let moved = false;
      const refusals: string[] = [];
      for (let turn = 0; turn < 4 && !moved; turn++) {
        const index = (heading + turn) % 4;
        const problem = await step(bot, HEADINGS[index]!, 1).catch((error: Error) => error.message);
        if (problem === null) {
          heading = index;
          moved = true;
        } else {
          refusals.push(`${HEADINGS[index]!.name}: ${problem}`);
        }
      }
      if (!moved) {
        // No rock to cut a step into: build up instead.
        const built = await pillar(bot).catch((error: Error) => error.message);
        if (built === null) continue;
        refusals.push(`straight up: ${built}`);
        lastHeading.set(bot.username, (heading + 1) % 4);
        return {
          status: "failed",
          reason: `stopped at y=${Math.floor(bot.entity.position.y)}, under ${groundAbove(bot)} blocks of ground: every way up is unsafe (${refusals.join("; ")}) — tunnel or walk somewhere else and try again.${brokenSince(bot, tools)}`,
          detail: report(),
        };
      }
    }
    lastHeading.set(bot.username, heading);
    const broke = brokenSince(bot, tools);
    return { status: "success", ...(broke && { reason: broke.trim() }), detail: report() };
  },
};
