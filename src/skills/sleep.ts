import pathfinderPkg from "mineflayer-pathfinder";
import { Vec3 } from "vec3";
import type { Block } from "prismarine-block";
import type { Skill, SkillContext, SkillResult } from "../types.js";
import { opensOnClick, threatened, withTimeout } from "./util.js";
import { BEDS_FROM, BEDS_UNTIL, bedRefusal } from "../daytime.js";
import { enterShelter, half, insideSpot, spotKey, standing, type ShelterSpot } from "./buildShelter.js";

const { goals } = pathfinderPkg;

const BED_RANGE = 32;
const TRAVEL_TIMEOUT_MS = 30_000;
const SLEEP_TIMEOUT_MS = 90_000;
const MONSTER_RANGE = 10;

/** Tries to put a bed from inventory on flat ground next to the bot. */
async function placeBed(ctx: SkillContext): Promise<boolean> {
  const bot = ctx.bot;
  const bed = bot.inventory.items().find((item) => item.name.endsWith("_bed"));
  if (!bed) return false;
  await bot.equip(bed, "hand");
  const origin = bot.entity.position.floored();
  const offsets = [
    new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1),
    new Vec3(2, 0, 0), new Vec3(-2, 0, 0),
  ];
  for (const offset of offsets) {
    const ground = bot.blockAt(origin.plus(offset).offset(0, -1, 0));
    const above = bot.blockAt(origin.plus(offset));
    if (!ground || !above || ground.boundingBox !== "block" || opensOnClick(ground.name) || above.name !== "air") continue;
    try {
      await bot.lookAt(ground.position.offset(0.5, 1, 0.5), true);
      await bot.waitForTicks(2);
      await bot.placeBlock(ground, new Vec3(0, 1, 0));
      await bot.waitForTicks(6); // both halves, before anyone tries to sleep in it
      return true;
    } catch (error) {
      ctx.log(`bed placement at ${ground.position} failed: ${(error as Error).message}`);
    }
  }
  return false;
}

/** The point is in the shelter's ground-floor room. */
function inRoom(spot: ShelterSpot, point: Vec3): boolean {
  const h = half(spot.size ?? 3);
  return Math.abs(point.x - spot.x) <= h && Math.abs(point.z - spot.z) <= h && point.y === spot.y;
}

/**
 * Puts a bed down inside the shelter the bot is in, with both halves in the room and the cell inside
 * the doorway left free: the agent stands on one cell, the bed's foot goes on the next and its head
 * (which points the way the agent faces) beyond it. A large shelter has room for four; a small one, one.
 */
async function placeBedInside(ctx: SkillContext, spot: ShelterSpot): Promise<boolean> {
  const bot = ctx.bot;
  const h = half(spot.size ?? 3);
  const centre = new Vec3(spot.x, spot.y, spot.z);
  const doorway = centre.offset(0, 0, h);
  const free = (cell: Vec3) => inRoom(spot, cell) && !cell.equals(doorway) && bot.blockAt(cell)?.name === "air" && bot.blockAt(cell.offset(0, -1, 0))?.boundingBox === "block";
  const stands: Vec3[] = [centre];
  for (let dx = -h; dx <= h; dx++) for (let dz = -h; dz <= h; dz++) if (dx || dz) stands.push(centre.offset(dx, 0, dz));
  const directions = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, -1), new Vec3(0, 0, 1)];
  for (const stand of stands) {
    if (bot.blockAt(stand)?.name !== "air") continue;
    for (const d of directions) {
      const foot = stand.plus(d), head = stand.plus(d.scaled(2));
      if (!free(foot) || !free(head)) continue;
      const bed = bot.inventory.items().find((item) => item.name.endsWith("_bed"));
      if (!bed) return false;
      try {
        if (!bot.entity.position.floored().equals(stand)) {
          await withTimeout(bot.pathfinder.goto(new goals.GoalBlock(stand.x, stand.y, stand.z)), 10_000, "stepping to the bed's place");
        }
        await bot.equip(bed, "hand");
        // A bed's head points the way the placer faces, so the look must reach the server before the click.
        await bot.lookAt(foot.offset(0.5, 0, 0.5), true);
        await bot.waitForTicks(2);
        await bot.placeBlock(bot.blockAt(foot.offset(0, -1, 0))!, new Vec3(0, 1, 0));
      } catch (error) {
        ctx.log(`bed placement at ${foot} failed: ${(error as Error).message}`);
      }
      // Both halves arrive as separate block updates; sleeping before the second reads as "only half a bed".
      await bot.waitForTicks(6);
      if (bot.blockAt(foot)?.name.endsWith("_bed")) return true;
    }
  }
  return false;
}

/** A player lying in a bed: mineflayer keeps each entity's pose, and 2 is sleeping. */
const asleep = (entity: { metadata?: unknown[] } | undefined) => entity?.metadata?.[6] === 2;

/** Who is not asleep, as far as the agent can see, and what the game's own count said. */
function whoIsAwake(bot: SkillContext["bot"], count: string | null): string {
  const others = Object.keys(bot.players).filter((name) => name !== bot.username);
  const seen = others.filter((name) => bot.players[name]?.entity);
  const awake = seen.filter((name) => !asleep(bot.players[name]!.entity as never));
  const unseen = others.filter((name) => !seen.includes(name));
  const parts = [
    ...(count ? [`the game said ${count} players sleeping`] : []),
    ...(awake.length ? [`not in bed: ${awake.join(", ")}`] : []),
    ...(unseen.length ? [`out of sight, so you cannot tell: ${unseen.join(", ")}`] : []),
  ];
  return parts.length ? ` (${parts.join("; ")})` : "";
}

export const sleep: Skill = {
  name: "sleep",
  description:
    "Sleep through the night in a bed: finds a bed within 32 blocks (or places one from your inventory), walks to it and sleeps " +
    `until morning or until woken. Takes no arguments. Beds can only be used from about ${BEDS_FROM} until ${BEDS_UNTIL} ` +
    "(timeOfDay); outside those hours it fails and says how long to wait. Fails with `no bed nearby or in inventory`, or `monsters nearby` (hostiles within 10 blocks stop you sleeping). " +
    "The night is only skipped when every player is asleep; otherwise this fails and says who was not in bed. " +
    "Inside a shelter, a bed you carry is put down inside it; a bed in a shelter you are not in is reached by going into that shelter and closing it behind you.",
  args: {},

  async run(ctx: SkillContext): Promise<SkillResult> {
    const bot = ctx.bot;
    const refusal = bedRefusal(bot.time.timeOfDay);
    if (refusal) return { status: "failed", reason: refusal, detail: { timeOfDay: bot.time.timeOfDay } };
    const danger = threatened(ctx, MONSTER_RANGE);
    if (danger) return { status: "failed", reason: `monsters nearby: ${danger}` };

    const bedIds = Object.values(bot.registry.blocksByName)
      .filter((b) => b.name.endsWith("_bed"))
      .map((b) => b.id);
    // Another agent may be lying in the nearest bed: take a free one, else put down our own.
    // (mineflayer's parser is on the bot but missing from its type definitions.)
    const occupied = (block: Block) => (bot as unknown as { parseBedMetadata(b: Block): { occupied: boolean | number } }).parseBedMetadata(block).occupied;
    const beds = bot
      .findBlocks({ matching: bedIds, maxDistance: BED_RANGE, count: 32 })
      .map((point) => bot.blockAt(point))
      .filter((block): block is Block => block !== null);
    const taken = beds.filter((block) => occupied(block)).length;
    const known = (ctx.shelters?.() ?? []).filter((spot) => standing(bot, spot));
    let inside = known.find((spot) => insideSpot(bot, spot));
    const shelterOf = (block: Block) => known.find((spot) => inRoom(spot, block.position));
    // A free bed in the shelter the agent is in first; inside one, then its own bed put down there,
    // rather than leaving the shelter for a bed outside it; then the nearest free bed; then its own here.
    const free = beds.filter((block) => !occupied(block));
    const carried = bot.inventory.items().some((item) => item.name.endsWith("_bed"));
    const putDown = async () => {
      const placed = await (inside ? placeBedInside(ctx, inside) : placeBed(ctx)).catch((error: Error) => {
        ctx.log(`placing bed failed: ${error.message}`);
        return false;
      });
      return placed ? bot.findBlock({ matching: bedIds, maxDistance: 6 }) : null;
    };
    let bedBlock = (inside && free.find((block) => shelterOf(block) === inside)) || null;
    if (!bedBlock && !inside) bedBlock = free.find((block) => shelterOf(block)) ?? null;
    // Outside with a bed in hand and a shelter near: take it in, so the team's beds are together and
    // waking up after a death is at home, not at world spawn.
    if (!bedBlock && !inside && carried) {
      const home = known
        .map((spot) => ({ spot, d: bot.entity.position.distanceTo(new Vec3(spot.x + 0.5, spot.y, spot.z + 0.5)) }))
        .filter(({ d }) => d <= BED_RANGE)
        .sort((a, b) => (b.spot.size ?? 3) - (a.spot.size ?? 3) || a.d - b.d)[0]?.spot;
      if (home) {
        const entered = await enterShelter(ctx, home);
        if (!entered.ok) return entered.result;
        ctx.log(`went into the shelter at ${spotKey(home)} to put your bed down there`);
        inside = home;
      }
    }
    if (!bedBlock && inside && carried) bedBlock = await putDown();
    if (!bedBlock) bedBlock = free[0] ?? null;
    if (!bedBlock && carried) bedBlock = await putDown();
    if (!bedBlock) {
      const why = taken ? "every bed nearby is taken by someone sleeping in it, and you have none to put down" : "no bed nearby or in inventory";
      return { status: "failed", reason: `${why} — a bed is crafted from 3 wool and 3 planks, and wool comes from sheep` };
    }

    const { x, y, z } = bedBlock.position;
    // Walking to a bed in a shelter digs through its wall: go in through the shelter's own way, which closes it behind you.
    const home = shelterOf(bedBlock);
    if (home && !insideSpot(bot, home)) {
      const entered = await enterShelter(ctx, home);
      if (!entered.ok) return entered.result;
      ctx.log(`went into the shelter at ${spotKey(home)}, where the bed is, and closed it`);
    }
    try {
      await withTimeout(bot.pathfinder.goto(new goals.GoalNear(x, y, z, 2)), TRAVEL_TIMEOUT_MS, "walking to bed");
    } catch (error) {
      return { status: "failed", reason: `could not reach the bed at ${x},${y},${z}: ${(error as Error).message}` };
    }

    try {
      await bot.sleep(bedBlock);
    } catch (error) {
      const message = (error as Error).message;
      const reason = /monster/i.test(message)
        ? "monsters nearby"
        : /day/i.test(message)
          ? (bedRefusal(bot.time.timeOfDay) ?? "the game says it is not yet time to sleep")
          : /occupied/i.test(message)
            ? "someone else got into the bed first — try sleep again for another bed"
          : /half bed/i.test(message)
            ? `the bed at ${x},${y},${z} is broken: only one half of it is there`
          : /not sleeping/i.test(message)
            ? `you lay down in the bed at ${x},${y},${z} but the game did not let you sleep, and did not say why`
          : `could not sleep: ${message}`;
      return { status: "failed", reason };
    }

    // The game shows sleepers "1/3 players sleeping" over the hotbar; keep the last count it gave.
    let count: string | null = null;
    const onActionBar = (message: { toString(): string }) => {
      const found = /(\d+)\s*\/\s*(\d+)/.exec(message.toString());
      if (found) count = `${found[1]} of ${found[2]}`;
    };
    bot.on("actionBar", onActionBar);
    const woke = new Promise<void>((resolve) => bot.once("wake", () => resolve()));
    try {
      await withTimeout(woke, SLEEP_TIMEOUT_MS, "sleeping");
    } catch {
      // Other players may not be asleep, so the night never skips; get up rather than hang.
      try {
        await bot.wake();
      } catch {
        // already awake
      }
      bot.removeListener("actionBar", onActionBar);
      return {
        status: "failed",
        reason: `you slept, then got up after 90s because it is still night — the night only passes when every player in the world is asleep${whoIsAwake(bot, count)}`,
        detail: { slept: true, health: bot.health },
      };
    }
    bot.removeListener("actionBar", onActionBar);
    // The morning's time update can land a moment after the wake.
    for (let i = 0; i < 40 && !bot.time.isDay; i++) await bot.waitForTicks(1);
    if (!bot.time.isDay) {
      return {
        status: "failed",
        reason: `woke before morning — the night only passes when every player in the world is asleep, or something woke you`,
        detail: { slept: true, health: bot.health },
      };
    }
    return { status: "success", detail: { slept: true, health: bot.health } };
  },
};

/**
 * Putting a bed down without sleeping in it, as a player can. Without this a bed went down only when
 * its carrier slept: in tbase3 Sonnet planned to "place beds" in the team's shelter, slept, and so put
 * down one of its two, while Luna, beside it, had none.
 */
export const placeBedSkill: Skill = {
  name: "place_bed",
  description:
    "Put a bed you carry down without sleeping in it, for you or anyone to sleep in. Inside a shelter, it goes in the shelter; " +
    `outside, with a shelter within ${BED_RANGE} blocks, it goes into the largest one near you; otherwise next to you. ` +
    "Takes no arguments; puts down one bed.",
  args: {},

  async run(ctx: SkillContext): Promise<SkillResult> {
    const bot = ctx.bot;
    if (!bot.inventory.items().some((item) => item.name.endsWith("_bed"))) {
      return { status: "failed", reason: "you carry no bed — a bed is crafted from 3 wool and 3 planks, and wool comes from sheep" };
    }
    const known = (ctx.shelters?.() ?? []).filter((spot) => standing(bot, spot));
    let inside = known.find((spot) => insideSpot(bot, spot));
    if (!inside) {
      const home = known
        .map((spot) => ({ spot, d: bot.entity.position.distanceTo(new Vec3(spot.x + 0.5, spot.y, spot.z + 0.5)) }))
        .filter(({ d }) => d <= BED_RANGE)
        .sort((a, b) => (b.spot.size ?? 3) - (a.spot.size ?? 3) || a.d - b.d)[0]?.spot;
      if (home) {
        const entered = await enterShelter(ctx, home);
        if (!entered.ok) return entered.result;
        inside = home;
      }
    }
    if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending" };
    const placed = await (inside ? placeBedInside(ctx, inside) : placeBed(ctx)).catch((error: Error) => {
      ctx.log(`placing bed failed: ${error.message}`);
      return false;
    });
    if (!placed) {
      return {
        status: "failed",
        reason: inside ? `no room left for a bed in the shelter at ${spotKey(inside)}` : "no flat open ground next to you to put a bed on — move somewhere clearer",
      };
    }
    const bedIds = bot.registry.blocksArray.filter((block) => block.name.endsWith("_bed")).map((block) => block.id);
    const heads = bot.findBlocks({ matching: bedIds, maxDistance: 8, count: 16 }).filter((point) => bot.blockAt(point)?.getProperties()["part"] === "head");
    const where = inside ? `in the shelter at ${spotKey(inside)}` : "next to you";
    return { status: "success", reason: `put a bed down ${where}; ${heads.length} ${heads.length === 1 ? "bed is" : "beds are"} down within 8 blocks`, detail: { beds: heads.length } };
  },
};
