/**
 * A stand-in for a mineflayer bot, for testing skills without a server. It carries the real game
 * data (registry, recipes, foods) for the pinned server version, an inventory, and a world made of
 * the blocks a test places; everything else is air. Movement, digging and placing do nothing
 * unless a test overrides them, so a test exercises a skill's own decisions and messages: the
 * checks it makes before acting, how it reads the world, and what it reports.
 */
import { createRequire } from "node:module";
import { Vec3 } from "vec3";
import type { Bot } from "mineflayer";
import type { SkillContext } from "../types.js";

const require = createRequire(import.meta.url);

/** Must match VERSION in compose.yaml. */
export const GAME_VERSION = "1.21.1";

/* eslint-disable @typescript-eslint/no-explicit-any */
const registry: any = require("prismarine-registry")(GAME_VERSION);
const Item: any = require("prismarine-item")(registry);
const Block: any = require("prismarine-block")(registry);
const { Recipe }: any = require("prismarine-recipe")(registry);

export interface FakeWorld {
  inventory?: Record<string, number>;
  /** Uses already spent on a tool in the inventory, by item name. */
  worn?: Record<string, number>;
  /** Blocks by "x,y,z"; anything not listed is air. */
  blocks?: Record<string, string>;
  position?: { x: number; y: number; z: number };
  health?: number;
  food?: number;
  timeOfDay?: number;
  /** Other entities: hostiles, players. */
  entities?: Array<{ name: string; type: string; position: { x: number; y: number; z: number }; username?: string }>;
}

export interface FakeBot {
  bot: Bot;
  /** Every block placed in the world, by "x,y,z". */
  world: Map<string, string>;
  setInventory(items: Record<string, number>): void;
  calls: string[];
  /** Fires the bot's listeners for an event, as the server would. */
  emit(event: string, ...args: unknown[]): void;
}

const key = (p: { x: number; y: number; z: number }) => `${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(p.z)}`;

export function fakeBot(setup: FakeWorld = {}): FakeBot {
  const world = new Map(Object.entries(setup.blocks ?? {}));
  let items: any[] = [];
  const calls: string[] = [];
  const setInventory = (counts: Record<string, number>) => {
    items = Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([name, count], slot) => {
        const def = registry.itemsByName[name];
        if (!def) throw new Error(`fakeBot: unknown item ${name}`);
        const item = new Item(def.id, count, null, null, slot + 9);
        if (setup.worn?.[name]) item.durabilityUsed = setup.worn[name];
        return item;
      });
  };
  setInventory(setup.inventory ?? {});

  const blockAt = (point: { x: number; y: number; z: number }) => {
    const name = world.get(key(point)) ?? "air";
    const def = registry.blocksByName[name];
    if (!def) throw new Error(`fakeBot: unknown block ${name}`);
    const block = Block.fromStateId(def.defaultState ?? def.minStateId, 0);
    block.position = new Vec3(Math.floor(point.x), Math.floor(point.y), Math.floor(point.z));
    return block;
  };

  const position = new Vec3(setup.position?.x ?? 0.5, setup.position?.y ?? 64, setup.position?.z ?? 0.5);
  const findBlocks = (options: { matching: number | number[] | ((b: any) => boolean); maxDistance?: number; count?: number }) => {
    const ids = typeof options.matching === "function" ? null : new Set([options.matching].flat());
    const found: Vec3[] = [];
    for (const [cell, name] of world) {
      const [x, y, z] = cell.split(",").map(Number) as [number, number, number];
      const point = new Vec3(x, y, z);
      if (point.distanceTo(position) > (options.maxDistance ?? 16)) continue;
      const block = blockAt(point);
      if (ids ? !ids.has(block.type) : !(options.matching as (b: any) => boolean)(block)) continue;
      if (name === "air") continue;
      found.push(point);
    }
    found.sort((a, b) => a.distanceTo(position) - b.distanceTo(position));
    return found.slice(0, options.count ?? 1);
  };

  const timeOfDay = setup.timeOfDay ?? 1000;
  const entities: Record<number, any> = {};
  (setup.entities ?? []).forEach((e, i) => {
    entities[i + 1] = { id: i + 1, name: e.name, displayName: e.name, type: e.type, username: e.username, position: new Vec3(e.position.x, e.position.y, e.position.z) };
  });

  const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
  const bot: any = {
    username: "tester",
    registry,
    version: GAME_VERSION,
    entity: { position, velocity: new Vec3(0, 0, 0), onGround: true, height: 1.8 },
    entities,
    health: setup.health ?? 20,
    food: setup.food ?? 20,
    time: { timeOfDay, isDay: timeOfDay < 12000 || timeOfDay >= 23000, age: 0 },
    inventory: {
      items: () => items,
      count: (id: number) => items.filter((item) => item.type === id).reduce((n, item) => n + item.count, 0),
      slots: [],
    },
    heldItem: null,
    // The craft protocol: requests go nowhere, so the grid never fills, as with a server that ignores them.
    _client: { write: (name: string) => calls.push(`packet ${name}`) },
    currentWindow: null,
    blockAt,
    findBlocks,
    findBlock: (options: any) => {
      const [point] = findBlocks({ ...options, count: 1 });
      return point ? blockAt(point) : null;
    },
    recipesAll: (id: number, metadata: number | null, table: unknown) =>
      Recipe.find(id, metadata).filter((recipe: any) => !recipe.requiresTable || table),
    canDigBlock: () => true,
    equip: async (item: any) => {
      calls.push(`equip ${item.name}`);
      bot.heldItem = item;
    },
    consume: async () => {
      calls.push("consume");
    },
    dig: async (block: any) => {
      calls.push(`dig ${block.name}`);
      world.delete(key(block.position));
    },
    placeBlock: async () => {
      calls.push("placeBlock");
      throw new Error("fakeBot: placing is not modelled");
    },
    waitForTicks: async () => {},
    once: () => {},
    on: (event: string, fn: (...args: unknown[]) => void) => listeners.set(event, [...(listeners.get(event) ?? []), fn]),
    removeListener: (event: string, fn: (...args: unknown[]) => void) => listeners.set(event, (listeners.get(event) ?? []).filter((f) => f !== fn)),
    lookAt: async () => {},
    look: async () => {},
    setControlState: (control: string, state: boolean) => calls.push(`${control} ${state ? "on" : "off"}`),
    toss: async (id: number, _metadata: unknown, count: number) => {
      calls.push(`toss ${count} ${registry.items[id]?.name}`);
    },
    chat: (message: string) => calls.push(`chat ${message}`),
    pathfinder: {
      goto: async () => {
        calls.push("goto");
        throw new Error("fakeBot: no path");
      },
      setGoal: () => {},
      setMovements: () => {},
      movements: {},
    },
  };
  const emit = (event: string, ...args: unknown[]) => (listeners.get(event) ?? []).forEach((fn) => fn(...args));
  return { bot: bot as Bot, world, setInventory, calls, emit };
}

/** A SkillContext around a fake bot; `stop` makes shouldStop() true from the start. */
export function context(bot: Bot, stop = false): SkillContext & { logged: string[] } {
  const logged: string[] = [];
  return { bot, log: (message) => logged.push(message), shouldStop: () => stop, logged };
}

/** A flat floor of `block` under y, radius r around the origin. */
export function floor(y: number, block = "grass_block", r = 6): Record<string, string> {
  const cells: Record<string, string> = {};
  for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) cells[`${x},${y - 1},${z}`] = block;
  return cells;
}
