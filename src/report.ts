import { readFileSync } from "node:fs";
import { basename } from "node:path";
import minimist from "minimist";
import type { EndReason, LoggedStep, SkillStatus } from "./types.js";
import { GOALS, SCENARIOS } from "./scenario.js";
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
  goalMet: boolean | "n/a";
  nightReached: boolean;
  survivedNight: boolean | "unknown";
  decisions: number;
  decisionMsMedian: number;
  decisionMsP90: number;
  totalModelCalls: number;
  retries: number;
  fallbackWaits: number;
  tokensIn: number;
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
  validity: "valid" | "brain unavailable" | "episode incomplete";
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
function newEventsPerStep(steps: LoggedStep[]): string[][] {
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
 * - "shelter": met if any build_shelter step has result.status "success"
 * - "tools": met if craft step with args.item "stone_pickaxe" succeeded,
 *   or stone_pickaxe appears in any inventory
 * - otherwise: "n/a"
 *
 * survivedNight:
 * - true: nightReached && deaths === 0 && a later observation has isDay true
 * - false: nightReached && deaths > 0
 * - "unknown": night never came, or the run ended during the night without a death
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
  if (goalName === "shelter") {
    goalMet = false;
    for (const step of steps) {
      if (step.decision && step.decision.skill === "build_shelter" && step.result && step.result.status === "success") {
        goalMet = true;
        break;
      }
    }
  } else if (goalName === "tools") {
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
        break;
      }
    }
    // Or check inventory for stone_pickaxe
    if (!goalMet) {
      for (const step of steps) {
        if (step.observation && step.observation.inventory && step.observation.inventory.stone_pickaxe) {
          goalMet = true;
          break;
        }
      }
    }
  }

  // Night reached and survived night
  let nightReached = false;
  let survivedNight: boolean | "unknown" = "unknown";
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const obs = step?.observation;
    if (obs && !obs.isDay) {
      nightReached = true;
      // Check if we survived (no deaths and day comes again)
      if (deaths === 0) {
        // Look for isDay true after this point
        for (let j = i + 1; j < steps.length; j++) {
          const nextObs = steps[j]?.observation;
          if (nextObs && nextObs.isDay) {
            survivedNight = true;
            break;
          }
        }
        // Night reached, no deaths, but the run ended before daylight: stays "unknown".
      } else {
        survivedNight = false;
      }
      break;
    }
  }

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
  let fallbackWaits = 0;
  let tokensIn = 0;
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
      tokensOut += call.outputTokens;
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
  const milestones = computeMilestones(steps, newEvents);
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
    goalMet,
    nightReached,
    survivedNight,
    decisions,
    decisionMsMedian,
    decisionMsP90,
    totalModelCalls,
    retries,
    fallbackWaits,
    tokensIn,
    tokensOut,
    costUSD: costUsdValue,
    milestones,
    furthestMilestone,
    episode: steps[0]?.config?.episode ?? null,
    validity: howEnded === "brain unavailable" ? "brain unavailable" : "valid",
  };
}

/**
 * Compute milestones reached during the run.
 * Milestones are tracked in order: logs → wooden_pickaxe → stone → stone_pickaxe → shelter → survived_night
 */
function computeMilestones(steps: LoggedStep[], newEvents: string[][]): Record<MilestoneName, MilestoneData | null> {
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

    if (!result.survived_night) {
      // survived_night is true when nightReached && deaths === 0 && day comes again
      let nightReached = false;
      let deaths = 0;
      // Count deaths from new events up to this step
      for (let j = 0; j <= i; j++) {
        const eventList = newEvents[j];
        if (eventList) {
          for (const event of eventList) {
            if (event.includes("died") || event.includes("respawned")) {
              deaths++;
            }
          }
        }
        const checkObs = steps[j]?.observation;
        if (checkObs && !checkObs.isDay) {
          nightReached = true;
        }
      }

      if (nightReached && deaths === 0) {
        // Check if day comes again after night
        for (let j = i; j >= 0; j--) {
          const checkObs = steps[j]?.observation;
          if (checkObs && !checkObs.isDay) {
            // Found night, now check if day comes after
            for (let k = j + 1; k <= i; k++) {
              const dayObs = steps[k]?.observation;
              if (dayObs && dayObs.isDay) {
                result.survived_night = { step: step.step, gameTicks: ticksAt, wallMs, decisions: decisionsSoFar, tokens: cumulativeTokens, costUSD: cumulativeCost };
                break;
              }
            }
            break;
          }
        }
      }
    }
  }

  return result;
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
async function main() {
  const argv = minimist(process.argv.slice(2));
  const last = argv.last ?? 20;
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
  const toProcess = files.slice(-last);
  const summaries: RunSummary[] = [];

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

  if (jsonOutput) {
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
  // [header, value, right-aligned?] — widths come from the data, so nothing is cut off.
  const columns: Array<[string, (s: RunSummary) => string, boolean]> = [
    ["Agent", (s) => s.agentName || "", false],
    ["Brain", (s) => s.brain || "", false],
    ["Scenario", (s) => s.scenario || "", false],
    ["Steps", (s) => String(s.stepsLogged), true],
    ["Furthest", (s) => s.furthestMilestone || "-", false],
    ["Ended", (s) => s.howEnded || "", false],
    ["Valid", (s) => (s.validity === "valid" ? "yes" : `no: ${s.validity}`), false],
    ["Deaths", (s) => String(s.deaths), true],
    ["Goal", (s) => formatGoalMet(s.goalMet), false],
    ["Night", (s) => (s.nightReached ? "yes" : "no"), false],
    ["Survived", (s) => formatSurvivedNight(s.survivedNight), false],
    ["Decisions", (s) => String(s.decisions), true],
    ["Median(ms)", (s) => String(s.decisionMsMedian || 0), true],
    ["P90(ms)", (s) => String(s.decisionMsP90 || 0), true],
    ["Calls", (s) => String(s.totalModelCalls), true],
    ["Retries", (s) => String(s.retries), true],
    ["TokenIn", (s) => String(s.tokensIn), true],
    ["TokenOut", (s) => String(s.tokensOut), true],
    ["Cost(USD)", (s) => formatCost(s.costUSD), true],
  ];
  const cells = summaries.map((s) => columns.map(([, value]) => value(s)));
  const widths = columns.map(([header], i) => Math.max(header.length, ...cells.map((row) => row[i]!.length)));
  const line = (row: string[]) =>
    row.map((cell, i) => (columns[i]![2] ? cell.padStart(widths[i]!) : cell.padEnd(widths[i]!))).join(" | ");

  console.log(
    [line(columns.map(([header]) => header)), widths.map((w) => "-".repeat(w)).join("-+-"), ...cells.map(line)].join("\n"),
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
