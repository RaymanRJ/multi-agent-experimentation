/**
 * Day and night, one definition for everything the agent is told: its observation, the interrupts,
 * sleep, and the goal check. These are the game's own times (ticks into the day, 0-24000). Before 19
 * October the observation called 12000 night while sleep called it day, and Haiku said so.
 */

/** Hostile mobs spawn from here: dark enough. */
export const NIGHT_START = 13000;
/** Sunrise: hostiles in the open start to burn. */
export const NIGHT_END = 23000;
export const DAY_LENGTH = 24000;
/** A minute before NIGHT_START: still time to get under cover. */
export const DUSK_START = NIGHT_START - 1200;
/** When the game lets a player into bed: from dusk in clear weather (a little earlier in rain) until just before sunrise. */
export const BEDS_FROM = 12542;
export const BEDS_FROM_IN_RAIN = 12010;
export const BEDS_UNTIL = 23460;

export function isNight(timeOfDay: number): boolean {
  return timeOfDay >= NIGHT_START && timeOfDay < NIGHT_END;
}

/** Ticks until the next night starts; 0 during one. */
export function ticksUntilNight(timeOfDay: number): number {
  if (isNight(timeOfDay)) return 0;
  return timeOfDay < NIGHT_START ? NIGHT_START - timeOfDay : DAY_LENGTH - timeOfDay + NIGHT_START;
}

/** Null when a bed can be used now, or why not: the game refuses outside these hours. */
export function bedRefusal(timeOfDay: number, raining: boolean): string | null {
  const from = raining ? BEDS_FROM_IN_RAIN : BEDS_FROM;
  if (timeOfDay >= from && timeOfDay < BEDS_UNTIL) return null;
  const wait = timeOfDay < from ? from - timeOfDay : DAY_LENGTH - timeOfDay + from;
  const when = timeOfDay < from ? "too early to sleep" : "it is morning, too late to sleep";
  return `${when}: beds can be used from about ${from} (${Math.round(wait / 20)} seconds from now) until ${BEDS_UNTIL}`;
}
