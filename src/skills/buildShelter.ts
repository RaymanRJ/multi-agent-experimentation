import { Vec3 } from "vec3";
import type { Skill, SkillContext, SkillResult } from "../types.js";
import { countInventory } from "../observe.js";
import { threatened, withTimeout } from "./util.js";
import { craft } from "./craft.js";

const PLACE_TIMEOUT_MS = 8_000;
const MAX_FAILED_CELLS = 4;
const MAX_PASSES = 6;
const PLACE_ATTEMPTS = 3;

const SOLID_EXACT = new Set(["cobblestone", "dirt", "stone", "cobbled_deepslate", "andesite", "diorite", "granite"]);

function isBuildingBlock(name: string): boolean {
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
    if (made >= shortfall || !name.endsWith("_log")) continue;
    const planks = Math.min(count * 4, Math.ceil((shortfall - made) / 4) * 4);
    const result = await craft.run(ctx, { item: name.replace(/_log$/, "_planks"), count: planks });
    if (result.status === "success") made += planks;
    else ctx.log(`could not turn ${name} into planks: ${result.reason ?? result.status}`);
  }
  return made;
}

const FACES: Vec3[] = [new Vec3(0, -1, 0), new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(0, 1, 0)];

/**
 * Layout, relative to the centre of a 3x3 interior at the bot's feet:
 *   walls  — the 12 cells orthogonally around the interior (corners are not needed
 *            to seal it), two high, with a 2-high doorway in the middle of the south side
 *   roof   — those 12 cells plus the 9 interior cells, one level above the walls
 */
function layout(): { walls: Vec3[]; roof: Vec3[]; door: Vec3[] } {
  const ring: Array<[number, number]> = [];
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      const ringCell = Math.max(Math.abs(dx), Math.abs(dz)) === 2;
      const corner = Math.abs(dx) === 2 && Math.abs(dz) === 2;
      if (ringCell && !corner) ring.push([dx, dz]);
    }
  }
  const door = [new Vec3(0, 0, 2), new Vec3(0, 1, 2)];
  const isDoor = (v: Vec3) => door.some((d) => d.equals(v));

  const walls: Vec3[] = [];
  for (const dy of [0, 1]) {
    for (const [dx, dz] of ring) {
      const cell = new Vec3(dx, dy, dz);
      if (!isDoor(cell)) walls.push(cell);
    }
  }
  const roof: Vec3[] = ring.map(([dx, dz]) => new Vec3(dx, 2, dz));
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) roof.push(new Vec3(dx, 2, dz));
  return { walls, roof, door };
}

export const buildShelter: Skill = {
  name: "build_shelter",
  description:
    "Build a small enclosed hut around where you are standing: a 3x3 interior, 2 blocks high, with a roof " +
    "and a 2-high doorway on the south side, using planks, cobblestone, stone, dirt or similar blocks from " +
    "inventory. Needs about 43 building blocks (any mix; fewer if natural walls already exist). Logs in your " +
    "inventory are turned into planks automatically (1 log = 4 planks, so 11 logs is enough on its own). " +
    "Tells you the exact shortfall if you have too few. Stand on reasonably flat open ground first. " +
    "You end up standing inside. Returns the shelter's centre position and how many blocks were used.",
  args: {},

  async run(ctx: SkillContext): Promise<SkillResult> {
    const bot = ctx.bot;
    const center = bot.entity.position.floored();
    const { walls, roof, door } = layout();
    const cellAt = (offset: Vec3) => center.plus(offset);

    // Interior must be clear: clear what we can dig, fail on the rest.
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (const dy of [0, 1]) {
          const block = bot.blockAt(center.offset(dx, dy, dz));
          if (!block || block.boundingBox !== "block") continue;
          try {
            if (!bot.canDigBlock(block)) throw new Error("cannot dig");
            await withTimeout(bot.dig(block), 10_000, "clearing interior");
          } catch {
            return {
              status: "failed",
              reason: `the 3x3 space around me is blocked by ${block.name} that I cannot clear — move to open flat ground`,
            };
          }
        }
      }
    }

    const needsBlock = (offset: Vec3) => bot.blockAt(cellAt(offset))?.boundingBox !== "block";
    const required = [...walls, ...roof].filter(needsBlock).length;
    const blocksHeld = () => Object.values(materials(ctx)).reduce((a, b) => a + b, 0);
    if (blocksHeld() < required) await planksFromLogs(ctx, required - blocksHeld());
    const held = materials(ctx);
    const available = blocksHeld();
    if (available < required) {
      return {
        status: "failed",
        reason: `need ${required - available} more building blocks: shelter needs ${required}, I have ${available} after turning my logs into planks — gather about ${Math.ceil((required - available) / 4)} more logs`,
        detail: { required, available, materials: held },
      };
    }

    let remaining = [...walls, ...roof].filter(needsBlock);
    let placed = 0;
    const failed = new Set<string>();
    const key = (v: Vec3) => `${v.x},${v.y},${v.z}`;

    for (let pass = 0; pass < MAX_PASSES && remaining.length > 0; pass++) {
      const stillRemaining: Vec3[] = [];
      const placedBefore = placed;
      for (const offset of remaining) {
        if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending", detail: { placed } };
        const danger = threatened(ctx);
        if (danger) return { status: "aborted", reason: `stopped building because ${danger}`, detail: { placed } };

        if (!needsBlock(offset)) continue;
        const cell = cellAt(offset);

        // Every solid neighbour is a possible thing to click against; the server may refuse one
        // face (line of sight, a late block update) and accept another, so try them all.
        const references: Array<{ block: NonNullable<ReturnType<typeof bot.blockAt>>; face: Vec3 }> = [];
        for (const direction of FACES) {
          const candidate = bot.blockAt(cell.plus(direction));
          if (candidate && candidate.boundingBox === "block") references.push({ block: candidate, face: direction.scaled(-1) });
        }
        if (references.length === 0) {
          stillRemaining.push(offset); // a neighbour may be placed later this pass
          continue;
        }

        if (!bot.inventory.items().some((item) => isBuildingBlock(item.name))) {
          return { status: "failed", reason: "ran out of building blocks part-way through", detail: { placed, required } };
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
              status: "failed",
              reason: `gave up after ${failed.size} blocks could not be placed — the ground here may be too uneven or water-logged`,
              detail: { placed, required },
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
    if (unbuilt.length > 0) {
      return {
        status: "failed",
        reason: `shelter incomplete: ${unbuilt.length} blocks could not be placed (no solid surface to build against) — try flat ground with a solid floor`,
        detail: { placed, required, unbuilt: unbuilt.length },
      };
    }

    // The door gap must stay open.
    const doorBlocked = door.some((offset) => !needsBlock(offset));
    return {
      status: "success",
      reason: "the shelter is finished and you are standing inside it — there is no need to build it again",
      detail: {
        position: { x: center.x, y: center.y, z: center.z },
        interior: "3x3",
        doorway: `south side at x=${center.x}, z=${center.z + 2}`,
        blocksPlaced: placed,
        doorwayBlocked: doorBlocked,
      },
    };
  },
};
