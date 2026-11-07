import pathfinderPkg from "mineflayer-pathfinder";
import type { Block } from "prismarine-block";
import type { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import type { Skill, SkillContext, SkillResult } from "../types.js";
import { countInventory } from "../observe.js";
import { asNumber, getOutOfWater, headInWater, homeBlock, isExposed, liquidBeside, nearestUncrowded, oreHazard, threatened, withTimeout } from "./util.js";
import { fillWater, plugBlock, standable } from "./underground.js";

const { goals } = pathfinderPkg;

const SEARCH_RADII = [16, 32, 48];
const TRAVEL_TIMEOUT_MS = 30_000;
const DIG_TIMEOUT_MS = 20_000;
/** In water and off the ground the game digs up to 25 times slower: a stone pickaxe took 30 s on iron ore. */
const WET_DIG_TIMEOUT_MS = 45_000;
const MAX_FAILED_BLOCKS = 5;
const MAX_TOTAL_MS = 4 * 60_000;
/** Ore further above or below than this is left alone: the pathfinder gives up on long climbs. */
const MAX_HEIGHT_GAP = 8;
const REACH = 4.5;
/** Blocks dug through to ore that is in reach but behind them, before giving up on it. */
const MAX_DIG_THROUGH = 3;
/** Never dug through: someone's furniture. */
const FURNITURE = /_bed$|^(trapped_)?chest$|^furnace$|^crafting_table$/;

/**
 * Ore within reach but out of sight: the pathfinder stops within 2 blocks, which can leave rock between the
 * bot and the ore when the ore's open face is on the far side (a cave behind it). Before this, mine_ore gave up on
 * it as "out of reach": 74 times in tbase1, and in 34 of 53 earlier runs that mined. Dig what is in the way, as a
 * player mines through to ore it can see from the cave. Returns true once the ore is in sight and reach.
 */
/** The first solid block on the straight line from `from` to `to`, other than the one at `skip`. */
export function firstSolidBetween(bot: Bot, from: Vec3, to: Vec3, skip: Vec3): Block | null {
  const length = from.distanceTo(to);
  for (let t = 0; t < length; t += 0.1) {
    const cell = from.plus(to.minus(from).scaled(t / length)).floored();
    if (cell.equals(skip)) return null;
    const block = bot.blockAt(cell);
    if (block && block.boundingBox === "block") return block;
  }
  return null;
}

async function digThrough(bot: Bot, ore: Block): Promise<boolean> {
  const centre = ore.position.offset(0.5, 0.5, 0.5);
  for (let dug = 0; ; dug++) {
    const eye = bot.entity.position.offset(0, bot.entity.height, 0);
    if (eye.distanceTo(centre) > REACH) return false;
    if (bot.canSeeBlock(ore)) return true;
    if (dug >= MAX_DIG_THROUGH) return false;
    const between = firstSolidBetween(bot, eye, centre, ore.position);
    if (!between) return false;
    if (FURNITURE.test(between.name) || !bot.canDigBlock(between) || liquidBeside(bot, between.position) || homeBlock(bot, between.position)) return false;
    const tool = bot.pathfinder.bestHarvestTool(between);
    if (tool) await bot.equip(tool, "hand");
    await withTimeout(bot.dig(between), DIG_TIMEOUT_MS, "digging toward the ore");
  }
}

/** Standing in water, or floating in it. */
function inWaterNow(bot: Bot): boolean {
  const feet = bot.entity.position.floored();
  return headInWater(bot) || bot.blockAt(feet)?.name === "water" || !bot.entity.onGround;
}

/**
 * Ore by water is mined from dry footing where there is any: in water and off the ground digging is up to 25 times
 * slower, and a dig by a pool timed out at 20 s in the check that added this. Steps to the nearest dry spot within
 * reach of the ore; stays put if there is none.
 */
const WET = /^(water|lava|bubble_column)$/;

/**
 * A place to stand within reach of the ore, dry: open ground, or rock beside it that can be dug out into a
 * pocket (as a player tunnels in beside ore at a lake's edge) with nothing wet at its feet, its head or above.
 * Ore with water above it or all round is tried only from such a place: walking to it otherwise swims, and a
 * live try left the agent under water at 3 air.
 */
export function standsFor(bot: Bot, cell: Vec3): "open" | "pocket" | null {
  if (standable(bot, cell)) return "open";
  const floor = bot.blockAt(cell.offset(0, -1, 0));
  if (!floor || floor.boundingBox !== "block" || WET.test(floor.name)) return null;
  for (const dy of [0, 1, 2]) {
    const block = bot.blockAt(cell.offset(0, dy, 0));
    if (!block || WET.test(block.name)) return null;
    if (dy < 2 && block.boundingBox === "block" && (!bot.canDigBlock(block) || FURNITURE.test(block.name) || homeBlock(bot, block.position))) return null;
  }
  return "pocket";
}

/** Dry places to stand (or dig out) within reach of the ore, open ones first, then nearest to the agent. */
function dryStands(bot: Bot, ore: Vec3, pockets = false): Vec3[] {
  const spots: Array<{ cell: Vec3; open: boolean }> = [];
  for (let dx = -3; dx <= 3; dx++)
    for (let dz = -3; dz <= 3; dz++)
      for (let dy = -2; dy <= 2; dy++) {
        const cell = ore.offset(dx, dy, dz);
        if (cell.equals(ore) || cell.offset(0.5, 1.6, 0.5).distanceTo(ore.offset(0.5, 0.5, 0.5)) > REACH - 0.5) continue;
        const kind = pockets ? standsFor(bot, cell) : standable(bot, cell) ? "open" : null;
        if (kind) spots.push({ cell, open: kind === "open" });
      }
  const here = bot.entity.position;
  return spots
    .sort((a, b) => Number(b.open) - Number(a.open) || a.cell.distanceTo(here) - b.cell.distanceTo(here))
    .map((s) => s.cell);
}

async function dryFooting(bot: Bot, ore: Vec3): Promise<void> {
  if (!inWaterNow(bot)) return;
  for (const spot of dryStands(bot, ore).slice(0, 3)) {
    try {
      await withTimeout(bot.pathfinder.goto(new goals.GoalBlock(spot.x, spot.y, spot.z)), 8000, "stepping out of the water to dig");
      if (!inWaterNow(bot)) return;
    } catch {
      bot.pathfinder.setGoal(null);
    }
  }
}

const FACES: Array<[number, number, number]> = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

/** Cells of water touching the ore. */
function waterAround(bot: Bot, ore: Vec3): Vec3[] {
  return FACES.map(([dx, dy, dz]) => ore.offset(dx, dy, dz)).filter((cell) => bot.blockAt(cell)?.name === "water");
}

/**
 * Fills the water touching the ore with blocks carried, as a player plugs it before mining, so digging
 * the ore floods nothing and nobody digs in water. Ore with water above it or all round was refused, and
 * in tluna13 that was all the iron near the home: 23 refusals, by agents carrying 36-319 cobblestone.
 * Throws why not (no block left, nothing to put it against, out of reach).
 */
async function plugAround(bot: Bot, ore: Vec3): Promise<number> {
  const feet = bot.entity.position.floored();
  let filled = 0;
  for (const cell of waterAround(bot, ore)) {
    if (cell.equals(feet) || cell.equals(feet.offset(0, 1, 0))) continue;
    await fillWater(bot, cell);
    filled++;
  }
  return filled;
}

/** Pickaxes, weakest first. */
const TIERS = ["wooden_pickaxe", "stone_pickaxe", "iron_pickaxe", "diamond_pickaxe", "netherite_pickaxe"];

/** What each ore drops, and the weakest pickaxe that gets the drop (anything weaker breaks it for nothing). */
export const ORES: Record<string, { drop: string; pickaxe: string }> = {
  coal: { drop: "coal", pickaxe: "wooden_pickaxe" },
  copper: { drop: "raw_copper", pickaxe: "stone_pickaxe" },
  iron: { drop: "raw_iron", pickaxe: "stone_pickaxe" },
  lapis: { drop: "lapis_lazuli", pickaxe: "stone_pickaxe" },
  gold: { drop: "raw_gold", pickaxe: "iron_pickaxe" },
  redstone: { drop: "redstone", pickaxe: "iron_pickaxe" },
  diamond: { drop: "diamond", pickaxe: "iron_pickaxe" },
  emerald: { drop: "emerald", pickaxe: "iron_pickaxe" },
};

/** "iron", "iron_ore" or "deepslate_iron_ore" -> "iron". */
export function oreKind(name: string): string | null {
  const kind = name.trim().toLowerCase().replace(/^deepslate_/, "").replace(/_ore$/, "");
  return kind in ORES ? kind : null;
}

/** The cheapest pickaxe held that is good enough for this ore, so the better ones last longer. */
function pickaxeFor(inventory: Record<string, number>, needed: string): string | null {
  return TIERS.slice(TIERS.indexOf(needed)).find((tool) => (inventory[tool] ?? 0) > 0) ?? null;
}

export const mineOre: Skill = {
  name: "mine_ore",
  description:
    "Mine ore you can see and collect what it drops. Takes `ore` (coal, iron, copper, gold, diamond, redstone, lapis " +
    "or emerald) and `count` — how many drops you want to gain (iron gives raw_iron, diamond gives diamond). " +
    "Only finds ore you could see: on a cave wall, a cliff or a tunnel you dug, within 48 blocks. Ore deep inside " +
    "rock is invisible, so if none is in sight, explore, descend or dig a tunnel to uncover some. Needs a good enough " +
    "pickaxe: coal needs wooden, iron/copper/lapis need stone, diamond/gold/redstone/emerald need iron. " +
    "Uses the cheapest pickaxe good enough. Water touching the ore (above, beside or all round it) is plugged first with a block you carry " +
    "(cobblestone, dirt or stone), so the ore is mined from dry footing; without such a block, ore with water above it or under water is skipped. " +
    "Ore beside lava is always skipped. Returns how many were gained and the new total.",
  args: { ore: "string", count: "number" },

  async run(ctx: SkillContext, rawArgs): Promise<SkillResult> {
    const bot = ctx.bot;
    const kind = oreKind(String(rawArgs["ore"] ?? ""));
    if (!kind) {
      return { status: "failed", reason: `"${rawArgs["ore"]}" is not an ore — use one of ${Object.keys(ORES).join(", ")}` };
    }
    const { drop, pickaxe: needed } = ORES[kind]!;
    const target = Math.max(1, Math.min(64, asNumber(rawArgs["count"], 3)));

    const pickaxe = pickaxeFor(countInventory(bot), needed);
    if (!pickaxe) return { status: "failed", reason: `${kind} ore needs at least a ${needed} — craft one first` };
    const held = bot.inventory.items().find((item) => item.name === pickaxe);
    if (held) await bot.equip(held, "hand");

    const dropsHeld = () => countInventory(bot)[drop] ?? 0;
    const startedWith = dropsHeld();
    const wanted = startedWith + target;
    const gained = () => dropsHeld() - startedWith;
    const startedAt = Date.now();
    const oreIds = [`${kind}_ore`, `deepslate_${kind}_ore`]
      .map((name) => bot.registry.blocksByName[name]?.id)
      .filter((id): id is number => id !== undefined);
    const skipped = new Set<string>();
    const key = (p: Vec3) => `${p.x},${p.y},${p.z}`;

    while (dropsHeld() < wanted) {
      if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending", detail: { gained: gained() } };
      const danger = threatened(ctx, 8, true);
      if (danger) return { status: "aborted", reason: `stopped mining because ${danger}`, detail: { gained: gained() } };
      if (Date.now() - startedAt > MAX_TOTAL_MS) {
        return { status: "failed", reason: `ran out of time after gaining ${gained()} of ${target} ${drop}`, detail: { gained: gained() } };
      }
      if (skipped.size >= MAX_FAILED_BLOCKS) {
        return { status: "failed", reason: `gave up after ${skipped.size} ${kind} ore blocks could not be reached or broken`, detail: { gained: gained() } };
      }

      let block: Block | null = null;
      let outOfReach: number | null = null;
      // Ore the agent can see but this won't dig toward: say so, or "none in reach" contradicts what it sees.
      const wet = new Set<string>();
      const lava = new Set<string>();
      for (const radius of SEARCH_RADII) {
        const points = nearestUncrowded(bot, bot.findBlocks({ matching: oreIds, maxDistance: radius, count: 64 }));
        for (const point of points) {
          if (skipped.has(key(point))) continue;
          if (!isExposed(bot, point)) continue;
          const hazard = oreHazard(bot, point);
          if (hazard === "lava beside it") {
            lava.add(key(point));
            continue;
          }
          // Ore at a pool's floor is reached only by swimming: a live try left the agent under water at 3 air.
          if (hazard && (!plugBlock(bot) || dryStands(bot, point, true).length === 0)) {
            wet.add(key(point));
            continue;
          }
          const gap = point.y - Math.floor(bot.entity.position.y);
          if (Math.abs(gap) > MAX_HEIGHT_GAP) {
            outOfReach ??= gap;
            continue;
          }
          block = bot.blockAt(point);
          break;
        }
        if (block) break;
      }
      if (!block) {
        const far =
          outOfReach === null
            ? ""
            : ` (there is some ${Math.abs(outOfReach)} blocks ${outOfReach < 0 ? "below" : "above"} you — ${outOfReach < 0 ? "descend" : "climb"} closer first)`;
        const wetNote =
          (lava.size ? `; ${lava.size} ${kind} ore in sight ${lava.size === 1 ? "is" : "are"} beside lava, which this won't mine` : "") +
          (wet.size ? `; ${wet.size} ${kind} ore in sight ${wet.size === 1 ? "is" : "are"} under or below water, which needs cobblestone, dirt or stone to plug the water and dry ground beside it to stand on` : "");
        const reason =
          gained() > 0
            ? `gained ${gained()} ${drop}, then no more ${kind} ore in reach${far}${wetNote}`
            : `no ${kind} ore in reach within ${SEARCH_RADII[SEARCH_RADII.length - 1]} blocks${wetNote}${far || " — explore, descend or dig a tunnel to uncover some"}`;
        return { status: "failed", reason, detail: { gained: gained(), total: dropsHeld() } };
      }

      const { x, y, z } = block.position;
      const wetOre = oreHazard(bot, block.position) !== null;
      try {
        if (wetOre) {
          // To a dry place beside it, dug out of the rock if need be, never by swimming to the ore.
          const stand = dryStands(bot, block.position, true)[0];
          if (!stand) throw new Error("no dry place beside it to stand");
          await withTimeout(bot.pathfinder.goto(new goals.GoalBlock(stand.x, stand.y, stand.z)), TRAVEL_TIMEOUT_MS, "walking to a dry place beside the ore");
          if (inWaterNow(bot)) {
            await getOutOfWater(bot);
            throw new Error("the way there was through water");
          }
        } else {
          await withTimeout(bot.pathfinder.goto(new goals.GoalNear(x, y, z, 2)), TRAVEL_TIMEOUT_MS, "walking to ore");
        }
        const fresh = bot.blockAt(block.position);
        if (!fresh || !oreIds.includes(fresh.type) || !bot.canDigBlock(fresh)) throw new Error("cannot dig it from here");
        // Water touching the ore is plugged from dry footing before anything is dug.
        let plugged = 0;
        if (plugBlock(bot) && waterAround(bot, fresh.position).length > 0) {
          await dryFooting(bot, fresh.position);
          plugged = await plugAround(bot, fresh.position);
          if (plugged) ctx.log(`plugged ${plugged} water beside the ${kind} ore at ${x},${y},${z}`);
        }
        // Out of reach or behind a wall, the server ignores the dig and mineflayer waits forever.
        if (!(await digThrough(bot, fresh))) {
          // Plugged all round the ore shows no face, but from dry footing in reach the server breaks it (live: 2 of 2 in
          // 24 s). Not from water: under a pool the dig never finished in 45 s, so the agent is told to find dry ground.
          const eye = bot.entity.position.offset(0, bot.entity.height, 0);
          if (!plugged || eye.distanceTo(fresh.position.offset(0.5, 0.5, 0.5)) > REACH) throw new Error("out of reach");
          if (inWaterNow(bot)) throw new Error("plugged, but there is no dry footing in reach of it to dig from");
        }
        // digThrough may have changed the tool in hand to dig dirt or stone; ore needs the pickaxe.
        if (liquidBeside(bot, fresh.position)) await dryFooting(bot, fresh.position);
        const pick = bot.inventory.items().find((item) => item.name === pickaxe);
        if (pick) await bot.equip(pick, "hand");
        await withTimeout(bot.dig(fresh), inWaterNow(bot) ? WET_DIG_TIMEOUT_MS : DIG_TIMEOUT_MS, "digging ore");
      } catch (error) {
        ctx.log(`could not mine ${kind} ore at ${x},${y},${z}: ${(error as Error).message}`);
        bot.pathfinder.setGoal(null);
        skipped.add(key(block.position));
        continue;
      }
      // A drop can't be picked up for its first 10 ticks; leaving after exactly 10 left raw iron on the floor.
      const before = dropsHeld();
      for (let tries = 0; tries < 3 && dropsHeld() === before; tries++) {
        const item = Object.values(bot.entities).find((e) => e?.name === "item" && e.position.distanceTo(block!.position.offset(0.5, 0.5, 0.5)) < 4);
        const at = item ? item.position : block.position;
        try {
          await withTimeout(bot.pathfinder.goto(new goals.GoalNear(at.x, at.y, at.z, 1)), TRAVEL_TIMEOUT_MS, "collecting drops");
        } catch {
          // Best-effort; the loop re-checks the real inventory count.
        }
        await bot.waitForTicks(10);
      }
    }

    return { status: "success", detail: { gained: gained(), total: dropsHeld(), pickaxe } };
  },
};
