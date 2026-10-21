import pathfinderPkg from "mineflayer-pathfinder";
import type { Skill, SkillContext, SkillResult } from "../types.js";
import { asNumber, threatened, withTimeout } from "./util.js";

const { goals } = pathfinderPkg;

const MIN_DISTANCE = 16;
const MAX_DISTANCE = 96;
const LEG_TIMEOUT_MS = 40_000;
const MAX_FAILED_LEGS = 3;
const MAX_VISITED = 50;
const CANDIDATE_BEARINGS = 12;
const VIEW_RADIUS = 24;
const NOTABLE = ["_log", "_ore", "water", "lava", "crafting_table", "furnace", "chest", "_bed", "sand", "cactus"];

interface Point {
  x: number;
  z: number;
}

/** Where each bot has been, so the next trip heads somewhere new. Keyed by username. */
const visited = new Map<string, Point[]>();

function remember(name: string, point: Point): void {
  const list = visited.get(name) ?? [];
  list.push(point);
  if (list.length > MAX_VISITED) list.shift();
  visited.set(name, list);
}

/** Picks the bearing whose destination is farthest from every place already visited. */
function chooseTarget(name: string, from: Point, distance: number): Point {
  const past = visited.get(name) ?? [];
  let best: Point = { x: from.x + distance, z: from.z };
  let bestScore = -Infinity;
  // A random phase keeps ties (e.g. no history) from always heading east.
  const phase = Math.random() * Math.PI * 2;
  for (let i = 0; i < CANDIDATE_BEARINGS; i++) {
    const angle = phase + (i / CANDIDATE_BEARINGS) * Math.PI * 2;
    const candidate = {
      x: Math.round(from.x + Math.cos(angle) * distance),
      z: Math.round(from.z + Math.sin(angle) * distance),
    };
    const score =
      past.length === 0 ? 0 : Math.min(...past.map((p) => Math.hypot(p.x - candidate.x, p.z - candidate.z)));
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

function summariseView(ctx: SkillContext): Record<string, number> {
  const matching = Object.values(ctx.bot.registry.blocksByName)
    .filter((block) => NOTABLE.some((fragment) => block.name.includes(fragment)))
    .map((block) => block.id);
  const summary: Record<string, number> = {};
  for (const point of ctx.bot.findBlocks({ matching, maxDistance: VIEW_RADIUS, count: 128 })) {
    const block = ctx.bot.blockAt(point);
    if (block) summary[block.name] = (summary[block.name] ?? 0) + 1;
  }
  return summary;
}

export const explore: Skill = {
  name: "explore",
  description:
    "Walk roughly `distance` blocks (clamped to 16-96) in a direction away from places you have already been, " +
    "to find new terrain, trees, ore or water. Returns your new position, how far you actually moved, and a count " +
    "of notable blocks (logs, ores, water, lava, chests...) now within 24 blocks. " +
    "Aborts if a hostile comes within 8 blocks. Fails if the way is blocked repeatedly.",
  args: { distance: "number" },

  async run(ctx: SkillContext, rawArgs): Promise<SkillResult> {
    const distance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, asNumber(rawArgs["distance"], 32)));
    const name = ctx.bot.username;
    const start = ctx.bot.entity.position.clone();
    remember(name, { x: start.x, z: start.z });

    const moved = () => Math.hypot(ctx.bot.entity.position.x - start.x, ctx.bot.entity.position.z - start.z);
    const report = () => {
      const here = ctx.bot.entity.position;
      return {
        position: { x: Math.round(here.x), y: Math.round(here.y), z: Math.round(here.z) },
        moved: Math.round(moved()),
        inView: summariseView(ctx),
      };
    };

    let failedLegs = 0;
    while (moved() < distance * 0.8) {
      if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending", detail: report() };

      const danger = threatened(ctx);
      if (danger) {
        ctx.bot.pathfinder.setGoal(null);
        return { status: "aborted", reason: `stopped exploring because ${danger}`, detail: report() };
      }

      if (failedLegs >= MAX_FAILED_LEGS) {
        return {
          status: "failed",
          reason: `gave up after ${failedLegs} attempts to walk onward were blocked (water, cliffs or walls); try a different place or another goal`,
          detail: report(),
        };
      }

      const here = ctx.bot.entity.position;
      const target = chooseTarget(name, { x: here.x, z: here.z }, Math.max(8, distance - moved()));
      try {
        await withTimeout(
          ctx.bot.pathfinder.goto(new goals.GoalNear(target.x, here.y, target.z, 3)),
          LEG_TIMEOUT_MS,
          "exploring",
        );
      } catch (error) {
        ctx.bot.pathfinder.setGoal(null);
        ctx.log(`explore leg toward ${target.x},${target.z} failed: ${(error as Error).message}`);
        failedLegs++;
      }
      remember(name, { x: ctx.bot.entity.position.x, z: ctx.bot.entity.position.z });
    }

    return { status: "success", detail: report() };
  },
};
