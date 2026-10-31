import type { Bot } from "mineflayer";
import { Vec3 } from "vec3";

/**
 * A snapshot of the blocks round an agent whose walk or dig has just failed, for the run log only: the
 * model never sees it. Twice an agent stayed stuck underground beside a lake for most of a run (tluna6b, and
 * two agents in tluna9a at -2,58,43) in a pocket of air the logs could not show: a fresh world has solid
 * water there, the pocket was made during the run, and rebuilding it from the logs failed.
 */
export interface Surroundings {
  /** The bot's exact position. */
  at: { x: number; y: number; z: number };
  onGround: boolean;
  /** What is at its feet, at its head and under it, by name. */
  feet: string;
  head: string;
  below: string;
  /** West edge and north edge of the rows: the first character of each row is x0, the first row z0. */
  x0: number;
  z0: number;
  /** By height, top first: one string per z, north to south; one character per x, west to east. */
  layers: Array<{ y: number; rows: string[] }>;
  legend: string;
}

const REACH = 4;
const UP = 3;
const DOWN = 2;
const LEGEND = ". air  ~ water  L lava  @ the bot's feet  B bed  D door  c cobblestone  p planks  T crafting table  F furnace  C chest  o ore  # anything else solid  , not solid";

function symbol(name: string | undefined, solid: boolean): string {
  if (!name) return "?";
  if (name === "air" || name === "cave_air" || name === "void_air") return ".";
  if (name === "water" || name === "bubble_column") return "~";
  if (name === "lava") return "L";
  if (name.endsWith("_bed")) return "B";
  if (name.endsWith("_door")) return "D";
  if (name === "cobblestone") return "c";
  if (name.endsWith("_planks")) return "p";
  if (name === "crafting_table") return "T";
  if (name === "furnace") return "F";
  if (name === "chest") return "C";
  if (name.endsWith("_ore")) return "o";
  return solid ? "#" : ",";
}

export function surroundings(bot: Bot): Surroundings {
  const exact = bot.entity.position;
  const feet = exact.floored();
  const name = (cell: Vec3) => bot.blockAt(cell)?.name ?? "unloaded";
  const layers: Surroundings["layers"] = [];
  for (let dy = UP; dy >= -DOWN; dy--) {
    const rows: string[] = [];
    for (let dz = -REACH; dz <= REACH; dz++) {
      let row = "";
      for (let dx = -REACH; dx <= REACH; dx++) {
        const block = bot.blockAt(feet.offset(dx, dy, dz));
        row += dx === 0 && dy === 0 && dz === 0 ? "@" : symbol(block?.name, block?.boundingBox === "block");
      }
      rows.push(row);
    }
    layers.push({ y: feet.y + dy, rows });
  }
  return {
    at: { x: Number(exact.x.toFixed(2)), y: Number(exact.y.toFixed(2)), z: Number(exact.z.toFixed(2)) },
    onGround: bot.entity.onGround,
    feet: name(feet),
    head: name(feet.offset(0, 1, 0)),
    below: name(feet.offset(0, -1, 0)),
    x0: feet.x - REACH,
    z0: feet.z - REACH,
    layers,
    legend: LEGEND,
  };
}

const MOVING = new Set(["go_to", "explore", "climb_out", "descend", "tunnel", "build_shelter", "sleep", "place_bed", "pick_up", "mine_ore", "mine_stone", "flee", "gather_wood", "hunt", "give"]);
const STUCK = /timed out|stuck|no way|blocked|could not (step|reach|get|walk|go|swim|climb)|every way|unsafe|in water|walled|No path/i;

/** A failure that says the agent could not get somewhere: the moment worth a snapshot. Pure, for testing. */
export function looksStuck(skill: string, status: string, text: string): boolean {
  if (status === "success" || !MOVING.has(skill) || /^interrupted/i.test(text)) return false;
  return STUCK.test(text);
}
