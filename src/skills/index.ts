import type { Skill } from "../types.js";
import { gatherWood } from "./gatherWood.js";
import { wait } from "./wait.js";
import { explore } from "./explore.js";
import { eat } from "./eat.js";
import { flee } from "./flee.js";
import { sleep } from "./sleep.js";
import { craft } from "./craft.js";
import { mineStone } from "./mineStone.js";
import { buildShelter } from "./buildShelter.js";
import { mineOre } from "./mineOre.js";
import { smelt } from "./smelt.js";
import { climbOut, descend, tunnel } from "./underground.js";
import { give } from "./give.js";
import { pickUp } from "./pickUp.js";
import { goTo } from "./goTo.js";
import { tellAgent } from "./tellAgent.js";
import { askAgent } from "./askAgent.js";

/**
 * The complete vocabulary of goals an agent may pursue. Nothing an agent does
 * happens outside this list.
 *
 * Adding behaviour means adding a skill here — not asking the model to reason
 * more. If the model is being consulted more often to make something work, the
 * skill layer is too thin.
 */
export const SKILLS: Skill[] = [
  gatherWood, wait,
  explore, eat, flee, sleep,
  craft, mineStone, buildShelter,
  mineOre, smelt, descend, tunnel, climbOut,
  give, pickUp, goTo,
  tellAgent, askAgent,
];

export function findSkill(name: string): Skill | undefined {
  return SKILLS.find((skill) => skill.name === name);
}
