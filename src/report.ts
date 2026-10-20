import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { pathToFileURL } from "node:url";
import minimist from "minimist";
import type { EndReason, LoggedStep, MemoryMode, SkillStatus, Stance } from "./types.js";
import { GOALS, SCENARIOS, TEAM_GOALS, goalTask } from "./scenario.js";
import { costUSD } from "./backends/pricing.js";

export interface MilestoneData {
  step: number;
  gameTicks: number; // accumulated game ticks
  wallMs: number; // wall-clock time in milliseconds from first step
  decisions: number; // count of decisions made so far
  tokens: number; // total tokens (in + out)
  costUSD: number | "unknown"; // cost so far
}

export type MilestoneName = "logs" | "wooden_pickaxe" | "stone" | "stone_pickaxe" | "shelter" | "survived_night";

export interface RunSummary {
  file: string;
  agentName: string;
  brain: string; // "backend:model" or "scripted"
  scenario: string;
  goal: string;
  goalName: string; // preset key, "scenario default", or "custom"
  stepsLogged: number;
  howEnded: EndReason | "policy ended" | "step limit / stopped";
  skillCounts: Record<string, { success: number; failed: number; aborted: number }>;
  deaths: number;
  /** The lowest food level (0-20) seen in any observation; 20 when nothing was logged. */
  lowestFood: number;
  /** Hits on other agents and from them, by the other agent's name (from each step's `hits`). */
  hitsGiven: Record<string, number>;
  hitsTaken: Record<string, number>;
  goalMet: boolean | "n/a";
  /** When and after how many game ticks the goal was met; null if it wasn't. */
  goalMetAt: string | null;
  ticksToGoal: number | null;
  /** Null for the scripted baseline, which has no memory or stance. */
  memory: MemoryMode | null;
  comms: boolean | null;
  /** Whether the model was told what its goal still lacked. Null for the scripted baseline. */
  progress: boolean | null;
  /** "legacy" for logs from before stances, whose prompt leaned collaborative. */
  stance: Stance | "legacy" | null;
  /**
   * Success by the run's own stance: neutral counts the goal met, collaborative counts the
   * whole team (everyone in the episode) meeting it, competitive counts being first to it.
   * Set by scoreStances(); equals goalMet until then.
   */
  outcome: boolean | "n/a";
  nightReached: boolean;
  survivedNight: boolean | "unknown";
  decisions: number;
  decisionMsMedian: number;
  decisionMsP90: number;
  totalModelCalls: number;
  retries: number;
  /** Provider retries (rate limits, overload, network) and the seconds spent waiting on them. */
  providerRetries: number;
  retryWaitS: number;
  /** Times the model said "done" before the preset goal was met and was told so. */
  doneRefused: number;
  fallbackWaits: number;
  tokensIn: number;
  /** Of tokensIn: read from the provider's prompt cache. */
  tokensCached: number;
  tokensOut: number;
  costUSD: number | "unknown";
  milestones: Record<MilestoneName, MilestoneData | null>;
  furthestMilestone: MilestoneName | null;
  /** Shared by agents launched together; null for logs older than episode IDs. */
  episode: string | null;
  /**
   * Whether this run can be compared. "brain unavailable" (no credits, bad key) is the
   * provider's failure, not the model's; "episode incomplete" means another agent in the
   * same episode lost its brain, so this run played a world with one agent missing.
   */
  validity: "valid" | "brain unavailable" | "episode incomplete" | "lost connection";
}

/**
 * Scores each run by its stance's rule, across the agents of its episode. A collaborative
 * run succeeds only when every collaborative agent in the episode met the goal; a competitive
 * run succeeds only when it met the goal first. An agent alone in its episode is scored as
 * neutral would be.
 */
export function scoreStances(summaries: RunSummary[]): void {
  const byEpisode = new Map<string, RunSummary[]>();
  for (const s of summaries) {
    if (!s.episode) continue;
    byEpisode.set(s.episode, [...(byEpisode.get(s.episode) ?? []), s]);
  }
  for (const s of summaries) {
    if (s.goalMet === "n/a") continue;
    const peers = (s.episode ? byEpisode.get(s.episode) : undefined)?.filter((p) => p.stance === s.stance) ?? [s];
    if (s.stance === "collaborative") {
      s.outcome = peers.every((p) => p.goalMet === true);
    } else if (s.stance === "competitive") {
      const times = peers.map((p) => p.goalMetAt).filter((at): at is string => at !== null).sort();
      s.outcome = s.goalMetAt !== null && s.goalMetAt === times[0];
    } else {
      s.outcome = s.goalMet;
    }
  }
}

/** Flags every other run in an episode where some agent's brain became unavailable. */
export function markEpisodes(summaries: RunSummary[]): void {
  const broken = new Set(summaries.filter((s) => s.validity === "brain unavailable" && s.episode).map((s) => s.episode));
  for (const s of summaries) {
    if (s.validity === "valid" && s.episode && broken.has(s.episode)) s.validity = "episode incomplete";
  }
}

/**
 * Compute new events per step by aligning consecutive recentEvents windows.
 * recentEvents is a rolling window of the last ~6 events. To dedupe, find the
 * largest overlap between the previous window and current window, then new events
 * are everything after that overlap.
 *
 * KNOWN LIMITS (documented for cost reasoning):
 * - If 6+ events occur in one step, the window can't show them all; only the
 *   most recent 6 are captured (earlier events in that step are lost).
 * - Window alignment can be ambiguous when strings are identical (e.g., "you died"
 *   repeated). We prefer the largest overlap (undercounts deaths in that edge case)
 *   rather than the smallest overlap (which would overcount).
 *
 * Returns: array of arrays, one per step, containing the new events for that step.
 */
export function newEventsPerStep(steps: LoggedStep[]): string[][] {
  const result: string[][] = [];
  let prevWindow: string[] = [];

  for (const step of steps) {
    const obs = step?.observation;
    const currentWindow = (obs?.recentEvents && Array.isArray(obs.recentEvents)) ? obs.recentEvents : [];

    if (prevWindow.length === 0) {
      // First step: all events are new
      result.push([...currentWindow]);
    } else {
      // Find the largest k such that the last k entries of prevWindow
      // equal the first k entries of currentWindow (prefer largest overlap)
      let overlapSize = 0;
      const maxK = Math.min(prevWindow.length, currentWindow.length);
      for (let k = maxK; k >= 1; k--) {
        let match = true;
        for (let i = 0; i < k; i++) {
          if (prevWindow[prevWindow.length - k + i] !== currentWindow[i]) {
            match = false;
            break;
          }
        }
        if (match) {
          overlapSize = k;
          break; // Found the largest overlap, stop searching
        }
      }

      // New events are everything after the overlap
      const newEvents = currentWindow.slice(overlapSize);
      result.push(newEvents);
    }

    prevWindow = [...currentWindow];
  }

  return result;
}

/**
 * Summarize a sequence of LoggedSteps into a RunSummary.
 *
 * howEnded detection:
 * - "policy ended": last step has decision null AND result null
 * - "brain failed": last 3 steps all have decision null with result.status "failed"
 * - otherwise: "step limit / stopped"
 *
 * Deaths are counted from new events per step (deduplicated by window alignment).
 *
 * goalMet:
 * (judged per task: "tools-guided" is judged as "tools")
 * - "shelter": met if any build_shelter step has result.status "success"
 * - "tools": met if craft step with args.item "stone_pickaxe" succeeded,
 *   or stone_pickaxe appears in any inventory
 * - otherwise: "n/a"
 *
 * survivedNight:
 * - true: a night ended with the agent alive through all of it (a later observation has isDay
 *   true), or an outpost run met its goal, which the agent checks itself and ends at that sunrise
 * - false: no night was survived, and the agent died during one
 * - "unknown": night never came, or the run ended during the night without a death there
 *   (ending in the dark is not dying — it just leaves the question open)
 *
 * Milestones are reached in order: logs → wooden_pickaxe → stone → stone_pickaxe → shelter → survived_night
 * Each milestone records the step, accumulated game ticks, wall-clock time, decision count, tokens, and cost.
 * gameTicks wraps at 24000; we accumulate the delta each step. Sleeping/day skips are not accounted for.
 */
export function summarizeRun(steps: LoggedStep[], file: string): RunSummary {
  const filename = basename(file);
  // Format: 2026-10-09T14-52-12-575Z-agent_scripted.jsonl
  // Extract from the Z onwards: Z-agent_scripted.jsonl
  const match = filename.match(/Z-(.+)\.jsonl$/);
  const agentName = match?.[1] ?? filename.replace(".jsonl", "");
  const agentNamePart = agentName.replace(/^agent_/, "");

  // Observation data from first step
  const firstObs = steps[0]?.observation;
  if (!firstObs) {
    throw new Error(`No observations in ${file}`);
  }

  const scenario = firstObs.scenario;
  const goalText = firstObs.goal;

  const config = steps[0]?.config;

  // Determine goalName
  let goalName = "custom";
  for (const [key, val] of Object.entries(GOALS)) {
    if (val === goalText) {
      goalName = key;
      break;
    }
  }
  if (goalName === "custom" && goalText === SCENARIOS[scenario].goal) {
    goalName = "scenario default";
  }

  // Brain from first ModelCall
  let brain = "scripted";
  for (const step of steps) {
    if (step.calls && Array.isArray(step.calls) && step.calls.length > 0) {
      const call = step.calls[0];
      if (call) {
        brain = `${call.backend}:${call.model}`;
        break;
      }
    }
  }

  // Skill counts
  const skillCounts: Record<string, { success: number; failed: number; aborted: number }> = {};
  for (const step of steps) {
    if (step.result) {
      const skill = step.decision?.skill || "unknown";
      if (!skillCounts[skill]) {
        skillCounts[skill] = { success: 0, failed: 0, aborted: 0 };
      }
      const status = step.result.status as SkillStatus;
      skillCounts[skill][status]++;
    }
  }

  const lowestFood = Math.min(20, ...steps.map((step) => step.observation?.food ?? 20));
  const hitsGiven: Record<string, number> = {};
  const hitsTaken: Record<string, number> = {};
  const self = agentNamePart.toLowerCase();
  for (const step of steps) {
    for (const hit of step.hits ?? []) {
      if (hit.by.toLowerCase() === self) hitsGiven[hit.on] = (hitsGiven[hit.on] ?? 0) + 1;
      else if (hit.on.toLowerCase() === self) hitsTaken[hit.by] = (hitsTaken[hit.by] ?? 0) + 1;
    }
  }

  // Deaths: count from new events per step (deduplicated by window alignment)
  let deaths = 0;
  const newEvents = newEventsPerStep(steps);
  for (const eventList of newEvents) {
    for (const event of eventList) {
      if (event.includes("died") || event.includes("respawned")) {
        deaths++;
      }
    }
  }

  // howEnded
  // Logs written since the agent records `ended` say it directly; older ones are inferred.
  let howEnded: RunSummary["howEnded"] = "step limit / stopped";
  const recorded = steps[steps.length - 1]?.ended;
  if (recorded) {
    howEnded = recorded;
  } else if (steps.length > 0) {
    const last = steps[steps.length - 1];
    if (last && last.decision === null && last.result === null) {
      howEnded = "policy ended";
    } else {
      // Check last 3 steps for "brain failed"
      let failedCount = 0;
      for (let i = Math.max(0, steps.length - 3); i < steps.length; i++) {
        const s = steps[i];
        if (s && s.decision === null && s.result && s.result.status === "failed") {
          failedCount++;
        }
      }
      if (failedCount === 3) {
        howEnded = "brain failed";
      }
    }
  }

  // Goal outcome
  let goalMet: boolean | "n/a" = "n/a";
  let goalStep: LoggedStep | undefined;
  const task = goalTask(goalName);
  if (task === "shelter") {
    goalMet = false;
    for (const step of steps) {
      if (step.decision && step.decision.skill === "build_shelter" && step.result && step.result.status === "success") {
        goalMet = true;
        goalStep = step;
        break;
      }
    }
  } else if (task === "tools") {
    goalMet = false;
    // Check for successful craft of stone_pickaxe
    for (const step of steps) {
      if (
        step.decision &&
        step.decision.skill === "craft" &&
        step.decision.args &&
        (step.decision.args as Record<string, unknown>).item === "stone_pickaxe" &&
        step.result &&
        step.result.status === "success"
      ) {
        goalMet = true;
        goalStep = step;
        break;
      }
    }
    // Or check inventory for stone_pickaxe
    if (!goalMet) {
      for (const step of steps) {
        if (step.observation && step.observation.inventory && step.observation.inventory.stone_pickaxe) {
          goalMet = true;
          goalStep = step;
          break;
        }
      }
    }
  }

  if (task === "outpost" || task === "iron" || task === "diamond" || TEAM_GOALS.has(task)) {
    // Judged live by the agent's goal check (outpost needs the run's history, a team goal the
    // teammates' inventories); the log records it.
    const last = steps[steps.length - 1];
    goalMet = last?.ended === "goal met";
    if (goalMet) goalStep = last;
  }

  // A night survived alive: a death at night loses that night (as in the agent's own goal check).
  const nightReached = steps.some((s) => s.observation && !s.observation.isDay);
  const night = nightSurvived(steps, newEvents, task === "outpost" && goalMet === true);
  const survivedNight: boolean | "unknown" = night.at !== null ? true : night.diedAtNight ? false : "unknown";

  // Decisions and timing
  const decisions = steps.filter((s) => s.decision !== null).length;
  const decisionMsValues: number[] = steps
    .map((s) => s.decisionMs)
    .filter((ms): ms is number => typeof ms === "number" && ms > 0)
    .sort((a, b) => a - b);
  const decisionMsMedian: number = decisionMsValues.length > 0 ? (decisionMsValues[Math.floor(decisionMsValues.length / 2)] ?? 0) : 0;
  const decisionMsP90: number =
    decisionMsValues.length > 0 ? (decisionMsValues[Math.floor(decisionMsValues.length * 0.9)] ?? 0) : 0;

  // Model calls and tokens
  let totalModelCalls = 0;
  let retries = 0;
  let providerRetries = 0;
  let retryWaitMs = 0;
  let fallbackWaits = 0;
  let tokensIn = 0;
  let tokensCached = 0;
  let tokensOut = 0;
  for (const step of steps) {
    const calls = Array.isArray(step.calls) ? step.calls : [];
    totalModelCalls += calls.length;
    // Retries are calls beyond the first per step
    if (calls.length > 1) {
      retries += calls.length - 1;
    }
    for (const call of calls) {
      tokensIn += call.inputTokens;
      tokensCached += call.cacheReadTokens ?? 0;
      tokensOut += call.outputTokens;
      providerRetries += call.providerRetries ?? 0;
      retryWaitMs += call.retryWaitMs ?? 0;
    }
    // Fallback waits
    if (step.decision?.rationale?.startsWith("fallback:")) {
      fallbackWaits++;
    }
  }

  // Cost
  let totalCost = 0;
  let unknownModel = false;
  for (const step of steps) {
    const calls = Array.isArray(step.calls) ? step.calls : [];
    for (const call of calls) {
      const cost = costUSD(call);
      if (isNaN(cost)) {
        unknownModel = true;
      } else {
        totalCost += cost;
      }
    }
  }
  const costUsdValue: number | "unknown" = unknownModel ? "unknown" : totalCost;

  // Compute milestones
  const milestones = computeMilestones(steps, newEvents, night.at);
  const milestonesOrder: MilestoneName[] = ["logs", "wooden_pickaxe", "stone", "stone_pickaxe", "shelter", "survived_night"];
  let furthestMilestone: MilestoneName | null = null;
  for (const name of milestonesOrder) {
    if (milestones[name]) {
      furthestMilestone = name;
    }
  }

  return {
    file,
    agentName: agentNamePart,
    brain,
    scenario,
    goal: goalText,
    goalName,
    stepsLogged: steps.length,
    howEnded,
    skillCounts,
    deaths,
    lowestFood,
    hitsGiven,
    hitsTaken,
    goalMet,
    goalMetAt: goalStep?.at ?? null,
    ticksToGoal: goalStep?.ticks ?? null,
    memory: brain === "scripted" ? null : (config?.memory ?? null),
    comms: brain === "scripted" ? null : (config?.comms ?? null),
    progress: brain === "scripted" ? null : (config ? (config.progress ?? false) : null),
    stance: brain === "scripted" ? null : (config ? (config.stance ?? "legacy") : null),
    outcome: goalMet,
    nightReached,
    survivedNight,
    decisions,
    decisionMsMedian,
    decisionMsP90,
    totalModelCalls,
    retries,
    providerRetries,
    retryWaitS: Math.round(retryWaitMs / 1000),
    doneRefused: steps.filter((s) => s.events?.includes("done refused")).length,
    fallbackWaits,
    tokensIn,
    tokensCached,
    tokensOut,
    costUSD: costUsdValue,
    milestones,
    furthestMilestone,
    episode: steps[0]?.config?.episode ?? null,
    validity: howEnded === "brain unavailable" ? "brain unavailable" : lostConnection(steps, howEnded) ? "lost connection" : "valid",
  };
}

/**
 * Compute milestones reached during the run.
 * Milestones are tracked in order: logs → wooden_pickaxe → stone → stone_pickaxe → shelter → survived_night
 */
function computeMilestones(steps: LoggedStep[], newEvents: string[][], nightAt: number | null): Record<MilestoneName, MilestoneData | null> {
  const result: Record<MilestoneName, MilestoneData | null> = {
    logs: null,
    wooden_pickaxe: null,
    stone: null,
    stone_pickaxe: null,
    shelter: null,
    survived_night: null,
  };

  const firstDate = steps[0]?.at ? new Date(steps[0].at).getTime() : 0;
  let cumulativeTokens = 0;
  let cumulativeCost: number | "unknown" = 0;
  let cumulativeGameTicks = 0;
  let lastTimeOfDay = steps[0]?.observation?.timeOfDay ?? 0;
  let decisionsSoFar = 0;
  let lastRecordedUnknown = false;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (!step) continue;

    const obs = step.observation;
    if (!obs) continue;

    // Update cumulative values BEFORE checking milestones
    const calls = Array.isArray(step.calls) ? step.calls : [];
    for (const call of calls) {
      cumulativeTokens += call.inputTokens + call.outputTokens;
      const callCost = costUSD(call);
      if (isNaN(callCost)) {
        lastRecordedUnknown = true;
        cumulativeCost = "unknown";
      } else if (cumulativeCost !== "unknown") {
        cumulativeCost = (cumulativeCost as number) + callCost;
      }
    }

    if (step.decision) {
      decisionsSoFar++;
    }

    // Accumulate game ticks with wrapping at 24000 (BEFORE checking milestones)
    const currentTimeOfDay = obs.timeOfDay ?? 0;
    if (i > 0) {
      // Only update delta after first step
      if (currentTimeOfDay < lastTimeOfDay) {
        // Wrapped around
        cumulativeGameTicks += 24000 - lastTimeOfDay + currentTimeOfDay;
      } else {
        cumulativeGameTicks += currentTimeOfDay - lastTimeOfDay;
      }
    }
    lastTimeOfDay = currentTimeOfDay;

    const wallMs = new Date(step.at).getTime() - firstDate;

    // Logs written since the agent records world age use it: exact, and sleeping can't skip it.
    const ticksAt = typeof step.ticks === "number" ? step.ticks : cumulativeGameTicks;

    // What the bot held at any point in this step: before the decision, and after the skill
    // (inventoryAfter, in newer logs) — otherwise the final step's result would never count.
    const held: Record<string, number> = { ...(obs.inventory ?? {}) };
    for (const [name, n] of Object.entries(step.inventoryAfter ?? {})) held[name] = Math.max(held[name] ?? 0, n);

    // Check milestones in order. Any wood counts (oak_log, dark_oak_log, birch_log, ...).
    if (!result.logs && Object.entries(held).some(([name, n]) => name.endsWith("_log") && n > 0)) {
      result.logs = { step: step.step, gameTicks: ticksAt, wallMs, decisions: decisionsSoFar, tokens: cumulativeTokens, costUSD: cumulativeCost };
    }

    if (!result.wooden_pickaxe) {
      if (held["wooden_pickaxe"]) {
        result.wooden_pickaxe = { step: step.step, gameTicks: ticksAt, wallMs, decisions: decisionsSoFar, tokens: cumulativeTokens, costUSD: cumulativeCost };
      }
    }

    if (!result.stone) {
      if (held["cobblestone"]) {
        result.stone = { step: step.step, gameTicks: ticksAt, wallMs, decisions: decisionsSoFar, tokens: cumulativeTokens, costUSD: cumulativeCost };
      }
    }

    if (!result.stone_pickaxe) {
      if (held["stone_pickaxe"]) {
        result.stone_pickaxe = { step: step.step, gameTicks: ticksAt, wallMs, decisions: decisionsSoFar, tokens: cumulativeTokens, costUSD: cumulativeCost };
      }
    }

    if (!result.shelter && step.decision?.skill === "build_shelter" && step.result?.status === "success") {
      result.shelter = { step: step.step, gameTicks: ticksAt, wallMs, decisions: decisionsSoFar, tokens: cumulativeTokens, costUSD: cumulativeCost };
    }

    if (!result.survived_night && i === nightAt) {
      result.survived_night = { step: step.step, gameTicks: ticksAt, wallMs, decisions: decisionsSoFar, tokens: cumulativeTokens, costUSD: cumulativeCost };
    }
  }

  return result;
}

/**
 * The index of the step at which a night was first survived alive, and whether the agent died
 * during a night. A death at night loses that night; the next one counts from its start. A run
 * whose goal needs the night (outpost) and was met has survived it on its last step: the agent
 * checks that itself, and the run ends at that sunrise, before any daytime observation.
 */
/**
 * The connection to the game server dropped, so the run says nothing about the model. Logs since
 * 19 October record it as "disconnected"; before that the agent crashed without an end, and the
 * last step shows the game going silent (batch p3, Opus: "Timeout waiting for 4 ticks").
 */
export function lostConnection(steps: LoggedStep[], howEnded: RunSummary["howEnded"]): boolean {
  if (howEnded === "disconnected") return true;
  if (howEnded !== "step limit / stopped") return false;
  const reason = steps[steps.length - 1]?.result?.reason ?? "";
  return /Timeout waiting for \d+ ticks|client timed out|lost the connection/.test(reason);
}

export function nightSurvived(steps: LoggedStep[], newEvents: string[][], goalMetWithNight: boolean): { at: number | null; diedAtNight: boolean } {
  let inNight = false;
  let forfeited = false;
  let diedAtNight = false;
  let lastNightLost = false;
  let prevDark = false;
  for (let i = 0; i < steps.length; i++) {
    const obs = steps[i]?.observation;
    if (!obs) continue;
    const dark = !obs.isDay;
    const died = (newEvents[i] ?? []).some((e) => e.includes("died") || e.includes("respawned"));
    // The death happened between the last observation and this one: at night if either was dark.
    if (died && (dark || prevDark)) {
      forfeited = true;
      diedAtNight = true;
    }
    if (dark) {
      if (!inNight && !forfeited) lastNightLost = false; // a fresh night
      inNight = true;
    } else if (inNight) {
      if (!forfeited) return { at: i, diedAtNight };
      inNight = false;
      forfeited = false;
      lastNightLost = true;
    }
    prevDark = dark;
  }
  // Not if its last night had a death in it: logs from before the agent's check was fixed
  // (19 October) could record "goal met" after one.
  if (goalMetWithNight && steps.length && !forfeited && !lastNightLost) return { at: steps.length - 1, diedAtNight };
  return { at: null, diedAtNight };
}

/**
 * Parse a JSONL file, yielding LoggedStep objects.
 * Skip malformed lines with a warning on stderr.
 */
function* readJsonl(path: string): Generator<LoggedStep> {
  const content = readFileSync(path, "utf-8");
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const lineStr = lines[i];
    if (!lineStr) continue;
    const line = lineStr.trim();
    if (!line) continue;
    try {
      yield JSON.parse(line) as LoggedStep;
    } catch (err) {
      console.error(`Warning: malformed line ${i + 1} in ${path}: ${(err as Error).message}`);
    }
  }
}

/**
 * CLI: print aligned text table of runs.
 * Options: --last N (default 20), --json (full summaries), positional file paths.
 */
/**
 * 95% Wilson score interval for k successes in n runs. Unlike k/n ± 1.96·SE it stays inside
 * [0, 1] and is honest at small n: 3/3 is "somewhere between 44% and 100%".
 */
export function wilson(k: number, n: number, z = 1.96): [number, number] {
  if (n === 0) return [0, 1];
  const p = k / n;
  const denom = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return [Math.max(0, centre - half), Math.min(1, centre + half)];
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export interface ConditionRow {
  brain: string;
  memory: string;
  progress: string;
  stance: string;
  goal: string;
  scenario: string;
  runs: number;
  successes: number;
  ci: [number, number];
  /** Medians over successful runs only: how long success took when it came. */
  ticksToGoal: number | null;
  decisions: number | null;
  /** Medians over all runs. */
  tokensIn: number | null;
  decisionMs: number | null;
  costUSD: number | "unknown";
  /** Runs left out: brain unavailable, or another agent in the episode lost its brain. */
  excluded: number;
}

/** One row per brain x memory x progress x stance x goal x scenario, scoring each run by its outcome. */
export function byCondition(summaries: RunSummary[]): ConditionRow[] {
  const groups = new Map<string, RunSummary[]>();
  for (const s of summaries) {
    const progress = s.progress === null ? "-" : s.progress ? "on" : "off";
    const key = [s.brain, s.memory ?? "-", progress, s.stance ?? "-", s.goalName, s.scenario].join("\u0000");
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  const rows: ConditionRow[] = [];
  for (const [key, all] of groups) {
    const [brain, memory, progress, stance, goal, scenario] = key.split("\u0000") as [string, string, string, string, string, string];
    const runs = all.filter((s) => s.validity === "valid" && s.outcome !== "n/a");
    const wins = runs.filter((s) => s.outcome === true);
    const costs = runs.map((s) => s.costUSD);
    rows.push({
      brain, memory, progress, stance, goal, scenario,
      runs: runs.length,
      successes: wins.length,
      ci: wilson(wins.length, runs.length),
      ticksToGoal: median(wins.map((s) => s.ticksToGoal).filter((t): t is number => t !== null)),
      decisions: median(wins.map((s) => s.decisions)),
      tokensIn: median(runs.map((s) => s.tokensIn)),
      decisionMs: median(runs.map((s) => s.decisionMsMedian).filter((ms) => ms > 0)),
      costUSD: costs.includes("unknown") ? "unknown" : (costs as number[]).reduce((a, b) => a + b, 0),
      excluded: all.length - runs.length,
    });
  }
  return rows.sort((a, b) => [a.goal, a.brain, a.memory, a.progress, a.stance].join(" ").localeCompare([b.goal, b.brain, b.memory, b.progress, b.stance].join(" ")));
}

function printConditions(rows: ConditionRow[]): void {
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const num = (x: number | null) => (x === null ? "-" : String(Math.round(x)));
  printColumns(rows, [
    ["Goal", (r) => r.goal, false],
    ["Brain", (r) => r.brain, false],
    ["Memory", (r) => r.memory, false],
    ["Progress", (r) => r.progress, false],
    ["Stance", (r) => r.stance, false],
    ["Scenario", (r) => r.scenario, false],
    ["Success", (r) => `${r.successes}/${r.runs}`, true],
    ["95% CI", (r) => (r.runs ? `${pct(r.ci[0])}-${pct(r.ci[1])}` : "-"), true],
    ["Ticks*", (r) => num(r.ticksToGoal), true],
    ["Decisions*", (r) => num(r.decisions), true],
    ["TokenIn", (r) => num(r.tokensIn), true],
    ["Median(ms)", (r) => num(r.decisionMs), true],
    ["Cost(USD)", (r) => formatCost(r.costUSD), true],
    ["Excluded", (r) => String(r.excluded), true],
  ]);
  console.log("\n* median over successful runs. Success uses each run's stance rule; CI is the 95% Wilson interval.");
}

async function main() {
  const argv = minimist(process.argv.slice(2), { string: ["by", "batch"] });
  // The per-condition table is about a whole batch, so it reads every run unless told otherwise.
  const last = argv.last ?? (argv.by || argv.batch ? Infinity : 20);
  if (argv.by && argv.by !== "condition") {
    console.error(`unknown --by "${argv.by}" — expected condition`);
    process.exit(1);
  }
  const jsonOutput = argv.json ?? false;
  const files = argv._ as string[];

  if (files.length === 0) {
    // Auto-discover from runs/
    const fs = await import("node:fs/promises");
    try {
      const entries = await fs.readdir("runs");
      files.push(...entries.filter((f) => f.endsWith(".jsonl")).map((f) => `runs/${f}`));
    } catch (err) {
      console.log("No runs directory found. Run `npm run agent` to generate logs.");
      return;
    }
  }

  if (files.length === 0) {
    console.log("No log files found.");
    return;
  }

  // Sort by filename (timestamp first, then agent name)
  files.sort();

  // Process last N files
  const toProcess = last === Infinity ? files : files.slice(-last);
  let summaries: RunSummary[] = [];

  for (const file of toProcess) {
    try {
      const steps = Array.from(readJsonl(file));
      if (steps.length === 0) {
        console.error(`Warning: no valid steps in ${file}`);
        continue;
      }
      const summary = summarizeRun(steps, file);
      summaries.push(summary);
    } catch (err) {
      console.error(`Error processing ${file}: ${(err as Error).message}`);
    }
  }

  if (summaries.length === 0) {
    console.log("No valid runs to report.");
    return;
  }

  markEpisodes(summaries);
  scoreStances(summaries);
  if (argv.batch) {
    // batch.sh names episodes batch-NAME-N, team.sh team-NAME-N.
    const prefixes = [`batch-${argv.batch}-`, `team-${argv.batch}-`];
    summaries = summaries.filter((s) => prefixes.some((p) => s.episode?.startsWith(p)));
    if (summaries.length === 0) {
      console.log(`No runs from batch "${argv.batch}".`);
      return;
    }
  }

  if (argv.by) {
    const rows = byCondition(summaries);
    if (jsonOutput) console.log(JSON.stringify(rows, null, 2));
    else printConditions(rows);
  } else if (jsonOutput) {
    console.log(JSON.stringify(summaries, null, 2));
  } else {
    // Text table
    printTable(summaries);
  }
}

function formatCost(cost: number | "unknown"): string {
  if (cost === "unknown") return "unknown";
  return cost.toFixed(4);
}

function formatGoalMet(met: boolean | "n/a"): string {
  if (met === "n/a") return "n/a";
  return met ? "yes" : "no";
}

function formatSurvivedNight(survived: boolean | "unknown"): string {
  if (survived === "unknown") return "-";
  return survived ? "yes" : "no";
}

function printTable(summaries: RunSummary[]) {
  printColumns(summaries, [
    ["Agent", (s) => s.agentName || "", false],
    ["Brain", (s) => s.brain || "", false],
    ["Memory", (s) => s.memory ?? "-", false],
    ["Progress", (s) => (s.progress === null ? "-" : s.progress ? "on" : "off"), false],
    ["Stance", (s) => s.stance ?? "-", false],
    ["Scenario", (s) => s.scenario || "", false],
    ["Goal preset", (s) => s.goalName, false],
    ["Steps", (s) => String(s.stepsLogged), true],
    ["Furthest", (s) => s.furthestMilestone || "-", false],
    ["Ended", (s) => s.howEnded || "", false],
    ["Valid", (s) => (s.validity === "valid" ? "yes" : `no: ${s.validity}`), false],
    ["Deaths", (s) => String(s.deaths), true],
    ["Food low", (s) => String(s.lowestFood), true],
    ["Hits given/taken", (s) => hitPair(s), true],
    ["Goal", (s) => formatGoalMet(s.goalMet), false],
    ["Outcome", (s) => formatGoalMet(s.outcome), false],
    ["Night", (s) => (s.nightReached ? "yes" : "no"), false],
    ["Survived", (s) => formatSurvivedNight(s.survivedNight), false],
    ["Decisions", (s) => String(s.decisions), true],
    ["Median(ms)", (s) => String(s.decisionMsMedian || 0), true],
    ["P90(ms)", (s) => String(s.decisionMsP90 || 0), true],
    ["Calls", (s) => String(s.totalModelCalls), true],
    ["Re-asks", (s) => String(s.retries), true],
    ["Throttled", (s) => (s.providerRetries ? `${s.providerRetries} (${s.retryWaitS}s)` : "0"), true],
    ["Done refused", (s) => String(s.doneRefused), true],
    ["TokenIn", (s) => String(s.tokensIn), true],
    ["Cached", (s) => (s.tokensIn ? `${Math.round((100 * s.tokensCached) / s.tokensIn)}%` : "-"), true],
    ["TokenOut", (s) => String(s.tokensOut), true],
    ["Cost(USD)", (s) => formatCost(s.costUSD), true],
  ]);
}

/** Prints rows as an aligned text table. Column: [header, value, right-aligned?]; widths come from the data. */
function printColumns<T>(items: T[], columns: Array<[string, (item: T) => string, boolean]>): void {
  const cells = items.map((item) => columns.map(([, value]) => value(item)));
  const widths = columns.map(([header], i) => Math.max(header.length, ...cells.map((row) => row[i]!.length)));
  const line = (row: string[]) =>
    row.map((cell, i) => (columns[i]![2] ? cell.padStart(widths[i]!) : cell.padEnd(widths[i]!))).join(" | ");

  console.log(
    [line(columns.map(([header]) => header)), widths.map((w) => "-".repeat(w)).join("-+-"), ...cells.map(line)].join("\n"),
  );
}

const total = (counts: Record<string, number>) => Object.values(counts).reduce((a, b) => a + b, 0);

/** Hits between this agent and other agents, "given/taken"; "-" when there were none. */
export function hitPair(s: Pick<RunSummary, "hitsGiven" | "hitsTaken">): string {
  const given = total(s.hitsGiven), taken = total(s.hitsTaken);
  return given || taken ? `${given}/${taken}` : "-";
}

/** "5 on qb, 2 on qc" — who an agent hit, or was hit by, most first. */
export function hitList(counts: Record<string, number>, word: "on" | "from"): string {
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, n]) => `${n} ${word} ${name}`).join(", ");
}

// Only as a command: the minds panel imports summarizeRun.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
