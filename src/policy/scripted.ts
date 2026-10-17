import type { Decision, Observation, Policy, PolicyOutput, Skill } from "../types.js";

/** Building blocks build_shelter wants ("about 43"); 11 logs = 44 planks. */
const SHELTER_BLOCKS = 44;
/** Table (4) + pickaxe (3) + sticks (2), with a little slack. */
const WOODEN_PICK_UNITS = 12;
/** Stone pickaxe: 2 sticks (2 planks), plus 4 planks for a fresh table if the old one is far away. */
const STONE_PICK_UNITS = 6;
const COBBLE_FOR_PICK = 3;
/**
 * Made after the shelter, in daylight, for the outpost goal: once the shelter is built the tools
 * and shelter goals have already ended the run, so their baseline is unchanged. Cobblestone each.
 */
const EXTRA_TOOLS: Array<[string, number]> = [["stone_axe", 3], ["stone_sword", 2], ["stone_shovel", 1]];
/** Planks for the extras' 5 sticks (two batches of 4) plus a fresh crafting table. */
const EXTRA_TOOL_UNITS = 8;
/** Iron then diamonds, after the outpost: heights to dig to, and how many to fetch. */
const IRON_Y = 16;
const DIAMOND_Y = -58;
const IRON_FOR_PICK = 3;
const DIAMONDS_FOR_BOOTS = 4;
/** Logs kept for furnace fuel and the iron pickaxe's sticks; cobblestone for the furnace. */
const LOGS_FOR_IRON = 3;
const COBBLE_FOR_FURNACE = 8;
/** Searching for ore is tunnel, look, tunnel: it earns many more tries than other stages. */
const MAX_ORE_FAILS = 15;

const FLEE_RANGE = 8;
const FLEE_DISTANCE = 24;
const MAX_CONSECUTIVE_FLEES = 3;
const EAT_BELOW = 15;
const MAX_STAGE_FAILS = 3;
/** Crafting at a table is flaky on this server (window desyncs) and costs little to retry. */
const MAX_CRAFT_FAILS = 6;
const MAX_STAGE_ATTEMPTS = 12;
const MAX_EXPLORES = 10;
/** Stone is often far from spawn, so it earns more search trips than wood does. */
const MAX_STONE_FAILS = 5;
const HOLD_SECONDS = 30;
/** Generous: holding through a full day is ~40 waits. The run's time budget normally ends it first. */
const MAX_DECISIONS = 150;

const FOODS = new Set([
  "bread", "apple", "carrot", "potato", "baked_potato", "melon_slice", "sweet_berries", "cookie",
  "pumpkin_pie", "mushroom_stew", "beetroot", "dried_kelp",
  "beef", "porkchop", "chicken", "mutton", "rabbit", "cod", "salmon",
  "cooked_beef", "cooked_porkchop", "cooked_chicken", "cooked_mutton", "cooked_rabbit", "cooked_cod", "cooked_salmon",
]);

const PICKAXES = ["wooden_pickaxe", "stone_pickaxe", "golden_pickaxe", "iron_pickaxe", "diamond_pickaxe", "netherite_pickaxe"];
const STONE_TIER = ["stone_pickaxe", "iron_pickaxe", "diamond_pickaxe", "netherite_pickaxe"];

/** Stages that can be retried somewhere else after an explore. */
const RELOCATABLE = new Set(["gather_wood", "mine_stone", "build_shelter"]);
const DIAMOND_ARMOR = ["diamond_helmet", "diamond_chestplate", "diamond_leggings", "diamond_boots"];

function sum(inventory: Record<string, number>, test: (name: string) => boolean): number {
  return Object.entries(inventory).reduce((total, [name, count]) => (test(name) ? total + count : total), 0);
}

/**
 * No model in the loop: one fixed, observation-driven plan, then the episode ends.
 *
 * This is NOT throwaway scaffolding — it is the control baseline. Without it
 * there is no way to tell whether a model is adding value over a hardcoded plan.
 * Keep it working.
 *
 * Each decide() reads the Observation (hostiles, food, time, inventory,
 * recentEvents) and picks the next skill:
 *   1. reactive: hostile close -> flee; hungry and holding food -> eat;
 *      night and holding a bed -> sleep.
 *   2. progression from inventory: logs -> wooden_pickaxe -> 3 cobblestone ->
 *      stone_pickaxe -> logs for a shelter -> build_shelter.
 *   3. hold: wait in the shelter until the run's time budget ends the episode. It does
 *      not end the episode itself, so in survival it faces the night like any brain.
 * A skill that fails is retried after an explore (new trees/stone/ground); after
 * MAX_STAGE_FAILS consecutive failures that stage is abandoned, and caps on
 * explores, attempts and total decisions guarantee the policy terminates.
 *
 * It deliberately never reads `observation.scenario` or `observation.goal`:
 * sandbox and survival differ only in world settings and goal text, and the
 * baseline runs the same plan in both. That is what makes it a baseline.
 */
export class ScriptedPolicy implements Policy {
  readonly name = "scripted";

  private lastDecision: { skill: string; key: string } | null = null;
  private failStreak = new Map<string, number>();
  private attempts = new Map<string, number>();
  private abandoned = new Set<string>();
  private bonusWood = 0;
  private pendingExplore = false;
  private explores = 0;
  private fleeStreak = 0;
  /** The last mine_ore found nothing in sight: dig to uncover more before looking again. */
  private uncover = false;
  private shelterBuilt = false;
  private decisions = 0;
  /** A craft that reported success: if the item is not in the next inventory, the success was phantom. */
  private expectItem: { item: string; key: string } | null = null;

  async decide(observation: Observation, _skills: Skill[]): Promise<PolicyOutput> {
    const expected = this.expectItem;
    this.expectItem = null;
    this.absorbLastResult(observation.recentEvents);
    if (expected) {
      if ((observation.inventory[expected.item] ?? 0) === 0) this.countFailure(expected.key, "craft", "");
      else this.failStreak.set(expected.key, 0);
    }
    this.decisions++;
    const decision = this.decisions > MAX_DECISIONS ? null : this.choose(observation);
    return { decision, calls: [] };
  }

  /** The last recentEvents line for our previous skill is its result: "<skill> <status> (reason)". */
  private absorbLastResult(events: string[]): void {
    const last = this.lastDecision;
    if (!last) return;
    this.lastDecision = null;
    let status: string | null = null;
    let reason = "";
    for (let i = events.length - 1; i >= 0; i--) {
      const match = events[i]!.match(/^([a-z_]+) (success|failed|aborted)\b(.*)$/s);
      if (match && match[1] === last.skill) {
        status = match[2]!;
        reason = match[3]!;
        break;
      }
    }
    if (status === null) return;

    if (last.skill === "flee") return;
    if (status === "success") {
      if (last.skill !== "craft") this.failStreak.set(last.key, 0); // a craft is confirmed against the inventory
      if (last.skill === "build_shelter") this.shelterBuilt = true;
      if (last.skill === "craft") this.expectItem = { item: last.key.replace(/^craft:/, ""), key: last.key };
      if (last.skill === "explore") this.pendingExplore = false;
      return;
    }
    if (last.skill === "explore") {
      this.pendingExplore = false;
      return;
    }
    this.countFailure(last.key, last.skill, reason);
  }

  private countFailure(key: string, skill: string, reason: string): void {
    const streak = (this.failStreak.get(key) ?? 0) + 1;
    this.failStreak.set(key, streak);
    if (skill === "mine_ore") this.uncover = true;
    const limit =
      skill === "craft" ? MAX_CRAFT_FAILS :
      skill === "mine_stone" ? MAX_STONE_FAILS :
      skill === "mine_ore" || skill === "tunnel" ? MAX_ORE_FAILS : MAX_STAGE_FAILS;
    if (streak >= limit) this.abandoned.add(key);
    else if (RELOCATABLE.has(skill) || /flat ground/.test(reason)) this.pendingExplore = true;
    // A craft or shelter that came up short ("need 4 more ...") needs more wood, not a new place.
    if (/need \d+ more/.test(reason)) this.bonusWood += 1;
  }

  private go(skill: string, args: Record<string, unknown>, rationale: string, key = skill): Decision {
    this.lastDecision = { skill, key };
    return { skill, args, rationale };
  }

  /** A stage is usable until abandoned or retried too often. */
  private usable(key: string): boolean {
    return !this.abandoned.has(key) && (this.attempts.get(key) ?? 0) < MAX_STAGE_ATTEMPTS;
  }

  private stage(key: string, skill: string, args: Record<string, unknown>, rationale: string): Decision {
    this.attempts.set(key, (this.attempts.get(key) ?? 0) + 1);
    return this.go(skill, args, rationale, key);
  }

  private choose(o: Observation): Decision | null {
    const inv = o.inventory;
    const nearest = o.hostiles[0];

    // --- Reactive rules ---
    if (!nearest || nearest.distance > FLEE_RANGE) this.fleeStreak = 0;
    if (nearest && nearest.distance <= FLEE_RANGE && !this.shelterBuilt && this.fleeStreak < MAX_CONSECUTIVE_FLEES) {
      this.fleeStreak++;
      return this.go("flee", { distance: FLEE_DISTANCE }, `${nearest.name} ${nearest.distance} blocks away: run`);
    }

    if (o.food < EAT_BELOW && sum(inv, (n) => FOODS.has(n)) > 0 && (this.failStreak.get("eat") ?? 0) < 2) {
      return this.go("eat", {}, `food ${o.food}: eat`);
    }

    if (!o.isDay && sum(inv, (n) => n.endsWith("_bed")) > 0 && (this.failStreak.get("sleep") ?? 0) < 2) {
      return this.go("sleep", {}, "night and I have a bed: sleep");
    }
    if (o.isDay) this.failStreak.set("sleep", 0);

    // --- Hold: shelter built (or given up on), first making the other stone tools by day ---
    if (this.shelterBuilt) return this.extraTools(o) ?? this.ironAndDiamonds(o) ?? this.hold(o);
    if (this.abandoned.has("build_shelter")) return this.hold(o);

    // --- Relocate after a failed stage ---
    if (this.pendingExplore) {
      this.pendingExplore = false;
      if (this.explores < MAX_EXPLORES) {
        const distance = Math.min(96, 32 + 16 * this.explores++);
        return this.go("explore", { distance }, "last step failed: look somewhere new");
      }
    }

    // --- Progression, derived from inventory ---
    const logs = sum(inv, (n) => n.endsWith("_log"));
    const planks = sum(inv, (n) => n.endsWith("_planks"));
    const cobble = inv["cobblestone"] ?? 0;
    const wood = logs * 4 + planks;
    const hasPick = PICKAXES.some((p) => (inv[p] ?? 0) > 0);
    const hasStonePick = STONE_TIER.some((p) => (inv[p] ?? 0) > 0);
    const gatherTo = (units: number): Decision | null => {
      if (!this.usable("gather_wood")) return null;
      const target = Math.min(64, logs + Math.ceil((units + this.bonusWood * 4 - wood) / 4));
      return this.stage("gather_wood", "gather_wood", { count: target }, `need ${units} planks-worth of wood`);
    };

    if (!hasPick && this.usable("craft:wooden_pickaxe")) {
      if (wood < WOODEN_PICK_UNITS + this.bonusWood * 4) {
        const d = gatherTo(WOODEN_PICK_UNITS);
        if (d) return d;
        return null; // cannot find any wood: nothing this plan can do
      }
      return this.stage("craft:wooden_pickaxe", "craft", { item: "wooden_pickaxe", count: 1 }, "wooden pickaxe to mine stone");
    }

    if (hasPick && !hasStonePick && this.usable("mine_stone") && this.usable("craft:stone_pickaxe")) {
      if (cobble < COBBLE_FOR_PICK) {
        return this.stage("mine_stone", "mine_stone", { count: COBBLE_FOR_PICK - cobble }, "cobblestone for a stone pickaxe");
      }
      if (wood < STONE_PICK_UNITS) {
        const d = gatherTo(STONE_PICK_UNITS);
        if (d) return d;
      } else {
        return this.stage("craft:stone_pickaxe", "craft", { item: "stone_pickaxe", count: 1 }, "stone pickaxe");
      }
    }

    if (wood + cobble < SHELTER_BLOCKS + this.bonusWood * 4) {
      const d = gatherTo(SHELTER_BLOCKS - cobble);
      if (d) return d;
      return this.hold(o); // out of options for wood: sit tight rather than loop
    }
    if (this.usable("build_shelter")) {
      return this.stage("build_shelter", "build_shelter", {}, "enough blocks: build a shelter");
    }
    return this.hold(o);
  }

  /** The next step towards a stone axe, sword and shovel, or null when done, impossible or dark. */
  private extraTools(o: Observation): Decision | null {
    if (!o.isDay) return null;
    const inv = o.inventory;
    const missing = EXTRA_TOOLS.filter(([tool]) => (inv[tool] ?? 0) === 0 && this.usable(`craft:${tool}`));
    if (missing.length === 0) return null;
    const cobble = inv["cobblestone"] ?? 0;
    const needCobble = missing.reduce((total, [, count]) => total + count, 0);
    if (cobble < missing[0]![1]) {
      if (!this.usable("mine_stone")) return null;
      return this.stage("mine_stone", "mine_stone", { count: needCobble - cobble }, "cobblestone for the other stone tools");
    }
    const logs = sum(inv, (n) => n.endsWith("_log"));
    const wood = logs * 4 + sum(inv, (n) => n.endsWith("_planks")) + (inv["stick"] ?? 0) / 2;
    if (wood < EXTRA_TOOL_UNITS / 2 && this.usable("gather_wood")) {
      return this.stage("gather_wood", "gather_wood", { count: logs + Math.ceil(EXTRA_TOOL_UNITS / 4) }, "wood for tool handles");
    }
    const [tool] = missing[0]!;
    return this.stage(`craft:${tool}`, "craft", { item: tool, count: 1 }, `${tool} for the outpost`);
  }

  /**
   * After the outpost: an iron pickaxe, then diamond boots. Starts only by day, but once
   * underground day and night no longer matter. Null when finished or out of options.
   */
  private ironAndDiamonds(o: Observation): Decision | null {
    const inv = o.inventory;
    const y = o.position.y;
    if (!o.isDay && y > 55) return null;
    const has = (name: string) => (inv[name] ?? 0) > 0;
    const logs = sum(inv, (n) => n.endsWith("_log"));
    const dig = (targetY: number, why: string): Decision | null => {
      this.uncover = false;
      if (y > targetY + 4 && this.usable("descend")) return this.stage("descend", "descend", { y: targetY }, why);
      if (this.usable("tunnel")) return this.stage("tunnel", "tunnel", { length: 16 }, "uncover ore hidden in the rock");
      return null;
    };

    if (!has("iron_pickaxe") && !has("diamond_pickaxe")) {
      const ingots = inv["iron_ingot"] ?? 0;
      const raw = inv["raw_iron"] ?? 0;
      if (ingots >= IRON_FOR_PICK) {
        return this.usable("craft:iron_pickaxe") ? this.stage("craft:iron_pickaxe", "craft", { item: "iron_pickaxe", count: 1 }, "iron pickaxe, to mine diamonds") : null;
      }
      if (ingots + raw >= IRON_FOR_PICK) {
        if (logs < LOGS_FOR_IRON && !has("coal") && this.usable("gather_wood")) {
          return this.stage("gather_wood", "gather_wood", { count: LOGS_FOR_IRON }, "wood for furnace fuel and sticks");
        }
        if (!has("furnace") && (inv["cobblestone"] ?? 0) < COBBLE_FOR_FURNACE && this.usable("mine_stone")) {
          return this.stage("mine_stone", "mine_stone", { count: COBBLE_FOR_FURNACE - (inv["cobblestone"] ?? 0) }, "cobblestone for a furnace");
        }
        return this.usable("smelt") ? this.stage("smelt", "smelt", { item: "iron_ingot", count: IRON_FOR_PICK - ingots }, "smelt the raw iron") : null;
      }
      if (this.uncover || !this.usable("mine_ore:iron")) return dig(IRON_Y, "down to where iron is common");
      return this.stage("mine_ore:iron", "mine_ore", { ore: "iron", count: IRON_FOR_PICK - ingots - raw }, "raw iron for an iron pickaxe");
    }

    if (DIAMOND_ARMOR.some(has)) return null;
    const diamonds = inv["diamond"] ?? 0;
    if (diamonds >= DIAMONDS_FOR_BOOTS) {
      return this.usable("craft:diamond_boots") ? this.stage("craft:diamond_boots", "craft", { item: "diamond_boots", count: 1 }, "diamond boots") : null;
    }
    if (y > DIAMOND_Y + 8) return dig(DIAMOND_Y, "down to where diamonds are");
    if (this.uncover || !this.usable("mine_ore:diamond")) return dig(DIAMOND_Y, "keep looking for diamonds");
    return this.stage("mine_ore:diamond", "mine_ore", { ore: "diamond", count: DIAMONDS_FOR_BOOTS - diamonds }, "diamonds for boots");
  }

  /** Wait quietly in safety; the time budget ends the run. */
  private hold(_o: Observation): Decision | null {
    return this.go("wait", { seconds: HOLD_SECONDS }, "holding in safety until the run ends");
  }
}
