import pathfinderPkg from "mineflayer-pathfinder";
import type { Block } from "prismarine-block";
import type { Skill, SkillContext, SkillResult } from "../types.js";
import { countInventory } from "../observe.js";
import { asNumber, smeltProduct, SMELTS, withTimeout } from "./util.js";
import { craft, placeNearby } from "./craft.js";

const { goals } = pathfinderPkg;

const FURNACE_SEARCH_RADIUS = 32;
const TRAVEL_TIMEOUT_MS = 30_000;
/** A furnace takes 200 ticks (10 s) per item; allow some slack. */
const TICKS_PER_ITEM = 230;

/** Fuel in order of preference, with how many items one unit smelts. Any log or planks counts as wood. */
const FUELS: Array<{ test: (name: string) => boolean; smelts: number }> = [
  { test: (n) => n === "coal" || n === "charcoal", smelts: 8 },
  { test: (n) => n.endsWith("_planks"), smelts: 1.5 },
  { test: (n) => n.endsWith("_log"), smelts: 1.5 },
  { test: (n) => n === "stick", smelts: 0.5 },
];

/**
 * Fuel to cover `items`: one kind if any kind held covers it alone, the best such first; otherwise
 * the best kind topped up with the next. Pure, for testing. Returns [item name, count] pairs, or
 * null if everything held is not enough. A furnace's fuel slot holds one kind at a time, so a mix is
 * loaded one kind after another as the slot empties (tbase1: loading two kinds at once failed 42
 * times as "destination full").
 */
export function chooseFuel(inventory: Record<string, number>, items: number): Array<[string, number]> | null {
  for (const fuel of FUELS) {
    for (const [name, held] of Object.entries(inventory)) {
      if (fuel.test(name) && held * fuel.smelts >= items) return [[name, Math.ceil(items / fuel.smelts)]];
    }
  }
  const chosen: Array<[string, number]> = [];
  let left = items;
  for (const fuel of FUELS) {
    for (const [name, held] of Object.entries(inventory)) {
      if (left <= 0) break;
      if (!fuel.test(name) || held <= 0) continue;
      const use = Math.min(held, Math.ceil(left / fuel.smelts));
      chosen.push([name, use]);
      left -= use * fuel.smelts;
    }
  }
  return left <= 0 ? chosen : null;
}

/** A furnace within reach: one nearby, one held and placed, or one crafted from 8 cobblestone and placed. */
async function ensureFurnace(ctx: SkillContext): Promise<Block | string> {
  const bot = ctx.bot;
  const furnaceId = bot.registry.blocksByName["furnace"]?.id;
  if (furnaceId === undefined) return "this server version has no furnace";
  const near = bot.findBlock({ matching: furnaceId, maxDistance: FURNACE_SEARCH_RADIUS });
  if (near) {
    const { x, y, z } = near.position;
    try {
      await withTimeout(bot.pathfinder.goto(new goals.GoalNear(x, y, z, 2)), TRAVEL_TIMEOUT_MS, "walking to furnace");
      return near;
    } catch (error) {
      ctx.log(`could not reach the furnace at ${x},${y},${z}: ${(error as Error).message}`);
    }
  }
  if ((countInventory(bot)["furnace"] ?? 0) === 0) {
    const made = await craft.run(ctx, { item: "furnace", count: 1 });
    if (made.status !== "success") return `no furnace nearby and could not craft one: ${made.reason ?? made.status}`;
  }
  const placed = await placeNearby(ctx, "furnace");
  return placed ?? "could not place the furnace: no open ground within reach — move somewhere clearer";
}

export const smelt: Skill = {
  name: "smelt",
  description:
    "Smelt items in a furnace. Takes `item` — what you want to make (iron_ingot from raw_iron, gold_ingot, copper_ingot, " +
    "or the raw item itself, e.g. raw_iron for iron_ingot; " +
    "stone from cobblestone, glass from sand, cooked meat) — and `count`. Uses a furnace within 32 blocks, or places " +
    "one from your inventory, or crafts one from 8 cobblestone. Burns fuel you carry: coal or charcoal (8 items each), " +
    "planks or logs (1.5 each), sticks. Waits about 10 seconds per item. Fails, naming what is missing, without the " +
    "raw items or enough fuel. Returns how many were made and your new total.",
  args: { item: "string", count: "number" },

  async run(ctx: SkillContext, rawArgs): Promise<SkillResult> {
    const bot = ctx.bot;
    const product = smeltProduct(String(rawArgs["item"] ?? ""));
    const source = product ? SMELTS[product] : undefined;
    if (!product || !source) {
      return { status: "failed", reason: `"${String(rawArgs["item"] ?? "")}" is not something this can smelt — use one of ${Object.keys(SMELTS).join(", ")}` };
    }
    const count = Math.max(1, Math.min(64, Math.floor(asNumber(rawArgs["count"], 1))));

    const inventory = countInventory(bot);
    const raw = inventory[source] ?? 0;
    if (raw < count) {
      return { status: "failed", reason: `need ${count - raw} more ${source} to make ${count} ${product}`, detail: { missing: { [source]: count - raw } } };
    }
    const noFuel = { status: "failed" as const, reason: `not enough fuel to smelt ${count} ${source}: carry coal (mine_ore coal), or logs or planks` };
    if (!chooseFuel(inventory, count)) return noFuel;

    const furnaceBlock = await ensureFurnace(ctx);
    // An interrupt that stopped the furnace craft is an interrupt, not a failure: the agent then tells the model why.
    if (typeof furnaceBlock === "string") return { status: ctx.shouldStop() ? "aborted" : "failed", reason: furnaceBlock };
    if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending" };
    // Chosen again now: a crafting table made for the furnace takes planks, which bpoc7's lb had
    // picked as fuel ("Can't find dark_oak_planks").
    const fuel = chooseFuel(countInventory(bot), count);
    if (!fuel) return noFuel;

    const sourceId = bot.registry.itemsByName[source]!.id;
    const startedWith = countInventory(bot)[product] ?? 0;
    const furnace = await bot.openFurnace(furnaceBlock);
    try {
      // Clear whatever an earlier smelt left behind.
      if (furnace.outputItem()) await furnace.takeOutput();
      if (furnace.inputItem() && furnace.inputItem().type !== sourceId) await furnace.takeInput();
      // The fuel slot holds one kind: leftover fuel of another kind comes out, and a mix goes in a kind at a time.
      const queue = fuel.map(([name, use]) => ({ id: bot.registry.itemsByName[name]!.id, use }));
      if (furnace.fuelItem() && furnace.fuelItem().type !== queue[0]!.id) await furnace.takeFuel();
      const loadFuel = async () => {
        const next = queue.shift();
        if (next) await furnace.putFuel(next.id, null, next.use);
      };
      await loadFuel();
      await furnace.putInput(sourceId, null, count);

      const made = () => (countInventory(bot)[product] ?? 0) - startedWith + (furnace.outputItem()?.count ?? 0);
      for (let tick = 0; tick < count * TICKS_PER_ITEM && made() < count; tick += 20) {
        if (ctx.shouldStop()) break;
        if (!furnace.fuelItem() && queue.length) await loadFuel();
        await bot.waitForTicks(20);
      }
      if (furnace.outputItem()) await furnace.takeOutput();
    } catch (error) {
      return { status: "failed", reason: `smelting failed: ${(error as Error).message}` };
    } finally {
      furnace.close();
    }

    const total = countInventory(bot)[product] ?? 0;
    const madeNow = total - startedWith;
    if (madeNow <= 0) return { status: ctx.shouldStop() ? "aborted" : "failed", reason: `the furnace produced no ${product}`, detail: { total } };
    if (madeNow < count) {
      return {
        status: ctx.shouldStop() ? "aborted" : "failed",
        reason: `made ${madeNow} of ${count} ${product} before stopping; the rest is still in the furnace`,
        detail: { made: madeNow, total },
      };
    }
    return { status: "success", detail: { made: madeNow, total } };
  },
};
