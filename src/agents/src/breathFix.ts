import type { Bot } from "mineflayer";

/**
 * mineflayer 4.39 sets `bot.oxygenLevel` from the air of *any* entity whose metadata arrives
 * (plugins/entities.js, "Breathing"): it never checks that the packet is about the bot. Near water,
 * squid, fish, axolotls (up to 6000 ticks of air, read as 400) and mobs in water all overwrite it.
 * In batch p2 a creature's falling air read as the agent drowning in a dry shelter, at night: the
 * air interrupt sent it outside, where it was killed.
 *
 * This puts the bot's own air back after every update: mineflayer has already stored the packet in
 * the entity's metadata (by index) before it emits "breath". The server sends a player's air only
 * when it changes, so none recorded means full.
 */
export const FULL_AIR = 20;

export function ownAir(bot: Bot): number {
  const index = bot.registry.entitiesByName["player"]?.metadataKeys?.indexOf("air_supply") ?? 1;
  const raw = (bot.entity?.metadata as unknown[] | undefined)?.[index < 0 ? 1 : index];
  return typeof raw === "number" ? Math.round(raw / 15) : FULL_AIR;
}

export function fixOwnAir(bot: Bot): void {
  bot.on("breath", () => {
    bot.oxygenLevel = ownAir(bot);
  });
}
