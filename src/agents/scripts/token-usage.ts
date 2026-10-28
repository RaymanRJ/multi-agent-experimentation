// Every model call in the run logs on this machine, added up by model: tokens in and out, how many of
// the input tokens the provider read from its prompt cache or wrote to it, what the calls cost, and
// what the same calls would have cost with no cache. Writes docs/results/token-usage.json for the
// site's Stats page (published reports carry only tokens in and out).
//   cd src/agents && npx tsx scripts/token-usage.ts
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { costUSD } from "../src/backends/pricing.js";
import type { ModelCall } from "../src/types.js";

const NAMES: Record<string, string> = {
  "claude-opus-5-5": "Claude Opus 5.5",
  "claude-sonnet-5-5": "Claude Sonnet 5.5",
  "claude-haiku-4-5": "Claude Haiku 4.5",
  "gpt-6-luna": "GPT-6 Luna",
};

interface Totals {
  model: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  /** What the calls cost, cache and all. */
  costUSD: number;
  /** The same calls with every input token at the full price. */
  uncachedUSD: number;
  /** False where the price table bills cached input at the full price, so no saving can be shown. */
  savingCosted: boolean;
}

const byModel = new Map<string, Totals>();
let first = "";
let last = "";
for (const file of readdirSync("runs").filter((f) => f.endsWith(".jsonl")).sort()) {
  for (const line of readFileSync(`runs/${file}`, "utf8").split("\n")) {
    if (!line) continue;
    let step: { at?: string; calls?: ModelCall[] };
    try {
      step = JSON.parse(line);
    } catch {
      continue;
    }
    for (const call of step.calls ?? []) {
      if (call.backend === "ollama" || !call.inputTokens) continue;
      const model = call.model.replace(/-\d{8}$/, "");
      const t = byModel.get(model) ?? {
        model: NAMES[model] ?? model, calls: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0,
        costUSD: 0, uncachedUSD: 0, savingCosted: model.startsWith("claude-"),
      };
      t.calls += 1;
      t.inputTokens += call.inputTokens;
      t.outputTokens += call.outputTokens;
      t.cacheReadTokens += call.cacheReadTokens ?? 0;
      t.cacheWriteTokens += call.cacheWriteTokens ?? 0;
      t.costUSD += costUSD(call);
      t.uncachedUSD += costUSD({ ...call, cacheReadTokens: 0, cacheWriteTokens: 0 });
      byModel.set(model, t);
      if (step.at) {
        if (!first || step.at < first) first = step.at;
        if (step.at > last) last = step.at;
      }
    }
  }
}

const models = [...byModel.values()]
  .filter((t) => Number.isFinite(t.costUSD))
  .sort((a, b) => b.inputTokens - a.inputTokens)
  .map((t) => ({ ...t, costUSD: Math.round(t.costUSD * 100) / 100, uncachedUSD: Math.round(t.uncachedUSD * 100) / 100 }));
const out = { from: first.slice(0, 10), to: last.slice(0, 10), models };
writeFileSync("../../docs/results/token-usage.json", `${JSON.stringify(out, null, 2)}\n`);
console.log(`token-usage: ${models.length} models, calls from ${out.from} to ${out.to}`);
for (const t of models) {
  console.log(`  ${t.model}: ${t.calls} calls, ${(t.inputTokens / 1e6).toFixed(2)}M in, ${Math.round((t.cacheReadTokens / t.inputTokens) * 100)}% read from cache, $${t.costUSD} (uncached $${t.uncachedUSD})`);
}
