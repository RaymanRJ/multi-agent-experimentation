import pathfinderPkg from "mineflayer-pathfinder";
import type { Block } from "prismarine-block";
import { Vec3 } from "vec3";
import type { Bot } from "mineflayer";
import type { Skill, SkillContext, SkillResult } from "../types.js";
import { asNumber, withTimeout } from "./util.js";

const { goals } = pathfinderPkg;

type Recipe = ReturnType<Bot["recipesAll"]>[number];

/** Item name -> how many are missing. */
type Missing = Map<string, number>;

const REACH = 4;
const TABLE_SEARCH_RADIUS = 32;
const TRAVEL_TIMEOUT_MS = 30_000;
const CRAFT_TIMEOUT_MS = 15_000;
/** Logs -> planks -> sticks -> tool is two levels of intermediates. */
const MAX_DEPTH = 2;

function itemName(bot: Bot, id: number): string {
  return bot.registry.items[id]?.name ?? `item_${id}`;
}

function have(bot: Bot, id: number): number {
  return bot.inventory.count(id, null);
}

function add(into: Missing, name: string, count: number): void {
  into.set(name, (into.get(name) ?? 0) + count);
}

function total(missing: Missing): number {
  let sum = 0;
  for (const count of missing.values()) sum += count;
  return sum;
}

/** Recipes for an item; table recipes only when a table is (or will be) available. */
function recipesOf(bot: Bot, id: number, tableOk: boolean): Recipe[] {
  return bot.recipesAll(id, null, tableOk);
}

function timesFor(recipe: Recipe, count: number): number {
  return Math.max(1, Math.ceil(count / recipe.result.count));
}

/**
 * What would still be missing to run `recipe` `times` times, looking through up
 * to `depth` levels of intermediates (logs -> planks -> sticks). Pure: no crafting.
 */
function missingFor(
  bot: Bot,
  recipe: Recipe,
  times: number,
  depth: number,
  tableOk: boolean,
  chain: readonly number[] = [],
): Missing {
  const missing: Missing = new Map();
  for (const entry of recipe.delta) {
    if (entry.count >= 0) continue;
    const short = -entry.count * times - have(bot, entry.id);
    if (short <= 0) continue;
    if (depth > 0) {
      const best = bestPlan(bot, entry.id, short, depth - 1, tableOk, chain);
      if (best && total(best.missing) === 0) continue;
      // Name the craftable thing that is short (planks for sticks), but stop at raw
      // materials: "need 3 more oak_planks" reads better than "need 1 more oak_log".
      if (best && [...best.missing.keys()].every((n) => isCraftable(bot, n))) {
        for (const [name, count] of best.missing) add(missing, name, count);
        continue;
      }
    }
    add(missing, itemName(bot, entry.id), short);
  }
  return missing;
}

function isCraftable(bot: Bot, name: string): boolean {
  const item = bot.registry.itemsByName[name];
  return item !== undefined && recipesOf(bot, item.id, true).length > 0;
}

/** "birch" for birch_planks / stripped_birch_log; null for anything that is not a wood variant. */
function woodFamily(name: string): string | null {
  if (name === "bamboo" || name === "bamboo_block") return "bamboo";
  const match = name.match(/^(?:stripped_)?(.+)_(?:planks|log|wood|stem|hyphae)$/);
  return match ? (match[1] ?? null) : null;
}

/** The wood type the bot holds most of; oak when it holds none, so messages say "oak_planks". */
function preferredWood(bot: Bot): string {
  const score = new Map<string, number>();
  for (const item of bot.inventory.items()) {
    const family = woodFamily(item.name);
    if (family) score.set(family, (score.get(family) ?? 0) + item.count);
  }
  let best = "oak";
  let bestScore = 0;
  for (const [family, value] of score) {
    if (value > bestScore) {
      best = family;
      bestScore = value;
    }
  }
  return best;
}

/** Recipes differ only by wood type (one per planks variant); keep the one matching what we hold. */
function onlyPreferredWood(bot: Bot, recipes: Recipe[]): Recipe[] {
  const wanted = preferredWood(bot);
  const kept = recipes.filter((recipe) =>
    recipe.delta.every((entry) => {
      if (entry.count >= 0) return true;
      const family = woodFamily(itemName(bot, entry.id));
      return family === null || family === wanted;
    }),
  );
  return kept.length > 0 ? kept : recipes;
}

interface Plan {
  recipe: Recipe;
  times: number;
  missing: Missing;
}

/** The recipe for `id` that is closest to being makeable. Ties prefer no table. */
function bestPlan(
  bot: Bot,
  id: number,
  count: number,
  depth: number,
  tableOk: boolean,
  parents: readonly number[] = [],
): Plan | null {
  let best: Plan | null = null;
  const chain = [...parents, id];
  // Recipes that run in both directions (ingots and their blocks) would otherwise loop.
  // Likewise never make an ingredient by unpacking a block or nugget: "need 9 diamond" is a worse
  // answer than "need 3 diamond".
  const forward = recipesOf(bot, id, tableOk).filter(
    (recipe) =>
      !recipe.delta.some(
        (entry) =>
          entry.count < 0 &&
          (chain.includes(entry.id) ||
            (parents.length > 0 && /_(block|nugget)$/.test(itemName(bot, entry.id)))),
      ),
  );
  for (const recipe of onlyPreferredWood(bot, forward)) {
    const times = timesFor(recipe, count);
    const missing = missingFor(bot, recipe, times, depth, tableOk, chain);
    const better =
      !best ||
      total(missing) < total(best.missing) ||
      (total(missing) === total(best.missing) && best.recipe.requiresTable && !recipe.requiresTable);
    if (better) best = { recipe, times, missing };
  }
  return best;
}

/**
 * Root cause of the flaky table crafts: mineflayer's bot.craft (and the hand-rolled
 * click sequence that replaced it) fires a burst of window clicks without waiting for the
 * server. Each click carries a stateId that is stale by the time the next one is sent,
 * so Paper applies the click and then pushes the full window back; that late push
 * overwrites the client's model mid-sequence, the next click is chosen from the wrong
 * model, and the grid ends up half-filled with the wrong items ("ingredient X not found
 * in window", or a result nobody collected). The fix is to not build the grid by hand:
 * ask the server to fill it (the recipe-book "place recipe" packet, one atomic step),
 * then take the result with a single shift-click.
 */
type Window = NonNullable<Bot["currentWindow"]>;

async function waitFor(check: () => boolean, ticks: number, bot: Bot): Promise<boolean> {
  for (let tick = 0; tick < ticks && !check(); tick++) await bot.waitForTicks(1);
  return check();
}

/** Crafts one batch of `recipe` in `window` (the player inventory, or an open crafting table). */
async function craftInWindow(bot: Bot, recipe: Recipe, window: Window): Promise<void> {
  const resultName = itemName(bot, recipe.result.id);
  const recipeId = `minecraft:${resultName}`;
  (bot._client as unknown as { write(name: string, params: object): void }).write("craft_recipe_request", {
    windowId: window.id,
    recipe: recipeId,
    makeAll: false,
  });
  // The server fills the grid, and the result slot lights up once it has.
  const filled = await waitFor(() => window.slots[0]?.type === recipe.result.id, 40, bot);
  if (!filled) throw new Error(`the server did not fill the crafting grid for ${recipeId}`);
  await bot.clickWindow(0, 0, 1);
}

/** One craft at a time (bot.craft with n > 1 loses items on this server), verified in the inventory. */
async function craftOnce(bot: Bot, recipe: Recipe, table: Block | null): Promise<void> {
  const id = recipe.result.id;
  const before = have(bot, id);
  const expected = before + recipe.result.count;
  const window = table ? await bot.openBlock(table) : bot.inventory;
  try {
    await bot.waitForTicks(2);
    await craftInWindow(bot, recipe, window);
    await settle(bot, id, expected);
  } finally {
    if (table) await bot.closeWindow(window);
  }
  const got = have(bot, id) - before;
  if (got < recipe.result.count) {
    throw new Error(
      `the server did not deliver the ${itemName(bot, id)} (expected +${recipe.result.count}, inventory changed by ${got})`,
    );
  }
}

/**
 * Makes `count` more of an item, crafting intermediates first. Returns what is
 * missing if it cannot, or null on success.
 */
async function produce(
  ctx: SkillContext,
  id: number,
  count: number,
  table: Block | null,
  depth: number,
): Promise<Missing | null> {
  const bot = ctx.bot;
  const plan = bestPlan(bot, id, count, depth, table !== null);
  if (!plan) return new Map([[itemName(bot, id), count]]);
  if (total(plan.missing) > 0) return plan.missing;

  // Making one intermediate (sticks) can eat what another needs (planks), so re-check after each.
  for (let round = 0; round < 6; round++) {
    const entry = plan.recipe.delta.find(
      (e) => e.count < 0 && -e.count * plan.times - have(bot, e.id) > 0,
    );
    if (!entry) break;
    const short = -entry.count * plan.times - have(bot, entry.id);
    const sub = await produce(ctx, entry.id, short, table, depth - 1);
    if (sub) return sub;
  }

  // An intermediate may have eaten ingredients a sibling needed; check for real.
  const recheck = missingFor(bot, plan.recipe, plan.times, 0, table !== null);
  if (total(recheck) > 0) return recheck;

  ctx.log(`crafting ${plan.times}x ${itemName(bot, id)}`);
  const useTable = plan.recipe.requiresTable && table ? table : null;
  for (let n = 0; n < plan.times; n++) {
    await withTimeout(craftOnce(bot, plan.recipe, useTable), CRAFT_TIMEOUT_MS, `crafting ${itemName(bot, id)}`);
  }
  return null;
}

/** Waits for the server's inventory update to show `expected` of the item, then a little longer. */
async function settle(bot: Bot, id: number, expected: number): Promise<void> {
  for (let tick = 0; tick < 40 && have(bot, id) < expected; tick++) await bot.waitForTicks(1);
  await bot.waitForTicks(5);
}

function describeMissing(missing: Missing): string {
  return [...missing.entries()].map(([name, count]) => `${count} more ${name}`).join(" and ");
}

function planksHint(missing: Missing): string {
  const names = [...missing.keys()];
  return names.some((name) => name.endsWith("_planks") || name === "stick")
    ? " (planks and sticks are crafted from logs — gather_wood first)"
    : "";
}

const PLACE_REACH = 4.2;
const PLACE_RADIUS = 4;

function isOpen(block: Block | null): boolean {
  return block !== null && block.boundingBox === "empty" && block.name !== "water" && block.name !== "lava";
}

/** Cells near the bot where a block could stand on solid ground, nearest first. */
function placementSpots(bot: Bot): Vec3[] {
  const feet = bot.entity.position.floored();
  const eye = bot.entity.position.offset(0, 1.6, 0);
  const spots: Array<{ cell: Vec3; distance: number }> = [];
  for (let dx = -PLACE_RADIUS; dx <= PLACE_RADIUS; dx++) {
    for (let dz = -PLACE_RADIUS; dz <= PLACE_RADIUS; dz++) {
      if (dx === 0 && dz === 0) continue; // the bot's own column
      for (const dy of [0, -1, 1]) {
        const cell = feet.offset(dx, dy, dz);
        const distance = eye.distanceTo(cell.offset(0.5, 0.5, 0.5));
        if (distance > PLACE_REACH) continue;
        if (!isOpen(bot.blockAt(cell)) || !isOpen(bot.blockAt(cell.offset(0, 1, 0)))) continue;
        if (bot.blockAt(cell.offset(0, -1, 0))?.boundingBox !== "block") continue;
        spots.push({ cell, distance });
      }
    }
  }
  return spots.sort((a, b) => a.distance - b.distance).map((spot) => spot.cell);
}

async function tryPlaceHere(ctx: SkillContext, name: string): Promise<Block | null> {
  const bot = ctx.bot;
  for (const cell of placementSpots(bot)) {
    const held = bot.inventory.items().find((item) => item.name === name);
    if (!held) return null;
    try {
      await bot.equip(held, "hand");
      await bot.placeBlock(bot.blockAt(cell.offset(0, -1, 0))!, new Vec3(0, 1, 0));
    } catch (error) {
      ctx.log(`could not place ${name} at ${cell.x},${cell.y},${cell.z}: ${(error as Error).message}`);
      await bot.waitForTicks(3);
    }
    const placed = bot.blockAt(cell);
    if (placed && placed.name === name) return placed;
  }
  return null;
}

/** Spots to walk to when nothing next to the bot works: open ground 3-8 blocks away, nearest first. */
function relocationTargets(bot: Bot): Vec3[] {
  const feet = bot.entity.position.floored();
  const found: Array<{ cell: Vec3; distance: number }> = [];
  for (let dx = -8; dx <= 8; dx++) {
    for (let dz = -8; dz <= 8; dz++) {
      const distance = Math.hypot(dx, dz);
      if (distance < 3 || distance > 8) continue;
      for (const dy of [0, -1, 1, -2, 2]) {
        const cell = feet.offset(dx, dy, dz);
        if (!isOpen(bot.blockAt(cell)) || !isOpen(bot.blockAt(cell.offset(0, 1, 0)))) continue;
        if (bot.blockAt(cell.offset(0, -1, 0))?.boundingBox !== "block") continue;
        found.push({ cell, distance });
        break;
      }
    }
  }
  return found.sort((a, b) => a.distance - b.distance).map((spot) => spot.cell);
}

/**
 * Puts a held block on solid ground within reach: tries every open spot within reach
 * of where the bot stands (forests are cluttered, so the nearest cells are often
 * trunks or leaves), and if none works walks to open ground nearby and tries again.
 */
async function placeNearby(ctx: SkillContext, name: string): Promise<Block | null> {
  const bot = ctx.bot;
  const here = await tryPlaceHere(ctx, name);
  if (here) return here;

  const tried: Vec3[] = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    const target = relocationTargets(bot).find((cell) => tried.every((t) => t.distanceTo(cell) > 3));
    if (!target) break;
    tried.push(target);
    try {
      await withTimeout(bot.pathfinder.goto(new goals.GoalBlock(target.x, target.y, target.z)), TRAVEL_TIMEOUT_MS, "walking to open ground");
    } catch (error) {
      ctx.log(`could not walk to open ground at ${target.x},${target.y},${target.z}: ${(error as Error).message}`);
      continue;
    }
    const placed = await tryPlaceHere(ctx, name);
    if (placed) return placed;
  }
  return null;
}

/**
 * A crafting table within reach: one already there, one walked to, one placed
 * from inventory, or one crafted from planks and placed. Null with `missing`
 * set when none of those is possible.
 */
async function ensureTable(
  ctx: SkillContext,
): Promise<{ table: Block } | { missing: Missing } | { error: string }> {
  const bot = ctx.bot;
  const tableId = bot.registry.blocksByName["crafting_table"]?.id;
  const tableItem = bot.registry.itemsByName["crafting_table"];
  if (tableId === undefined || !tableItem) return { error: "this server version has no crafting_table" };

  const near = bot.findBlock({ matching: tableId, maxDistance: REACH });
  if (near) return { table: near };

  const far = bot.findBlock({ matching: tableId, maxDistance: TABLE_SEARCH_RADIUS });
  if (far) {
    const { x, y, z } = far.position;
    try {
      await withTimeout(bot.pathfinder.goto(new goals.GoalNear(x, y, z, 2)), TRAVEL_TIMEOUT_MS, "walking to crafting table");
      return { table: far };
    } catch (error) {
      ctx.log(`could not reach the crafting table at ${x},${y},${z}: ${(error as Error).message}`);
    }
  }

  if (have(bot, tableItem.id) === 0) {
    const missing = await produce(ctx, tableItem.id, 1, null, MAX_DEPTH);
    if (missing) {
      const wrapped: Missing = new Map([["crafting_table", 1]]);
      for (const [name, count] of missing) add(wrapped, name, count);
      wrapped.delete("crafting_table");
      return { missing: wrapped };
    }
  }

  const placed = await placeNearby(ctx, "crafting_table");
  if (!placed) return { error: "could not place a crafting_table: no open ground within reach here or on the three open spots I walked to — move somewhere clearer" };
  return { table: placed };
}

export const craft: Skill = {
  name: "craft",
  description:
    "Craft `count` more of `item` (an item name such as wooden_pickaxe, stick, oak_planks, crafting_table). " +
    "Works out the recipe itself: crafts intermediates (logs -> planks -> sticks) from what you carry, " +
    "and when a crafting table is needed it uses one within reach, walks to a nearby one, " +
    "or places/crafts one (needs 4 planks, or logs to make them). " +
    "Fails, naming exactly what is missing (e.g. 'need 2 more oak_planks'), if you lack the materials. " +
    "Returns how many of the item were crafted and your new total.",
  args: { item: "string", count: "number" },

  async run(ctx: SkillContext, rawArgs): Promise<SkillResult> {
    const bot = ctx.bot;
    const name = String(rawArgs["item"] ?? "").trim().toLowerCase();
    const count = Math.max(1, Math.min(64, Math.floor(asNumber(rawArgs["count"], 1))));
    const item = bot.registry.itemsByName[name];
    if (!item) {
      return { status: "failed", reason: `"${name}" is not a known item name — use names like wooden_pickaxe or oak_planks` };
    }

    if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending" };

    const startedWith = have(bot, item.id);
    // Plan assuming a table is obtainable, so a hopeless attempt fails before any planks are spent on one.
    const plan = bestPlan(bot, item.id, count, MAX_DEPTH, true);
    if (!plan) {
      return { status: "failed", reason: `${name} cannot be crafted — it has no crafting recipe (it may need smelting or mining)` };
    }
    if (total(plan.missing) > 0) {
      return {
        status: "failed",
        reason: `need ${describeMissing(plan.missing)} to craft ${count} ${name}${planksHint(plan.missing)}`,
        detail: { missing: Object.fromEntries(plan.missing) },
      };
    }

    let table: Block | null = null;
    if (plan.recipe.requiresTable) {
      const found = await ensureTable(ctx);
      if ("error" in found) return { status: "failed", reason: found.error };
      if ("missing" in found) {
        return {
          status: "failed",
          reason: `${name} needs a crafting table and none is nearby or in inventory; need ${describeMissing(found.missing)} to make one${planksHint(found.missing)}`,
          detail: { missing: Object.fromEntries(found.missing) },
        };
      }
      table = found.table;
    }

    if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending" };

    try {
      const missing = await produce(ctx, item.id, count, table, MAX_DEPTH);
      if (missing) {
        return {
          status: "failed",
          reason: `need ${describeMissing(missing)} to craft ${count} ${name}${planksHint(missing)}`,
          detail: { missing: Object.fromEntries(missing) },
        };
      }
    } catch (error) {
      return { status: "failed", reason: `crafting ${name} failed: ${(error as Error).message}` };
    }

    const now = have(bot, item.id);
    return {
      status: "success",
      detail: { item: name, crafted: now - startedWith, total: now, usedTable: table !== null },
    };
  },
};
