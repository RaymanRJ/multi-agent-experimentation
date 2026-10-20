import type { Bot } from "mineflayer";
import { wearingOut } from "./toolWear.js";
import type { Message, Observation, Request, ScenarioName } from "./types.js";
import { craftableNow } from "./skills/craft.js";
import { groundAbove, isExposed, UNDERGROUND_MIN } from "./skills/util.js";
import { isNight, ticksUntilNight } from "./daytime.js";
import { ANIMAL_TYPES } from "./skills/creatures.js";
import { droppedNearby } from "./skills/pickUp.js";

const NEARBY_RADIUS = 24;
/** How far away you can tell what another agent is doing. */
export const SIGHT_RADIUS = 32;
const INTERESTING = [
  "_log", "_planks", "stone", "water", "crafting_table", "furnace", "chest",
];

function isInteresting(name: string): boolean {
  return INTERESTING.some((fragment) => name.includes(fragment));
}

export function countInventory(bot: Bot): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of bot.inventory.items()) {
    counts[item.name] = (counts[item.name] ?? 0) + item.count;
  }
  return counts;
}

/**
 * Compresses world state into something a model can read cheaply.
 *
 * Only blocks matching INTERESTING are counted, and only within NEARBY_RADIUS.
 * A full block dump would be both enormous and useless.
 */
export function observe(
  bot: Bot,
  opts: {
    step: number;
    scenario: ScenarioName;
    goal: string;
    recentEvents: string[];
    /** Present only when comms are on. */
    messages?: Message[];
    requests?: Request[];
    stillNeeded?: string[];
    /** Present only when memory is plan or full. */
    plan?: string;
    /** Inside a closed shelter (the agent knows where it built them). */
    inShelter?: boolean;
    /** What other agents last announced doing (see trackActivity); shown only within sight. */
    activities?: Map<string, string>;
  },
): Observation {
  const position = bot.entity.position;

  const nearbyBlocks: Record<string, number> = {};
  const matching = Object.values(bot.registry.blocksByName)
    .filter((block) => isInteresting(block.name))
    .map((block) => block.id);

  const found = bot.findBlocks({
    matching,
    maxDistance: NEARBY_RADIUS,
    count: 256,
  });
  for (const point of found) {
    const block = bot.blockAt(point);
    if (block) nearbyBlocks[block.name] = (nearbyBlocks[block.name] ?? 0) + 1;
  }
  // Ores get their own search: in rock, 256 stone blocks used to fill the count before any ore
  // was reached. Only ore a player could see is counted (see isExposed).
  const oreIds = Object.values(bot.registry.blocksByName)
    .filter((block) => block.name.endsWith("_ore"))
    .map((block) => block.id);
  for (const point of bot.findBlocks({ matching: oreIds, maxDistance: NEARBY_RADIUS, count: 128 })) {
    const block = bot.blockAt(point);
    if (block && isExposed(bot, point)) nearbyBlocks[block.name] = (nearbyBlocks[block.name] ?? 0) + 1;
  }

  const hostiles: Array<{ name: string; distance: number }> = [];
  const animals: Array<{ name: string; distance: number }> = [];
  const otherAgents: Observation["otherAgents"] = [];
  for (const entity of Object.values(bot.entities)) {
    if (!entity || entity === bot.entity) continue;
    const distance = entity.position.distanceTo(position);
    if (entity.type === "hostile" && distance <= NEARBY_RADIUS) {
      hostiles.push({ name: entity.name ?? "unknown", distance: Math.round(distance) });
    }
    if (ANIMAL_TYPES.has(entity.type) && distance <= NEARBY_RADIUS) {
      animals.push({ name: entity.name ?? "unknown", distance: Math.round(distance) });
    }
    if (entity.type === "player" && entity.username) {
      const doing = distance <= SIGHT_RADIUS ? opts.activities?.get(entity.username) : undefined;
      otherAgents.push({ name: entity.username, distance: Math.round(distance), ...(doing ? { doing } : {}) });
    }
  }
  hostiles.sort((a, b) => a.distance - b.distance);
  const itemsOnGround: Record<string, number> = {};
  for (const { name, count } of droppedNearby(bot)) itemsOnGround[name] = (itemsOnGround[name] ?? 0) + count;

  const timeOfDay = bot.time.timeOfDay;
  const overhead = groundAbove(bot);

  const observation: Observation = {
    step: opts.step,
    scenario: opts.scenario,
    goal: opts.goal,
    position: {
      x: Math.round(position.x),
      y: Math.round(position.y),
      z: Math.round(position.z),
    },
    health: Math.round(bot.health),
    food: Math.round(bot.food),
    // What a player sees as the bubble bar: only there while it is going down.
    ...(bot.oxygenLevel !== undefined && bot.oxygenLevel < 20 ? { air: Math.round(bot.oxygenLevel) } : {}),
    // A player in a cave sees the rock overhead; the bot only has its height, which says nothing on its own.
    ...(overhead >= UNDERGROUND_MIN ? { underground: overhead } : {}),
    ...(opts.inShelter ? { inShelter: true } : {}),
    timeOfDay,
    isDay: !isNight(timeOfDay),
    ...(isNight(timeOfDay) ? {} : { ticksUntilNight: ticksUntilNight(timeOfDay) }),
    inventory: countInventory(bot),
    nearbyBlocks,
    hostiles: hostiles.slice(0, 5),
    ...(animals.length ? { animals: animals.sort((a, b) => a.distance - b.distance).slice(0, 5) } : {}),
    otherAgents: otherAgents.sort((a, b) => a.distance - b.distance),
    recentEvents: opts.recentEvents.slice(-6),
  };
  const worn = wearingOut(bot);
  if (Object.keys(worn).length > 0) observation.wearingOut = worn;
  const craftable = craftableNow(bot);
  if (craftable.length > 0) observation.canCraft = craftable;
  if (Object.keys(itemsOnGround).length > 0) observation.itemsOnGround = itemsOnGround;
  if (opts.messages) observation.messages = opts.messages;
  if (opts.requests?.length) observation.requests = opts.requests;
  if (opts.stillNeeded?.length) observation.stillNeeded = opts.stillNeeded;
  if (opts.plan) observation.plan = opts.plan;
  return observation;
}
