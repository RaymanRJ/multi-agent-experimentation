import type { Decision, Observation, Policy, Skill } from "../types.js";

/**
 * No model in the loop. Runs a fixed sequence, then ends the episode.
 *
 * This is NOT throwaway scaffolding — it is the control baseline. Without it
 * there is no way to tell whether a model is adding value over a hardcoded plan.
 * Keep it working.
 */
export class ScriptedPolicy implements Policy {
  readonly name = "scripted";
  private index = 0;

  private readonly plan: Decision[] = [
    { skill: "gather_wood", args: { count: 5 }, rationale: "fixed plan: get some wood" },
    { skill: "wait", args: { seconds: 3 }, rationale: "fixed plan: pause so the result is visible" },
  ];

  async decide(_observation: Observation, _skills: Skill[]): Promise<Decision | null> {
    return this.plan[this.index++] ?? null;
  }
}
