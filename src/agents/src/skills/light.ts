import pathfinderPkg from "mineflayer-pathfinder";
import { Vec3 } from "vec3";
import type { Block } from "prismarine-block";
import type { Bot } from "mineflayer";
import type { Skill, SkillContext, SkillResult } from "../types.js";
import { countInventory } from "../observe.js";
import { asNumber, homeBlock, opensOnClick, plainError, runSkill, withTimeout } from "./util.js";
import { craft } from "./craft.js";
import { half, insideSpot, spotKey, type ShelterSpot } from "./buildShelter.js";

/**
 * Torches. Monsters spawn only where a block's light is 0, and a torch's light (14) falls by one a block,
 * so one stops them spawning for about 12 blocks round it. A home closed off from the sky is dark inside
 * by day as well as by night, and its doorway is where monsters waited (night deaths, 29 October). Agents
 * had no way to light anything until 7 November; none had ever made a torch.
 */
const { goals } = pathfinderPkg;
const TORCH = /^(wall_)?torch$/;
const REACH = 4.5;
/** Torches closer than this to each other light mostly the same ground. */
const SPACING = 5;

const SIDES = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1)];

function torchesHeld(bot: Bot): number {
  return countInventory(bot)["torch"] ?? 0;
}

/** Torches made from coal or charcoal and sticks (a stick and a coal make 4), up to `wanted` held. */
async function makeTorches(ctx: SkillContext, wanted: number): Promise<number> {
  const held = countInventory(ctx.bot);
  const short = wanted - (held["torch"] ?? 0);
  if (short > 0 && ((held["coal"] ?? 0) > 0 || (held["charcoal"] ?? 0) > 0)) {
    const made = await runSkill(craft, ctx, { item: "torch", count: short });
    if (made.status !== "success") ctx.log(`could not make torches: ${made.reason ?? made.status}`);
  }
  return torchesHeld(ctx.bot);
}

function open(block: Block | null): boolean {
  return !!block && block.boundingBox === "empty" && block.name !== "water" && block.name !== "lava" && !TORCH.test(block.name);
}

function solid(block: Block | null): block is Block {
  return !!block && block.boundingBox === "block" && !opensOnClick(block.name) && !/leaves|glass|ice/.test(block.name);
}

/** Puts a torch into the open cell `at`: on the floor if it has one, else on a wall beside it. True if it is lit. */
async function placeTorch(bot: Bot, at: Vec3, wall?: Vec3): Promise<boolean> {
  if (!open(bot.blockAt(at))) return false;
  const eye = bot.entity.position.offset(0, bot.entity.height, 0);
  if (eye.distanceTo(at.offset(0.5, 0.5, 0.5)) > REACH) return false;
  const floor = bot.blockAt(at.offset(0, -1, 0));
  let against: Block | null = null;
  let face: Vec3 | null = null;
  if (wall) {
    const w = bot.blockAt(at.minus(wall));
    if (solid(w)) [against, face] = [w, wall];
  } else if (solid(floor)) {
    [against, face] = [floor, new Vec3(0, 1, 0)];
  } else {
    for (const side of SIDES) {
      const w = bot.blockAt(at.minus(side));
      if (solid(w)) {
        [against, face] = [w, side];
        break;
      }
    }
  }
  if (!against || !face) return false;
  const torch = bot.inventory.items().find((item) => item.name === "torch");
  if (!torch) return false;
  try {
    if (bot.heldItem?.name !== "torch") await bot.equip(torch, "hand");
    await withTimeout(bot.placeBlock(against, face), 3000, "putting a torch up");
  } catch {
    // The server may place it and still time the answer out: the block itself says.
  }
  await bot.waitForTicks(2);
  return TORCH.test(bot.blockAt(at)?.name ?? "");
}

/** Torches in the box from `a` to `b`. */
function torchesIn(bot: Bot, a: Vec3, b: Vec3): number {
  let n = 0;
  for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x++)
    for (let y = Math.min(a.y, b.y); y <= Math.max(a.y, b.y); y++)
      for (let z = Math.min(a.z, b.z); z <= Math.max(a.z, b.z); z++) if (TORCH.test(bot.blockAt(new Vec3(x, y, z))?.name ?? "")) n++;
  return n;
}

/**
 * Lights a home from inside: on its side walls at head height (one in a small home, two in a large one),
 * and one outside on the front wall beside the door. On walls, so nothing stands where agents walk, beds
 * go or doors open. What is already lit is left. Returns how many were put up; never fails the caller.
 */
export async function lightHome(ctx: SkillContext, spot: ShelterSpot): Promise<{ placed: number; inside: number; door: boolean; lit: boolean; why?: string }> {
  const bot = ctx.bot;
  const size = spot.size ?? 3;
  const h = half(size);
  const r = h + 1;
  const c = new Vec3(spot.x, spot.y, spot.z);
  const insideWanted = size === 5 ? 2 : 1;
  const insideHas = torchesIn(bot, c.offset(-h, 0, -h), c.offset(h, size === 5 ? 2 : 1, h));
  const outsideHas = torchesIn(bot, c.offset(-2, 0, r + 1), c.offset(2, 2, r + 2));
  const wanted = Math.max(0, insideWanted - insideHas) + (outsideHas ? 0 : 1);
  if (wanted === 0) return { placed: 0, inside: 0, door: false, lit: true };
  if ((await makeTorches(ctx, wanted)) === 0) return { placed: 0, inside: 0, door: false, lit: false, why: "no torches, and no coal or charcoal to make them" };

  let placed = 0;
  // Inside: the middle of the west wall, then the east; along the wall if the middle is taken.
  const walls: Array<{ face: Vec3; dx: number }> = [{ face: new Vec3(1, 0, 0), dx: -h }, { face: new Vec3(-1, 0, 0), dx: h }];
  let insideNow = insideHas;
  for (const { face, dx } of walls) {
    if (insideNow >= insideWanted || torchesHeld(bot) === 0) break;
    for (const dz of [0, -1, 1, -h, h]) {
      if (await placeTorch(bot, c.offset(dx, 1, dz), face)) {
        placed++;
        insideNow++;
        ctx.log(`put a torch up at ${spot.x + dx},${spot.y + 1},${spot.z + dz} in the home at ${spotKey(spot)}`);
        break;
      }
    }
  }
  // Outside, on the front wall beside the door, from inside it: from the cell inside the door when the
  // agent stands too far back (beds down, it was out of reach in a live check).
  let door = false;
  if (!outsideHas && torchesHeld(bot) > 0) {
    for (const attempt of [0, 1]) {
      if (attempt === 1) {
        try {
          await withTimeout(bot.pathfinder.goto(new goals.GoalBlock(spot.x, spot.y, spot.z + h)), 8000, "stepping to the door");
        } catch {
          bot.pathfinder.setGoal(null);
          break;
        }
      }
      for (const dx of [1, -1]) {
        const cell = c.offset(dx, 1, r + 1);
        if (await placeTorch(bot, cell, new Vec3(0, 0, 1))) {
          placed++;
          door = true;
          ctx.log(`put a torch up at ${cell.x},${cell.y},${cell.z} beside the door of the home at ${spotKey(spot)}`);
          break;
        }
      }
      if (door) break;
    }
  }
  return { placed, inside: insideNow - insideHas, door, lit: insideNow >= insideWanted };
}

/** Open cells in reach to put a torch in, spread out from each other and from torches already up. */
function torchSpots(bot: Bot, count: number): { spots: Vec3[]; lit: boolean } {
  const feet = bot.entity.position.floored();
  const existing: Vec3[] = [];
  for (let dx = -8; dx <= 8; dx++)
    for (let dy = -3; dy <= 3; dy++)
      for (let dz = -8; dz <= 8; dz++) {
        const cell = feet.offset(dx, dy, dz);
        if (TORCH.test(bot.blockAt(cell)?.name ?? "")) existing.push(cell);
      }
  const candidates: Vec3[] = [];
  for (let dx = -4; dx <= 4; dx++)
    for (let dy = -1; dy <= 2; dy++)
      for (let dz = -4; dz <= 4; dz++) {
        const cell = feet.offset(dx, dy, dz);
        if ((dx === 0 && dz === 0) || !open(bot.blockAt(cell)) || homeBlock(bot, cell)) continue;
        const floor = solid(bot.blockAt(cell.offset(0, -1, 0)));
        const wall = SIDES.some((s) => solid(bot.blockAt(cell.minus(s))));
        if (!floor && !wall) continue;
        if (bot.entity.position.offset(0, bot.entity.height, 0).distanceTo(cell.offset(0.5, 0.5, 0.5)) > REACH - 0.3) continue;
        candidates.push(cell);
      }
  const chosen: Vec3[] = [];
  for (let i = 0; i < count; i++) {
    const lit = [...existing, ...chosen];
    const score = (cell: Vec3) => (lit.length ? Math.min(...lit.map((t) => t.distanceTo(cell))) : 100 - cell.distanceTo(feet));
    const best = candidates.filter((cell) => !chosen.some((c) => c.equals(cell))).sort((a, b) => score(b) - score(a))[0];
    if (!best || (lit.length && score(best) < SPACING)) break;
    chosen.push(best);
  }
  return { spots: chosen, lit: chosen.length === 0 && existing.length > 0 };
}

export const light: Skill = {
  name: "light",
  description:
    "Put torches up so monsters can't spawn nearby: monsters appear only in darkness, and a torch's light stops them " +
    "spawning for about 12 blocks round it (a home closed off from the sky is dark inside by day too). Inside a home, " +
    "lights it: torches on its side walls and one outside beside the door. Elsewhere, puts `count` torches (default 2, " +
    "up to 6) on the ground or walls round you, spread apart; where it is already lit it says so. Makes the torches " +
    "itself from coal or charcoal and sticks (1 coal and 1 stick make 4 torches): coal from mine_ore coal (a wooden " +
    "pickaxe will do), charcoal by smelting logs. build_shelter also lights a home it finishes or enters, when you carry " +
    "torches, coal or charcoal. Returns how many torches went up and where.",
  args: { count: "number?" },

  async run(ctx: SkillContext, args: Record<string, unknown> = {}): Promise<SkillResult> {
    const bot = ctx.bot;
    const home = (ctx.shelters?.() ?? []).find((spot) => insideSpot(bot, spot));
    if (home) {
      const done = await lightHome(ctx, home);
      if (done.placed === 0 && done.lit) {
        return { status: "success", reason: `the home at ${spotKey(home)} is already lit, inside and at its door`, detail: { placed: 0 } };
      }
      if (done.placed === 0) {
        return { status: "failed", reason: `could not light the home at ${spotKey(home)}: ${done.why ?? "no torch would go up on its walls"}`, detail: { placed: 0 } };
      }
      const where = [done.inside ? `${done.inside} inside` : "", done.door ? "1 beside its door" : ""].filter(Boolean).join(" and ");
      return { status: "success", reason: `put up ${done.placed} torch${done.placed === 1 ? "" : "es"} in the home at ${spotKey(home)}: ${where}`, detail: { placed: done.placed, torchesLeft: torchesHeld(bot) } };
    }

    const count = Math.max(1, Math.min(6, asNumber(args["count"], 2)));
    const { spots, lit } = torchSpots(bot, count);
    if (lit) return { status: "success", reason: "it is already lit round you: there are torches within a few blocks", detail: { placed: 0 } };
    if (spots.length === 0) return { status: "failed", reason: "nowhere in reach to put a torch: no ground or wall beside open air — move to open ground or a wall", detail: { placed: 0 } };
    if ((await makeTorches(ctx, spots.length)) === 0) {
      return {
        status: "failed",
        reason: "no torches, and nothing to make them from: a torch is 1 coal or charcoal and 1 stick (they make 4) — mine_ore coal, or smelt logs into charcoal",
        detail: { placed: 0 },
      };
    }
    const placed: string[] = [];
    for (const cell of spots) {
      if (torchesHeld(bot) === 0) break;
      try {
        if (await placeTorch(bot, cell)) placed.push(`${cell.x},${cell.y},${cell.z}`);
      } catch (error) {
        ctx.log(`could not put a torch at ${cell.x},${cell.y},${cell.z}: ${plainError((error as Error).message)}`);
      }
    }
    if (placed.length === 0) return { status: "failed", reason: "no torch would go up round you here — try open ground or a wall", detail: { placed: 0 } };
    ctx.log(`put up torches at ${placed.join(" ")}`);
    return {
      status: "success",
      reason: `put up ${placed.length} torch${placed.length === 1 ? "" : "es"} at ${placed.join(", ")}: monsters can't spawn where their light reaches`,
      detail: { placed: placed.length, at: placed, torchesLeft: torchesHeld(bot) },
    };
  },
};

/** Steps of a stair or tunnel between torches: light 14 falls to 6 midway, so the passage stays lit end to end. */
export const TRAIL_SPACING = 8;

/**
 * Torches along a stair or a tunnel as it is dug: one every TRAIL_SPACING steps, on a side wall at head height
 * (a wall torch stands in no one's way), from torches carried or made on the spot from coal or charcoal. A lit
 * passage spawns no monsters, so the way back up and the mine stay clear while the agent is away. With none and
 * nothing to make them from it stops trying, and `note` says so. `step` is called after each step dug.
 */
export function torchTrail(ctx: SkillContext): { step: (heading: { dx: number; dz: number }) => Promise<void>; note: () => string; placed: () => number } {
  let since = 0;
  let placed = 0;
  let out = false;
  return {
    async step(heading) {
      if (out || ++since < TRAIL_SPACING) return;
      const bot = ctx.bot;
      if (torchesHeld(bot) === 0 && (await makeTorches(ctx, 4)) === 0) {
        out = true;
        return;
      }
      const feet = bot.entity.position.floored();
      // Beside the head, then a step back: the walls either side of the way dug.
      const sides = [new Vec3(heading.dz, 0, -heading.dx), new Vec3(-heading.dz, 0, heading.dx)];
      const cells = [feet.offset(0, 1, 0), feet.offset(-heading.dx, 1, -heading.dz), feet.offset(-heading.dx, 2, -heading.dz)];
      // On a wall if there is one; where the way opens into a cave, on the floor of the step behind (no collision).
      const tries: Array<[Vec3, Vec3 | undefined]> = [...cells.flatMap((cell) => sides.map((side) => [cell, side.scaled(-1)] as [Vec3, Vec3])), [feet.offset(-heading.dx, 1, -heading.dz), undefined], [feet.offset(-2 * heading.dx, 2, -2 * heading.dz), undefined]];
      for (const [cell, wall] of tries) {
        if (await placeTorch(bot, cell, wall).catch(() => false)) {
          placed++;
          since = 0;
          ctx.log(`put a torch up at ${cell.x},${cell.y},${cell.z} along the way`);
          return;
        }
      }
    },
    note: () => (placed ? `${placed} torch${placed === 1 ? "" : "es"} put up along the way` : out ? "no torches to light the way: none carried, and no coal or charcoal to make them" : ""),
    placed: () => placed,
  };
}
