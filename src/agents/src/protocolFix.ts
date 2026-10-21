import { createRequire } from "node:module";

/**
 * Paper 1.21.1 sends `declare_recipes` (1290 recipes, ~108 KB) on every join. minecraft-data's
 * 1.21.1 protocol definition (checked through 3.117.0) still lists the recipe type
 * `minecraft:crafting_special_banneraddpattern`, which was removed from the game in 1.20.5, so every
 * recipe type id after it is off by one: smelting recipes parse as something else, and the
 * whole packet fails with
 *   PartialReadError: Read error for undefined : Missing characters in string
 * (protodef logs it and drops the packet; mineflayer reads recipes from minecraft-data, not
 * this packet, so nothing is lost but the noise, and once it coincided with a crash on join).
 *
 * This removes that one stale entry, only when the definition still has exactly the known-bad
 * shape, so a fixed upstream release makes this a no-op. Decoded and verified against a real
 * Paper 1.21.1 packet: with the entry removed all 1290 recipes parse to the last byte.
 *
 * Must run before the first bot is created; skills/index.ts imports it.
 */
const STALE = "minecraft:crafting_special_banneraddpattern";

interface Mapper {
  type: string;
  mappings: Record<string, string>;
}

export function fixDeclareRecipesProtocol(version = "1.21.1"): boolean {
  const require = createRequire(import.meta.url);
  const data = (require("minecraft-data") as (v: string) => { protocol?: Record<string, unknown> } | null)(version);
  const types = (data?.protocol as { play?: { toClient?: { types?: Record<string, unknown> } } } | undefined)?.play?.toClient?.types;
  const packet = types?.["packet_declare_recipes"] as unknown[] | undefined;
  if (!packet) return false;

  // packet_declare_recipes = ["container", [{ name: "recipes", type: ["array", { type: ["container", [name, type, data]] }] }]]
  const fields = (packet[1] as Array<{ name: string; type: unknown[] }>)[0];
  const element = (fields?.type?.[1] as { type?: unknown[] } | undefined)?.type;
  const members = element?.[1] as Array<{ name: string; type: unknown }> | undefined;
  const typeField = members?.find((member) => member.name === "type");
  const mapper = (typeField?.type as [string, Mapper] | undefined)?.[1];
  if (!mapper || !mapper.mappings) return false;

  const entries = Object.entries(mapper.mappings).sort((a, b) => Number(a[0]) - Number(b[0]));
  if (!entries.some(([, name]) => name === STALE)) return false; // already fixed upstream
  const kept = entries.filter(([, name]) => name !== STALE).map(([, name]) => name);
  mapper.mappings = Object.fromEntries(kept.map((name, index) => [String(index), name]));
  return true;
}

fixDeclareRecipesProtocol();
