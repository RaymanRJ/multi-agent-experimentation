import pathfinderPkg from "mineflayer-pathfinder";
import type { Block } from "prismarine-block";
import type { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import type { Skill, SkillContext, SkillResult } from "../types.js";
import { countInventory } from "../observe.js";
import { asNumber, nearestUncrowded, isExposed, liquidBeside, threatened, withTimeout } from "./util.js";

const { goals } = pathfinderPkg;

const SEARCH_RADII = [16, 32, 48];
const TRAVEL_TIMEOUT_MS = 30_000;
const DIG_TIMEOUT_MS = 20_000;
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
    if (FURNITURE.test(between.name) || !bot.canDigBlock(between) || liquidBeside(bot, between.position)) return false;
    const tool = bot.pathfinder.bestHarvestTool(between);
    if (tool) await bot.equip(tool, "hand");
    await withTimeout(bot.dig(between), DIG_TIMEOUT_MS, "digging toward the ore");
  }
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
    "Uses the cheapest pickaxe good enough. Skips ore touching lava or water. Returns how many were gained and the new total.",
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
      for (const radius of SEARCH_RADII) {
        const points = nearestUncrowded(bot, bot.findBlocks({ matching: oreIds, maxDistance: radius, count: 64 }));
        for (const point of points) {
          if (skipped.has(key(point))) continue;
          if (!isExposed(bot, point)) continue;
          if (liquidBeside(bot, point)) {
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
        const wetNote = wet.size ? `; ${wet.size} ${kind} ore in sight ${wet.size === 1 ? "is" : "are"} beside water or lava, which this won't mine` : "";
        const reason =
          gained() > 0
            ? `gained ${gained()} ${drop}, then no more ${kind} ore in reach${far}${wetNote}`
            : `no ${kind} ore in reach within ${SEARCH_RADII[SEARCH_RADII.length - 1]} blocks${wetNote}${far || " — explore, descend or dig a tunnel to uncover some"}`;
        return { status: "failed", reason, detail: { gained: gained(), total: dropsHeld() } };
      }

      const { x, y, z } = block.position;
      try {
        await withTimeout(bot.pathfinder.goto(new goals.GoalNear(x, y, z, 2)), TRAVEL_TIMEOUT_MS, "walking to ore");
        const fresh = bot.blockAt(block.position);
        if (!fresh || !oreIds.includes(fresh.type) || !bot.canDigBlock(fresh)) throw new Error("cannot dig it from here");
        // Out of reach or behind a wall, the server ignores the dig and mineflayer waits forever.
        if (!(await digThrough(bot, fresh))) throw new Error("out of reach");
        // digThrough may have changed the tool in hand to dig dirt or stone; ore needs the pickaxe.
        const pick = bot.inventory.items().find((item) => item.name === pickaxe);
        if (pick) await bot.equip(pick, "hand");
        await withTimeout(bot.dig(fresh), DIG_TIMEOUT_MS, "digging ore");
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
