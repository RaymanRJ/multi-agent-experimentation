import pathfinderPkg from "mineflayer-pathfinder";
import { Vec3 } from "vec3";
import type { Bot } from "mineflayer";
import type { Skill, SkillContext, SkillResult } from "../types.js";
import { countInventory } from "../observe.js";
import { asNumber, gotoWatched, liquidBeside, opensOnClick, threatened, withTimeout } from "./util.js";
import { craft } from "./craft.js";

const { goals } = pathfinderPkg;

const PLACE_TIMEOUT_MS = 8_000;
/** A shelter this close is gone into, not built again (36 huts in thome1, often one per stop). */
export const REUSE_RANGE = 32;
/**
 * How far an agent goes back to a large shelter it built itself, which it remembers as a player
 * remembers their base. In bpoc, Luna explored 45 blocks away and built a second, then a third.
 * Teammates' shelters count only within sight (REUSE_RANGE).
 */
export const HOME_RANGE = 128;
const ENTER_TIMEOUT_MS = 40_000;
/** Walking back from up to HOME_RANGE away takes longer than stepping into one in sight. */
const HOME_TIMEOUT_MS = 120_000;
/** Left inside by agents, and never dug when clearing: beds, chests, a furnace, a table. */
const FURNISHING = /_bed$|^(trapped_)?chest$|^furnace$|^crafting_table$|torch$/;
const MAX_FAILED_CELLS = 4;
const MAX_PASSES = 6;
const PLACE_ATTEMPTS = 3;

const SOLID_EXACT = new Set(["cobblestone", "dirt", "stone", "cobbled_deepslate", "andesite", "diorite", "granite"]);

export function isBuildingBlock(name: string): boolean {
  return name.endsWith("_planks") || SOLID_EXACT.has(name);
}

function materials(ctx: SkillContext): Record<string, number> {
  const found: Record<string, number> = {};
  for (const [name, count] of Object.entries(countInventory(ctx.bot))) {
    if (isBuildingBlock(name)) found[name] = count;
  }
  return found;
}

/**
 * Turns held logs (any wood) into planks until the shelter is covered. Planks
 * are the obvious material, and asking the model to craft them as a separate
 * step tangled it in log types: "oak_planks" needs oak logs specifically.
 */
async function planksFromLogs(ctx: SkillContext, shortfall: number): Promise<number> {
  let made = 0;
  for (const [name, count] of Object.entries(countInventory(ctx.bot))) {
    if (!name.endsWith("_log")) continue;
    let logs = count;
    // craft makes at most a stack (64) per call, and a two-storey shelter needs more than that.
    while (made < shortfall && logs > 0) {
      const planks = Math.min(logs * 4, Math.ceil((shortfall - made) / 4) * 4, 64);
      const result = await craft.run(ctx, { item: name.replace(/_log$/, "_planks"), count: planks });
      if (result.status !== "success") {
        ctx.log(`could not turn ${name} into planks: ${result.reason ?? result.status}`);
        break;
      }
      made += planks;
      logs -= planks / 4;
    }
  }
  return made;
}

const FACES: Vec3[] = [new Vec3(0, -1, 0), new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(0, 1, 0)];

/**
 * Layout, relative to the centre of a 3x3 interior at the bot's feet:
 *   walls  — the 12 cells orthogonally around the interior (corners are not needed
 *            to seal it), two high, with a 2-high doorway in the middle of the south side
 *   roof   — those 12 cells plus the 9 interior cells, one level above the walls
 * With two storeys the walls rise to five high, the roof sits on top of them, and a floor
 * (the 9 interior cells at the old roof's height, less a 1-block hatch in one corner) splits
 * the inside into two rooms. The floor is listed last: placed earlier, it would sit between
 * the builder and the roof it still has to place.
 */
/**
 * The floor under the interior and the doorway. Natural ground usually provides it, but not always:
 * Luna's shelter in poc6 stood over a 2-deep hole under two of its floor cells. Filled before the
 * walls, so nothing can come up from below and the builder can't fall through.
 */
export function floorCells(size: ShelterSize = 3): Vec3[] {
  const h = half(size);
  const floor: Vec3[] = [new Vec3(0, -1, h + 1)];
  for (let dx = -h; dx <= h; dx++) for (let dz = -h; dz <= h; dz++) floor.push(new Vec3(dx, -1, dz));
  return floor;
}

/** The interior's width: 3 (a hut for one) or 5 (room for a team's beds, a chest, a furnace). */
export type ShelterSize = 3 | 5;
/** How far the interior reaches from its centre. */
export const half = (size: ShelterSize) => (size === 5 ? 2 : 1);

export function layout(storeys = 1, size: ShelterSize = 3): { walls: Vec3[]; roof: Vec3[]; door: Vec3[] } {
  const h = half(size), r = h + 1;
  const ring: Array<[number, number]> = [];
  for (let dx = -r; dx <= r; dx++) {
    for (let dz = -r; dz <= r; dz++) {
      const ringCell = Math.max(Math.abs(dx), Math.abs(dz)) === r;
      const corner = Math.abs(dx) === r && Math.abs(dz) === r;
      if (ringCell && !corner) ring.push([dx, dz]);
    }
  }
  const door = [new Vec3(0, 0, r), new Vec3(0, 1, r)];
  const isDoor = (v: Vec3) => door.some((d) => d.equals(v));

  const walls: Vec3[] = [];
  const top = storeys === 2 ? 5 : 2;
  for (let dy = 0; dy < top; dy++) {
    for (const [dx, dz] of ring) {
      const cell = new Vec3(dx, dy, dz);
      if (!isDoor(cell)) walls.push(cell);
    }
  }
  const roof: Vec3[] = ring.map(([dx, dz]) => new Vec3(dx, top, dz));
  for (let dx = -h; dx <= h; dx++) for (let dz = -h; dz <= h; dz++) roof.push(new Vec3(dx, top, dz));
  if (storeys === 2) {
    for (let dx = -h; dx <= h; dx++) for (let dz = -h; dz <= h; dz++) if (!(dx === -h && dz === -h)) roof.push(new Vec3(dx, 2, dz));
  }
  return { walls, roof, door };
}

/**
 * Where a shelter was built: the centre of its floor (the builder's feet), how many storeys, its
 * interior width, who started it, and whether it was ever finished (a large one can be built over
 * several calls, by several agents).
 */
export interface ShelterSpot { x: number; y: number; z: number; storeys: number; size?: ShelterSize; by?: string; complete?: boolean }

export const spotKey = (spot: { x: number; y: number; z: number }) => `${spot.x},${spot.y},${spot.z}`;

/** The bot's feet are in the shelter's interior, on either storey. */
export function insideSpot(bot: Bot, shelter: ShelterSpot): boolean {
  const feet = bot.entity.position.floored();
  const h = half(shelter.size ?? 3);
  const dx = feet.x - shelter.x, dy = feet.y - shelter.y, dz = feet.z - shelter.z;
  return Math.abs(dx) <= h && Math.abs(dz) <= h && dy >= 0 && dy <= (shelter.storeys === 2 ? 4 : 1);
}

/**
 * A known shelter that is still there: at least a few of its walls stand. Spots are shared between
 * teammates, so this is checked against the world, as a player would see the hut, not taken on trust.
 */
export function standing(bot: Bot, shelter: ShelterSpot): boolean {
  const centre = new Vec3(shelter.x, shelter.y, shelter.z);
  const { walls } = layout(shelter.storeys, shelter.size ?? 3);
  let solid = 0;
  for (const offset of walls) {
    const block = bot.blockAt(centre.plus(offset));
    if (block === null) return true; // not loaded: can't tell, so keep it
    if (block.boundingBox === "block" && ++solid >= 4) return true;
  }
  return false;
}

/** "a large two-storey shelter", "an unfinished large shelter", "a shelter". */
export function describeShelter(shelter: ShelterSpot): string {
  const kind = `${(shelter.size ?? 3) === 5 ? "large " : ""}${shelter.storeys === 2 ? "two-storey " : ""}shelter`;
  return shelter.complete === false ? `an unfinished ${kind}` : /^[aeiou]/.test(kind) ? `an ${kind}` : `a ${kind}`;
}

/**
 * True when the bot is inside the shelter and every floor, wall, roof and doorway block is in place, so no
 * mob can reach it. A hostile outside is then no reason to stop or to leave (Luna, poc6, left a
 * closed shelter at night because a zombie came within 6 blocks of it).
 */
export function insideClosedShelter(bot: Bot, shelter: ShelterSpot): boolean {
  if (!insideSpot(bot, shelter)) return false;
  const size = shelter.size ?? 3;
  const { walls, roof, door } = layout(shelter.storeys, size);
  const centre = new Vec3(shelter.x, shelter.y, shelter.z);
  return [...floorCells(size), ...walls, ...roof, ...door].every((offset) => bot.blockAt(centre.plus(offset))?.boundingBox === "block");
}

/** Fills the doorway's cells from inside, bottom first. True once both are solid. */
async function closeDoorway(ctx: SkillContext, cells: Vec3[]): Promise<boolean> {
  const bot = ctx.bot;
  const open = (cell: Vec3) => bot.blockAt(cell)?.boundingBox !== "block";
  for (const cell of cells) {
    for (let attempt = 0; attempt < PLACE_ATTEMPTS && open(cell); attempt++) {
      for (const direction of FACES) {
        const reference = bot.blockAt(cell.plus(direction));
        if (!reference || reference.boundingBox !== "block" || opensOnClick(reference.name)) continue;
        // Planks or dirt first: dug by hand they drop, so whoever opens the doorway can close it again.
        const blocks = bot.inventory.items().filter((item) => isBuildingBlock(item.name));
        const stack = blocks.find((item) => item.name.endsWith("_planks") || item.name === "dirt") ?? blocks[0];
        if (!stack) return false;
        try {
          await bot.equip(stack, "hand");
          await withTimeout(bot.placeBlock(reference, direction.scaled(-1)), PLACE_TIMEOUT_MS, "closing the doorway");
        } catch {
          await bot.waitForTicks(4); // the block update can arrive after mineflayer gave up waiting
        }
        if (!open(cell)) break;
      }
    }
  }
  return cells.every((cell) => !open(cell));
}

interface Build {
  centre: Vec3;
  size: ShelterSize;
  storeys: number;
  /** Clear the interior first: for a new shelter only, never one with someone's bed in it. */
  clear: boolean;
  /** Place what blocks there are and report what is left, rather than refuse (large shelters). */
  partial: boolean;
  /** A finished shelter gone back into: fill what gaps the blocks held allow, and say how many stay open. */
  repair?: boolean;
}

type Built = { done: true; placed: number; closed: boolean; gaps: number } | { done: false; result: SkillResult };

/** Clears (if asked), places every missing floor, wall and roof block, and closes the doorway. */
async function construct(ctx: SkillContext, b: Build): Promise<Built> {
  const bot = ctx.bot;
  const { walls, roof, door } = layout(b.storeys, b.size);
  const h = half(b.size);
  const cellAt = (offset: Vec3) => b.centre.plus(offset);
  const position = { x: b.centre.x, y: b.centre.y, z: b.centre.z };
  const interior = `${b.size}x${b.size}`;

  if (b.clear) {
    // Interior must be clear: clear what we can dig, fail on the rest. Two storeys also need the
    // upper room and the hatch between them clear, and any shelter its doorway.
    const clear: Vec3[] = [...door];
    for (let dx = -h; dx <= h; dx++) {
      for (let dz = -h; dz <= h; dz++) {
        for (const dy of b.storeys === 2 ? [0, 1, 3, 4] : [0, 1]) clear.push(new Vec3(dx, dy, dz));
      }
    }
    if (b.storeys === 2) clear.push(new Vec3(-h, 2, -h));
    // Look before digging anything: a cleared block with lava behind it lets the lava in on the builder.
    for (const offset of clear) {
      const point = b.centre.plus(offset);
      const here = bot.blockAt(point);
      const liquid = here?.name === "lava" || here?.name === "water" ? here.name : here?.boundingBox === "block" ? liquidBeside(bot, point) : null;
      if (liquid) {
        return { done: false, result: { status: "failed", reason: `there is ${liquid} in or beside the space the shelter needs — move to open dry ground first` } };
      }
    }
    for (const offset of clear) {
      const block = bot.blockAt(b.centre.plus(offset));
      if (!block || block.boundingBox !== "block" || FURNISHING.test(block.name)) continue;
      try {
        if (!bot.canDigBlock(block)) throw new Error("cannot dig");
        // Bare hands take 10 s on cobblestone, as long as the old limit (Haiku in p5 had a stone pickaxe).
        const tool = bot.pathfinder.bestHarvestTool(block);
        if (tool) await bot.equip(tool, "hand");
        await withTimeout(bot.dig(block), Math.max(10_000, bot.digTime(block) + 2000), "clearing interior");
      } catch {
        // An interrupt (a spider, a hit) stops the dig; that is not the block's fault (Haiku in p5 was told
        // twice that dirt "cannot be cleared"). Aborted lets the agent give the interrupt as the reason.
        if (ctx.shouldStop()) return { done: false, result: { status: "aborted", reason: "interrupted while clearing the space" } };
        return { done: false, result: { status: "failed", reason: `the ${interior} space around me is blocked by ${block.name} that I cannot clear — move to open flat ground` } };
      }
    }
  }

  const needsBlock = (offset: Vec3) => bot.blockAt(cellAt(offset))?.boundingBox !== "block";
  const cells = [...floorCells(b.size), ...walls, ...roof];
  const required = cells.filter(needsBlock).length;
  const blocksHeld = () => Object.values(materials(ctx)).reduce((a, n) => a + n, 0);
  // Two more than the walls and roof need, to close the doorway with; without them it stays open.
  if (blocksHeld() < required + door.length) await planksFromLogs(ctx, required + door.length - blocksHeld());
  const available = blocksHeld();
  const logsFor = (blocks: number) => Math.ceil(blocks / 4);
  const unfinished = (placed: number, left: number): Built => ({
    done: false,
    result: {
      status: "failed",
      reason:
        `${placed ? `placed ${placed} blocks of` : "could not add to"} the large shelter at ${position.x},${position.y},${position.z}; it still needs ${left} ` +
        `building blocks (about ${logsFor(left)} logs, or cobblestone) — bring more and build_shelter again there, or a teammate can`,
      detail: { position, interior, size: b.size, storeys: b.storeys, placed, stillNeeded: left, complete: false },
    },
  });
  if (available < required && !b.repair && (!b.partial || available === 0)) {
    if (b.partial) return unfinished(0, required);
    return {
      done: false,
      result: {
        status: "failed",
        reason: `need ${required - available} more building blocks: shelter needs ${required}, I have ${available} after turning my logs into planks — gather about ${logsFor(required - available)} more logs`,
        detail: { required, available, materials: materials(ctx) },
      },
    };
  }

  let remaining = cells.filter(needsBlock);
  let placed = 0;
  // Damage interrupts this skill only at low health (DAMAGE_FLOOR), which suits the way in, not building in the open.
  let peakHealth = bot.health;
  const failed = new Set<string>();
  const key = (v: Vec3) => `${v.x},${v.y},${v.z}`;
  const hasBlocks = () => bot.inventory.items().some((item) => isBuildingBlock(item.name));

  for (let pass = 0; pass < MAX_PASSES && remaining.length > 0; pass++) {
    const stillRemaining: Vec3[] = [];
    const placedBefore = placed;
    for (const offset of remaining) {
      if (ctx.shouldStop()) return { done: false, result: { status: "aborted", reason: "the run is ending", detail: { position, placed } } };
      // Building in the open stops for a mob close by or a hit; filling the gaps of a shelter the agent is inside
      // does not: that is how it gets safe from the mob.
      peakHealth = Math.max(peakHealth, bot.health);
      const hit = bot.health < peakHealth ? `you took damage (health ${Math.round(bot.health)})` : null;
      const danger = b.repair ? null : hit ?? threatened(ctx);
      if (danger) return { done: false, result: { status: "aborted", reason: `stopped building because ${danger}`, detail: { position, placed } } };

      if (!needsBlock(offset)) continue;
      const cell = cellAt(offset);

      // Every solid neighbour is a possible thing to click against; the server may refuse one
      // face (line of sight, a late block update) and accept another, so try them all.
      const references: Array<{ block: NonNullable<ReturnType<typeof bot.blockAt>>; face: Vec3 }> = [];
      for (const direction of FACES) {
        const candidate = bot.blockAt(cell.plus(direction));
        if (candidate && candidate.boundingBox === "block" && !opensOnClick(candidate.name)) references.push({ block: candidate, face: direction.scaled(-1) });
      }
      if (references.length === 0) {
        stillRemaining.push(offset); // a neighbour may be placed later this pass
        continue;
      }

      if (!hasBlocks()) {
        if (b.repair) break;
        if (b.partial) return unfinished(placed, cells.filter(needsBlock).length);
        return { done: false, result: { status: "failed", reason: "ran out of building blocks part-way through", detail: { position, placed, required } } };
      }
      let done = false;
      let lastError = "";
      for (let attempt = 0; attempt < PLACE_ATTEMPTS && !done; attempt++) {
        for (const { block, face } of references) {
          const stack = bot.inventory.items().find((item) => isBuildingBlock(item.name));
          if (!stack) break;
          try {
            await bot.equip(stack, "hand");
            await withTimeout(bot.placeBlock(block, face), PLACE_TIMEOUT_MS, "placing block");
            done = true;
          } catch (error) {
            lastError = (error as Error).message;
            // The block update can arrive after mineflayer gave up waiting for it.
            await bot.waitForTicks(4);
            done = !needsBlock(offset);
          }
          if (done) break;
        }
        if (!done) await bot.waitForTicks(10 * (attempt + 1));
      }
      if (done) {
        placed++;
      } else {
        ctx.log(`could not place at ${cell.x},${cell.y},${cell.z}: ${lastError}`);
        failed.add(key(offset));
        if (failed.size >= MAX_FAILED_CELLS) {
          return {
            done: false,
            result: { status: "failed", reason: `gave up after ${failed.size} blocks could not be placed — the ground here may be too uneven or water-logged`, detail: { position, placed, required } },
          };
        }
        stillRemaining.push(offset);
      }
    }
    const progressed = placed > placedBefore;
    remaining = stillRemaining;
    if (!progressed) break;
  }

  const unbuilt = remaining.filter(needsBlock);
  if (b.repair && unbuilt.length + cells.filter(needsBlock).length > 0) {
    const gaps = cells.filter(needsBlock).length;
    const closed = gaps === 0 && (await closeDoorway(ctx, door.map(cellAt)));
    return { done: true, placed, closed, gaps: gaps + door.filter((offset) => needsBlock(offset)).length };
  }
  if (unbuilt.length > 0) {
    return {
      done: false,
      result: {
        status: "failed",
        reason: `shelter incomplete: ${unbuilt.length} blocks could not be placed (no solid surface to build against) — try flat ground with a solid floor`,
        detail: { position, placed, required, unbuilt: unbuilt.length },
      },
    };
  }

  // Close the doorway behind the builder. Left open, it let a zombie walk in on Sonnet in p5 while
  // it waited inside all night. The pathfinder digs back out through it (or any wall) when it leaves.
  const closed = await closeDoorway(ctx, door.map(cellAt));
  return { done: true, placed, closed, gaps: closed ? 0 : door.filter((offset) => needsBlock(offset)).length };
}

/**
 * Walks into a known shelter (digging in if it is closed), fills any gaps and closes the doorway
 * behind the agent. For skills that need the agent inside one: build_shelter, sleep with a bed in it.
 */
/**
 * In through the doorway: walk to the cell outside it, dig its two blocks (picking them up on the way
 * in, to close it with), and step to the centre. Letting the pathfinder find its own way in timed out
 * 10 times in bpoc on a closed large shelter, and when it did get in it had dug through the walls,
 * leaving 4-7 gaps an agent with no blocks could not fill.
 */
async function inThroughDoor(ctx: SkillContext, spot: ShelterSpot, timeoutMs: number): Promise<void> {
  const bot = ctx.bot;
  const r = half(spot.size ?? 3) + 1;
  const centre = new Vec3(spot.x, spot.y, spot.z);
  const outside = centre.offset(0, 0, r + 1);
  await gotoWatched(bot, new goals.GoalBlock(outside.x, outside.y, outside.z), timeoutMs, "walking to the shelter's doorway");
  for (const dy of [1, 0]) {
    const block = bot.blockAt(centre.offset(0, dy, r));
    if (block && block.boundingBox === "block") {
      const tool = bot.pathfinder.bestHarvestTool(block);
      if (tool) await bot.equip(tool, "hand");
      await withTimeout(bot.dig(block), Math.max(10_000, bot.digTime(block) + 2000), "opening the doorway");
    }
  }
  // A dropped block can't be picked up for its first 10 ticks: wait beside it, or walk past and leave it.
  await bot.waitForTicks(16);
  await gotoWatched(bot, new goals.GoalBlock(centre.x, centre.y, centre.z), 15_000, "stepping inside");
}

export async function enterShelter(ctx: SkillContext, spot: ShelterSpot): Promise<{ ok: true; placed: number; closed: boolean; gaps: number } | { ok: false; result: SkillResult }> {
  const bot = ctx.bot;
  if (!insideSpot(bot, spot)) {
    const far = bot.entity.position.distanceTo(new Vec3(spot.x + 0.5, spot.y, spot.z + 0.5)) > REUSE_RANGE;
    const timeout = far ? HOME_TIMEOUT_MS : ENTER_TIMEOUT_MS;
    try {
      await inThroughDoor(ctx, spot, timeout);
    } catch (doorError) {
      bot.pathfinder.setGoal(null);
      if (ctx.shouldStop()) return { ok: false, result: { status: "aborted", reason: "interrupted on the way to the shelter" } };
      ctx.log(`could not go in by the doorway (${(doorError as Error).message}); going in another way`);
      try {
        await gotoWatched(bot, new goals.GoalBlock(spot.x, spot.y, spot.z), timeout, "walking into the shelter");
      } catch (error) {
        bot.pathfinder.setGoal(null);
        if (ctx.shouldStop()) return { ok: false, result: { status: "aborted", reason: "interrupted on the way to the shelter" } };
        return { ok: false, result: { status: "failed", reason: `could not get into ${describeShelter(spot)} at ${spotKey(spot)}: ${(error as Error).message}` } };
      }
    }
    await bot.waitForTicks(10); // the doorway's blocks, dropped as it was dug, are picked up on the way in
  }
  const size = spot.size ?? 3;
  const finished = spot.complete !== false;
  const built = await construct(ctx, { centre: new Vec3(spot.x, spot.y, spot.z), size, storeys: spot.storeys, clear: false, partial: !finished && size === 5, repair: finished });
  return built.done ? { ok: true, placed: built.placed, closed: built.closed, gaps: built.gaps } : { ok: false, result: built.result };
}

export const buildShelter: Skill = {
  name: "build_shelter",
  description:
    "Get into a shelter, building one if there is none near. If a shelter (yours or another agent's) stands within " +
    `${REUSE_RANGE} blocks, you walk into it, any gaps in it are filled and its doorway is closed behind you (asking for a large one also ` +
    `takes you back to a large one you built, up to ${HOME_RANGE} blocks away); otherwise a new one ` +
    "is built around where you are standing, with a roof and a 2-high doorway on the south side that is closed behind you " +
    "once you are inside (walking out digs through it). Uses planks, cobblestone, stone, dirt or similar blocks from " +
    "inventory; logs in your inventory are turned into planks automatically (1 log = 4 planks). " +
    "A small shelter (the default) has a 3x3 interior, 2 high, and needs about 45 blocks (12 logs). " +
    "Optional `storeys`: 1 (default) or 2 — a second room on top, with a hatch in the floor between them; about 89 blocks (23 logs). " +
    "Optional `size`: \"large\" for a 5x5 interior with room for several beds, a chest and a furnace: about 85 blocks one storey, " +
    "about 170 with two (43 logs). A large one can be built a part at a time: with too few blocks it places what you have and " +
    "says what is left, and anyone calling build_shelter near it later carries on with it. " +
    "Stand on reasonably flat open ground to build a new one. You end up standing inside. Returns the shelter's centre position and how many blocks were used.",
  args: { storeys: "number?", size: "string?" },

  async run(ctx: SkillContext, args: Record<string, unknown> = {}): Promise<SkillResult> {
    const bot = ctx.bot;
    const storeys = asNumber(args["storeys"], 1) >= 2 ? 2 : 1;
    const size: ShelterSize = /^(large|big|team|5)/i.test(String(args["size"] ?? "").trim()) ? 5 : 3;
    const fits = (spot: ShelterSpot) => (spot.size ?? 3) >= size && spot.storeys >= storeys;
    const known = (ctx.shelters?.() ?? []).filter((spot) => fits(spot) && standing(bot, spot));

    // Already inside one, or one close by: go in and close it up, rather than build another.
    const here = bot.entity.position;
    const byDistance = known.map((s) => ({ s, d: here.distanceTo(new Vec3(s.x + 0.5, s.y, s.z + 0.5)) })).sort((a, b) => a.d - b.d);
    // In sight, anyone's; for a large one, also the agent's own base further off, which it remembers.
    const spot = known.find((s) => insideSpot(bot, s))
      ?? byDistance.find(({ d }) => d <= REUSE_RANGE)?.s
      ?? (size === 5 ? byDistance.find(({ s, d }) => d <= HOME_RANGE && (s.size ?? 3) === 5 && s.by === bot.username)?.s : undefined);

    const centre = spot ? new Vec3(spot.x, spot.y, spot.z) : bot.entity.position.floored();
    const use = spot ? { size: spot.size ?? 3, storeys: spot.storeys } : { size, storeys };
    let built: { placed: number; closed: boolean; gaps: number };
    if (spot) {
      const entered = await enterShelter(ctx, spot);
      if (!entered.ok) return entered.result;
      built = entered;
    } else {
      // A large one is built a part at a time; a small one, needing a dozen logs, all at once as before.
      const made = await construct(ctx, { centre, ...use, clear: true, partial: use.size === 5 });
      if (!made.done) return made.result;
      built = made;
    }

    const position = { x: centre.x, y: centre.y, z: centre.z };
    const kind = describeShelter({ ...position, ...use, complete: true });
    const doorway = built.closed
      ? "closed behind you (walking out digs through it)"
      : built.gaps > 2
        ? `${built.gaps} gaps in its walls open: you have no building blocks to fill them, so mobs can get in`
        : "open: no building block left to close it, so mobs can walk in";
    const owner = spot?.by ? ` (${spot.by}'s)` : "";
    const reason = spot && spot.complete !== false
      ? `you are inside ${kind}${owner} at ${position.x},${position.y},${position.z}${built.placed ? `, ${built.placed} missing blocks filled,` : ""} with the doorway ${doorway} — there is no need to build another`
      : `the ${kind.replace(/^an? /, "")} is finished and you are standing inside it, with the doorway ${doorway} — there is no need to build it again`;
    return {
      status: "success",
      reason,
      detail: {
        position,
        interior: `${use.size}x${use.size}`,
        size: use.size,
        storeys: use.storeys,
        doorway: `south side at x=${centre.x}, z=${centre.z + half(use.size) + 1}`,
        blocksPlaced: built.placed,
        doorwayClosed: built.closed,
        complete: true,
        ...(spot ? { entered: true, ...(spot.by ? { by: spot.by } : {}) } : {}),
      },
    };
  },
};
