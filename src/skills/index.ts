import type { Skill } from "../types.js";
import { gatherWood } from "./gatherWood.js";
import { wait } from "./wait.js";

/**
 * The complete vocabulary of goals an agent may pursue. Nothing an agent does
 * happens outside this list.
 *
 * Adding behaviour means adding a skill here — not asking the model to reason
 * more. If the model is being consulted more often to make something work, the
 * skill layer is too thin.
 */
export const SKILLS: Skill[] = [gatherWood, wait];

export function findSkill(name: string): Skill | undefined {
  return SKILLS.find((skill) => skill.name === name);
}
