import pathfinderPkg from "mineflayer-pathfinder";
import type { Bot } from "mineflayer";
import type { Entity } from "prismarine-entity";
import type { Skill, SkillContext, SkillResult } from "../types.js";
import { countInventory, shownHealth } from "../observe.js";
import { pickUp } from "./pickUp.js";
import { asNumber, withTimeout } from "./util.js";

const { goals } = pathfinderPkg;

/** How far a creature can be and still be found, as far as observations list them. */
export const CREATURE_RANGE = 32;
/** The entity kinds observations list as animals: farm animals, wildlife and fish. */
export const ANIMAL_TYPES = new Set(["animal", "water_creature"]);
const REACH = 3;
const CHASE_MS = 30_000;
const MAX_SKILL_MS = 2 * 60_000;
/** Hunting stops at this health or below: a fight the agent is losing is the model's to rethink. */
const RETREAT_HEALTH = 6;
/** Best first. A sword hits harder and recovers faster than an axe; bare hands last. */
const WEAPONS = [
  "netherite_sword", "diamond_sword", "iron_sword", "stone_sword", "golden_sword", "wooden_sword",
  "netherite_axe", "diamond_axe", "iron_axe", "stone_axe", "golden_axe", "wooden_axe",
];
/** Time for a full-strength blow again (the attack cooldown), by what is held. */
function cooldownMs(weapon: string | undefined): number {
  if (!weapon) return 300;
  return weapon.endsWith("_sword") ? 650 : 1250;
}

/** Players match by username, creatures by kind ("cow", "zombie"). Never the bot itself. */
function matches(bot: Bot, entity: Entity, target: string): boolean {
  if (entity === bot.entity) return false;
  if (entity.type === "player") return entity.username?.toLowerCase() === target;
  return entity.name?.toLowerCase() === target && entity.type !== "other" && entity.type !== "projectile";
}

function nearest(bot: Bot, accept: (entity: Entity) => boolean): Entity | null {
  const here = bot.entity.position;
  let best: Entity | null = null;
  for (const entity of Object.values(bot.entities)) {
    if (!entity || !accept(entity) || entity.position.distanceTo(here) > CREATURE_RANGE) continue;
    if (!best || entity.position.distanceTo(here) < best.position.distanceTo(here)) best = entity;
  }
  return best;
}

/** Walks up to the entity, following it as it moves. Resolves true once within reach. */
async function closeIn(bot: Bot, entity: Entity, reach: number, ms: number): Promise<boolean> {
  bot.pathfinder.setGoal(new goals.GoalFollow(entity, reach - 1), true);
  const until = Date.now() + ms;
  while (Date.now() < until && bot.entities[entity.id]) {
    if (entity.position.distanceTo(bot.entity.position) <= reach) return true;
    await bot.waitForTicks(2);
  }
  return false;
}

/** Picks up what fell, if anything did; a failure here is not the skill's failure. */
async function collect(ctx: SkillContext): Promise<void> {
  await ctx.bot.waitForTicks(10);
  await pickUp.run(ctx, {}).catch(() => undefined);
}

function gainedSince(bot: Bot, before: Record<string, number>): Record<string, number> {
  const now = countInventory(bot);
  const gained: Record<string, number> = {};
  for (const [name, count] of Object.entries(now)) if (count > (before[name] ?? 0)) gained[name] = count - (before[name] ?? 0);
  return gained;
}

export const hunt: Skill = {
  name: "hunt",
  description:
    "Attack and kill a creature or a player: `target` is a kind of animal or mob (cow, sheep, pig, chicken, zombie, " +
    "skeleton, spider…) or another agent's name, and `count` how many to kill (default 1, up to 5). Goes after the nearest " +
    `one within ${CREATURE_RANGE} blocks, with the best sword or axe you hold (bare hands otherwise, much weaker), then ` +
    "picks up what it drops: meat to cook and eat, wool from a sheep, string from a spider. Stops when your health falls " +
    `to ${RETREAT_HEALTH}, or when the target gets away. Returns how many were killed and what was picked up.`,
  args: { target: "string", count: "number?" },

  async run(ctx: SkillContext, rawArgs): Promise<SkillResult> {
    const bot = ctx.bot;
    const target = String(rawArgs["target"] ?? "").trim().toLowerCase();
    if (!target) return { status: "failed", reason: "say what to hunt: `target` is a kind of animal or mob, or an agent's name" };
    if (target === bot.username.toLowerCase()) return { status: "failed", reason: "you cannot attack yourself" };
    const wanted = Math.max(1, Math.min(5, Math.floor(asNumber(rawArgs["count"], 1))));
    const before = countInventory(bot);
    const weapon = WEAPONS.find((name) => (before[name] ?? 0) > 0);
    const held = weapon && bot.inventory.items().find((item) => item.name === weapon);
    if (held) await bot.equip(held, "hand");
    else if (bot.heldItem) await bot.unequip("hand");

    let killed = 0;
    const startedAt = Date.now();
    const report = () => ({ target, killed, weapon: weapon ?? "bare hands", gained: gainedSince(bot, before), health: shownHealth(bot.health) });
    const dead = new Set<number>();
    const onDead = (entity: Entity) => { dead.add(entity.id); };
    bot.on("entityDead", onDead);
    try {
      while (killed < wanted) {
        if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending", detail: report() };
        if (bot.health <= RETREAT_HEALTH) return { status: "aborted", reason: `stopped fighting at health ${shownHealth(bot.health)}`, detail: report() };
        if (Date.now() - startedAt > MAX_SKILL_MS) return { status: "failed", reason: `ran out of time after killing ${killed} of ${wanted}`, detail: report() };
        const prey = nearest(bot, (entity) => matches(bot, entity, target) && !dead.has(entity.id));
        if (!prey) {
          const reason = killed ? `killed ${killed}; no more ${target} within ${CREATURE_RANGE} blocks` : `no ${target} within ${CREATURE_RANGE} blocks — explore to find one`;
          return { status: killed ? "success" : "failed", reason, detail: report() };
        }
        // The chase gives up after CHASE_MS out of reach, counted from the last hit: each hit knocks the
        // target back, so a fixed limit from the start let a player "get away" mid-fight (5 hits, live).
        let chaseEnds = Date.now() + CHASE_MS;
        let lastHit = 0;
        while (!dead.has(prey.id)) {
          if (ctx.shouldStop() || bot.health <= RETREAT_HEALTH) break;
          if (!bot.entities[prey.id] || Date.now() > chaseEnds || Date.now() - startedAt > MAX_SKILL_MS) break;
          if (!(await closeIn(bot, prey, REACH, Math.max(0, chaseEnds - Date.now())))) break;
          const wait = lastHit + cooldownMs(weapon) - Date.now();
          if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
          if (!bot.entities[prey.id] || dead.has(prey.id)) break;
          await bot.lookAt(prey.position.offset(0, prey.height * 0.8, 0), true);
          bot.attack(prey);
          lastHit = Date.now();
          chaseEnds = lastHit + CHASE_MS;
        }
        bot.pathfinder.setGoal(null);
        if (!dead.has(prey.id)) {
          if (ctx.shouldStop() || bot.health <= RETREAT_HEALTH || Date.now() - startedAt > MAX_SKILL_MS) continue; // the checks at the top say why
          return {
            status: killed ? "success" : "failed",
            reason: `the ${target} got away (out of reach for ${CHASE_MS / 1000} seconds, or out of sight)${killed ? ` after ${killed} killed` : ""}`,
            detail: report(),
          };
        }
        killed++;
        await collect(ctx);
      }
      return { status: "success", detail: report() };
    } finally {
      bot.removeListener("entityDead", onDead);
      bot.pathfinder.setGoal(null);
    }
  },
};

/** The sheep's wool byte: its colour in the low four bits, and 0x10 once it has been sheared. */
function sheared(bot: Bot, sheep: Entity): boolean {
  const index = bot.registry.entitiesByName["sheep"]?.metadataKeys?.indexOf("wool") ?? -1;
  const wool = index >= 0 ? (sheep.metadata as unknown[])[index] : undefined;
  return typeof wool === "number" && (wool & 0x10) !== 0;
}

/**
 * Killed, and still showing for its second of death animation. In tbase1 an agent that had just
 * killed a pig was told of a pig 4 blocks away, hunted it, and was told there was none.
 */
export function isDying(bot: Bot, entity: Entity): boolean {
  const index = bot.registry.entitiesByName[entity.name ?? ""]?.metadataKeys?.indexOf("health") ?? -1;
  const health = index >= 0 ? (entity.metadata as unknown[])[index] : undefined;
  return typeof health === "number" && health <= 0;
}

function isBaby(bot: Bot, entity: Entity): boolean {
  const index = bot.registry.entitiesByName[entity.name ?? ""]?.metadataKeys?.indexOf("baby") ?? -1;
  return index >= 0 && (entity.metadata as unknown[])[index] === true;
}

export const shear: Skill = {
  name: "shear",
  description:
    "Shear sheep for their wool, without hurting them: `count` is how many sheep to shear (default 1, up to 8); each " +
    "gives 1 to 3 wool. Needs shears in your inventory (crafted from 2 iron_ingot). Walks to the nearest unsheared " +
    `adult sheep within ${CREATURE_RANGE} blocks and picks up the wool. A sheep's wool grows back after it eats grass. ` +
    "Returns how much wool was gained.",
  args: { count: "number?" },

  async run(ctx: SkillContext, rawArgs): Promise<SkillResult> {
    const bot = ctx.bot;
    const wanted = Math.max(1, Math.min(8, Math.floor(asNumber(rawArgs["count"], 1))));
    const shears = bot.inventory.items().find((item) => item.name === "shears");
    if (!shears) return { status: "failed", reason: "need shears — craft them from 2 iron_ingot" };
    await bot.equip(shears, "hand");
    const before = countInventory(bot);
    const report = () => ({ sheared: done, gained: gainedSince(bot, before) });
    const tried = new Set<number>();
    let done = 0;
    try {
      while (done < wanted) {
        if (ctx.shouldStop()) return { status: "aborted", reason: "the run is ending", detail: report() };
        const sheep = nearest(bot, (e) => e.name === "sheep" && !tried.has(e.id) && !sheared(bot, e) && !isBaby(bot, e));
        if (!sheep) {
          const any = nearest(bot, (e) => e.name === "sheep");
          const reason = any
            ? `${done ? `sheared ${done}; ` : ""}every sheep within ${CREATURE_RANGE} blocks is already sheared or a lamb — wool grows back after a sheep eats grass`
            : `${done ? `sheared ${done}; ` : ""}no sheep within ${CREATURE_RANGE} blocks — explore to find some`;
          return { status: done ? "success" : "failed", reason, detail: report() };
        }
        tried.add(sheep.id);
        if (!(await closeIn(bot, sheep, REACH, CHASE_MS))) continue;
        bot.pathfinder.setGoal(null);
        await bot.lookAt(sheep.position.offset(0, sheep.height * 0.6, 0), true);
        await withTimeout(Promise.resolve(bot.activateEntity(sheep)), 3000, "shearing").catch(() => undefined);
        await bot.waitForTicks(6);
        if (sheared(bot, sheep)) done++;
        await collect(ctx);
        const reequip = bot.inventory.items().find((item) => item.name === "shears");
        if (!reequip) return { status: done ? "success" : "failed", reason: `your shears wore out after ${done} sheep`, detail: report() };
        if (bot.heldItem?.name !== "shears") await bot.equip(reequip, "hand");
      }
      return { status: "success", detail: report() };
    } finally {
      bot.pathfinder.setGoal(null);
    }
  },
};
