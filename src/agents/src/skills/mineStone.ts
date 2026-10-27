import pathfinderPkg from "mineflayer-pathfinder";
import type { Block } from "prismarine-block";
import type { Vec3 } from "vec3";
import type { Skill, SkillContext, SkillResult } from "../types.js";
import { countInventory } from "../observe.js";
import { asNumber, nearestUncrowded, threatened, withTimeout } from "./util.js";

const { goals } = pathfinderPkg;

const SEARCH_RADII = [16, 32, 64];
const TRAVEL_TIMEOUT_MS = 30_000;
const DIG_TIMEOUT_MS = 20_000;
const MAX_FAILED_BLOCKS = 6;
const MAX_TOTAL_MS = 4 * 60_000;
/**
 * Exposed stone further below than this is skipped. Walking to it meant dropping into caves and
 * ravines; one agent fell 22 blocks into a flooded cave and drowned. Digging down is safer.
 * Measured from where the call started: measured from the bot's feet each time, stone six below
 * then six below that walked Sonnet 20 blocks down into the same cave in one call (batch p3).
 */
const MAX_DROP_TO_STONE = 6;
/** How far down to dig for stone when none is exposed. Overworld stone is usually 3-5 blocks down. */
const MAX_DIG_DEPTH = 12;
const LIQUIDS = new Set(["lava", "water"]);
/**
 * Cheapest first, as the digging skills and mine_ore choose: any pickaxe mines stone, so an iron one is
 * kept for ore. Best-first wore iron pickaxes down on cobblestone.
 */
const PICKAXES = ["stone_pickaxe", "wooden_pickaxe", "golden_pickaxe", "iron_pickaxe", "diamond_pickaxe", "netherite_pickaxe"];
const STONE_BLOCKS = ["stone", "cobblestone"];

function cobbleHeld(ctx: SkillContext): number {
  return countInventory(ctx.bot)["cobblestone"] ?? 0;
}

/**
 * Puts the cheapest pickaxe held in hand and waits to land, before each dig. mineflayer fixes a dig's time
 * when it starts, from the item in hand and whether the bot is on the ground. The pathfinder equips
 * whatever digs its way fastest (a shovel for dirt) or the dirt it places as a step, and leaves it in
 * hand: live, 50 of 83 stone digs were made with a shovel or dirt, 7.5 s each and no cobblestone, and
 * the 37.5 s ones made off the ground were the "digging stone timed out" failures. Returns the pickaxe
 * in hand, or null when none is left (it broke).
 */
async function readyToDig(ctx: SkillContext): Promise<string | null> {
  const bot = ctx.bot;
  const inventory = countInventory(bot);
  const pickaxe = PICKAXES.find((name) => (inventory[name] ?? 0) > 0);
  if (!pickaxe) return null;
  if (bot.heldItem?.name !== pickaxe) {
    const item = bot.inventory.items().find((candidate) => candidate.name === pickaxe);
    if (item) await bot.equip(item, "hand");
  }
  for (let tick = 0; tick < 20 && !bot.entity.onGround; tick++) await bot.waitForTicks(1);
  return pickaxe;
}

const NEIGHBOURS: Array<[number, number, number]> = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

/**
 * Stone with at least one open side can be reached without tunnelling. Stone touching lava or
 * water is a hazard: water counts as an open side to the game, and mining such stone meant swimming
 * to it and digging under water, 25 times slower, until the air ran out (team trio2: Sonnet drowned
 * twice this way, and it is where the "digging stone timed out" failures came from).
 */
export function exposure(ctx: SkillContext, point: Vec3): "open" | "buried" | "hazard" {
  let open = false;
  for (const [dx, dy, dz] of NEIGHBOURS) {
    const neighbour = ctx.bot.blockAt(point.offset(dx, dy, dz));
    if (!neighbour) continue;
    if (LIQUIDS.has(neighbour.name)) return "hazard";
    if (neighbour.boundingBox === "empty") open = true; // air, grass, flowers: anything a player walks through
  }
  return open ? "open" : "buried";
}

/**
 * No exposed stone in range: dig straight down from where the bot stands until it hits stone,
 * then keep digging stone below until enough cobblestone is held. Deterministic and nearly
 * always available on land, so the model is not left to solve "find a hillside" by trial and error.
 * Stops before any block with lava or water below or beside it.
 */
async function digDown(ctx: SkillContext, wanted: number): Promise<string | null> {
  const bot = ctx.bot;
  for (let depth = 0; cobbleHeld(ctx) < wanted; depth++) {
    if (ctx.shouldStop()) return "the run is ending";
    if (depth >= MAX_DIG_DEPTH) return `dug ${MAX_DIG_DEPTH} blocks down without finding enough stone`;
    // After a dig the bot is still dropping into the hole; read the ground only once it has landed.
    for (let tick = 0; tick < 40 && !bot.entity.onGround; tick++) await bot.waitForTicks(1);
    const below = bot.blockAt(bot.entity.position.floored().offset(0, -1, 0));
    if (!below) return "the ground below is not loaded";
    if (below.name === "air" || below.name === "cave_air") continue; // still settling; costs a depth step
    for (const [dx, dy, dz] of [[0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]] as const) {
      const next = bot.blockAt(below.position.offset(dx, dy, dz));
      if (next && LIQUIDS.has(next.name)) return `stopped digging down: ${next.name} below`;
    }
    // Breaking into a cave drops the bot an unknown distance, sometimes into water out of sight.
    const under = bot.blockAt(below.position.offset(0, -1, 0));
    if (under && (under.name === "air" || under.name === "cave_air")) return "stopped digging down: a cave opens below";
    if (LIQUIDS.has(below.name)) return `stopped digging down: standing over ${below.name}`;
    if (!bot.canDigBlock(below)) return `cannot dig the ${below.name} below`;
    try {
      if (!(await readyToDig(ctx))) return "your pickaxe broke";
      await withTimeout(bot.dig(below), DIG_TIMEOUT_MS, "digging down");
    } catch (error) {
      return `digging down failed: ${(error as Error).message}`;
    }
    await bot.waitForTicks(STONE_BLOCKS.includes(below.name) ? 10 : 6); // fall into the hole, pick up the drop
  }
  return null;
}

export const mineStone: Skill = {
  name: "mine_stone",
  description:
    "Mine stone and collect cobblestone. Takes `count` — how many cobblestone you want to gain. " +
    "Uses exposed stone nearby, or digs straight down to the stone under the ground when there is none. " +
    "Requires a pickaxe in inventory (at least a wooden_pickaxe; it digs with your cheapest, keeping an iron one for ore) — " +
    "it does not craft one, so use craft first. Fails if no pickaxe, if digging down hits water or lava, " +
    "or blocks cannot be reached. Returns how many cobblestone were gained and the new total.",
  args: { count: "number" },

  async run(ctx: SkillContext, rawArgs): Promise<SkillResult> {
    const bot = ctx.bot;
    const target = Math.max(1, Math.min(64, asNumber(rawArgs["count"], 8)));

    const inventory = countInventory(ctx.bot);
    const pickaxe = PICKAXES.find((name) => (inventory[name] ?? 0) > 0);
    if (!pickaxe) {
      return { status: "failed", reason: "need a wooden_pickaxe — craft one first" };
    }
    const held = bot.inventory.items().find((item) => item.name === pickaxe);
    if (held) {
      try {
        await bot.equip(held, "hand");
      } catch (error) {
        return { status: "failed", reason: `could not equip ${pickaxe}: ${(error as Error).message}` };
      }
    }

    const startedWith = cobbleHeld(ctx);
    const wanted = startedWith + target;
    const startedAt = Date.now();
    const gained = () => cobbleHeld(ctx) - startedWith;

    const stoneIds = STONE_BLOCKS.map((name) => bot.registry.blocksByName[name]?.id).filter(
      (id): id is number => id !== undefined,
    );
    const skipped = new Set<string>();
    const key = (position: Vec3) => `${position.x},${position.y},${position.z}`;
    let mined = 0;
    const startFeet = bot.entity.position.y;

    while (cobbleHeld(ctx) < wanted) {
      if (ctx.shouldStop()) {
        return { status: "aborted", reason: "the run is ending", detail: { gained: gained() } };
      }
      const danger = threatened(ctx);
      if (danger) {
        return { status: "aborted", reason: `stopped mining because ${danger}`, detail: { gained: gained() } };
      }
      if (Date.now() - startedAt > MAX_TOTAL_MS) {
        return {
          status: "failed",
          reason: `ran out of time after gaining ${gained()} of ${target} cobblestone`,
          detail: { gained: gained() },
        };
      }
      if (skipped.size >= MAX_FAILED_BLOCKS) {
        return {
          status: "failed",
          reason: `gave up after ${skipped.size} stone blocks could not be reached or broken`,
          detail: { gained: gained(), mined },
        };
      }

      let block: Block | null = null;
      // Filtered inside the search, not after it: the nearest few hundred stone blocks are nearly all
      // buried, so a search for stone then a filter for open stone found none and dug down instead.
      const usable = (candidate: Block) =>
        candidate.position.y >= startFeet - MAX_DROP_TO_STONE && !skipped.has(key(candidate.position)) && exposure(ctx, candidate.position) === "open";
      for (const radius of SEARCH_RADII) {
        // Nearest first keeps travel short (findBlocks is not distance-sorted for every case);
        // stone beside another agent last, so two agents don't dig the same pit.
        const points = nearestUncrowded(bot, bot.findBlocks({ matching: stoneIds, maxDistance: radius, count: 64, useExtraInfo: usable }));
        if (points[0]) {
          block = bot.blockAt(points[0]);
          break;
        }
      }
      if (!block) {
        ctx.log(`no exposed stone within ${SEARCH_RADII[SEARCH_RADII.length - 1]} blocks — digging down for it`);
        const problem = await digDown(ctx, wanted);
        if (problem === null) break;
        if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending", detail: { gained: gained() } };
        return {
          status: "failed",
          reason: `no exposed stone within ${SEARCH_RADII[SEARCH_RADII.length - 1]} blocks, and ${problem} — explore to somewhere else and try again`,
          detail: { gained: gained() },
        };
      }

      const { x, y, z } = block.position;
      try {
        await withTimeout(
          bot.pathfinder.goto(new goals.GoalNear(x, y, z, 3)),
          TRAVEL_TIMEOUT_MS,
          "walking to stone",
        );
      } catch (error) {
        ctx.log(`could not reach stone at ${x},${y},${z}: ${(error as Error).message}`);
        skipped.add(key(block.position));
        continue;
      }

      const fresh = bot.blockAt(block.position);
      if (!fresh || !STONE_BLOCKS.includes(fresh.name) || !bot.canDigBlock(fresh)) {
        skipped.add(key(block.position));
        continue;
      }
      try {
        if (!(await readyToDig(ctx))) {
          return { status: "failed", reason: `your pickaxe broke after gaining ${gained()} of ${target} cobblestone`, detail: { gained: gained() } };
        }
        await withTimeout(bot.dig(fresh), DIG_TIMEOUT_MS, "digging stone");
        mined++;
      } catch (error) {
        ctx.log(`dig failed at ${x},${y},${z}: ${(error as Error).message}`);
        skipped.add(key(block.position));
        continue;
      }

      // The drop lands where the block was; walk onto it to pick it up.
      try {
        await withTimeout(
          bot.pathfinder.goto(new goals.GoalNear(x, y, z, 1)),
          TRAVEL_TIMEOUT_MS,
          "collecting drops",
        );
      } catch {
        // Best-effort; the loop re-checks the real inventory count.
      }
      await bot.waitForTicks(10);
    }

    return {
      status: "success",
      detail: { gained: gained(), mined, totalCobblestone: cobbleHeld(ctx), pickaxe },
    };
  },
};
