import type { Skill } from "../types.js";
import { gatherWood } from "./gatherWood.js";
import { wait } from "./wait.js";
import { explore } from "./explore.js";
import { eat } from "./eat.js";
import { flee } from "./flee.js";
import { sleep } from "./sleep.js";

/**
 * The complete vocabulary of goals an agent may pursue. Nothing an agent does
 * happens outside this list.
 *
 * Adding behaviour means adding a skill here — not asking the model to reason
 * more. If the model is being consulted more often to make something work, the
 * skill layer is too thin.
 */
export const SKILLS: Skill[] = [gatherWood, wait, explore, eat, flee, sleep];

export function findSkill(name: string): Skill | undefined {
  return SKILLS.find((skill) => skill.name === name);
}
