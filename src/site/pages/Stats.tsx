import { useState } from 'react';
import { batches } from 'virtual:batches';
import { goalNotes } from '../content/goals';
import usage from '../../../docs/results/token-usage.json';
import type { AgentRun, Batch } from '../lib/batches';
import { HASH } from '../lib/route';
import { dollars } from './BatchParts';

// A high-level count over every published report: how many runs each model played, how many decisions
// it made and what they cost. One agent in one run is one run, so a three-agent team rep is three.
// Shown one goal at a time (the owner's ask: models had different goals, so totals across goals are
// counts, not a comparison), starting with the goal of the latest report; "All goals" adds them up.

interface ModelTotals {
  model: string;
  runs: number;
  decisions: number;
  cost: number;
  deaths: number;
  met: number;
  tokensIn: number;
  tokensOut: number;
}

const ALL = '';
const runs: AgentRun[] = batches.flatMap((b: Batch) => b.agentRuns);

// Goals in the order last played, newest first, each with how many runs it has.
const lastPlayed = new Map<string, number>();
batches.forEach((b: Batch, i: number) => b.agentRuns.forEach((r) => lastPlayed.set(r.goal, i)));
const goals = [...lastPlayed.keys()].filter(Boolean).sort((a, b) => lastPlayed.get(b)! - lastPlayed.get(a)!);
const runsOf = (goal: string) => runs.filter((r) => goal === ALL || r.goal === goal);

function tally(selected: AgentRun[]): { rows: ModelTotals[]; total: Omit<ModelTotals, 'model'> } {
  const byModel = new Map<string, ModelTotals>();
  for (const r of selected) {
    const t = byModel.get(r.model) ?? { model: r.model, runs: 0, decisions: 0, cost: 0, deaths: 0, met: 0, tokensIn: 0, tokensOut: 0 };
    t.runs += 1;
    t.tokensIn += r.tokensIn;
    t.tokensOut += r.tokensOut;
    t.decisions += r.decisions;
    t.cost += r.cost;
    t.deaths += r.deaths;
    t.met += r.met ? 1 : 0;
    byModel.set(r.model, t);
  }
  const rows = [...byModel.values()].sort((a, b) => b.runs - a.runs || b.decisions - a.decisions);
  const total = rows.reduce(
    (s, t) => ({
      runs: s.runs + t.runs, decisions: s.decisions + t.decisions, cost: s.cost + t.cost, deaths: s.deaths + t.deaths,
      met: s.met + t.met, tokensIn: s.tokensIn + t.tokensIn, tokensOut: s.tokensOut + t.tokensOut,
    }),
    { runs: 0, decisions: 0, cost: 0, deaths: 0, met: 0, tokensIn: 0, tokensOut: 0 },
  );
  return { rows, total };
}

const millions = (x: number) => (x >= 1e6 ? `${(x / 1e6).toFixed(1)}M` : `${Math.round(x / 1000)}k`);
const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : '–');
const costed = usage.models.filter((m) => m.savingCosted);
const saved = costed.reduce((s, m) => s + m.uncachedUSD - m.costUSD, 0);
const paidFor = costed.reduce((s, m) => s + m.costUSD, 0);
const n = (x: number) => x.toLocaleString('en-GB');
const one = (x: number) => (x >= 10 ? Math.round(x).toString() : x.toFixed(1));
const cents = (usd: number) => `${(usd * 100).toFixed(2)}¢`;
const perDecision = (t: ModelTotals) => t.cost / t.decisions;

export function Stats() {
  const [goal, setGoal] = useState<string>(goals[0] ?? ALL);
  const { rows, total } = tally(runsOf(goal));
  const paid = rows.filter((t) => t.cost > 0);
  const cheapest = [...paid].sort((a, b) => perDecision(a) - perDecision(b))[0];
  const dearest = [...paid].sort((a, b) => perDecision(b) - perDecision(a))[0];
  const scripted = rows.find((t) => t.model === 'Scripted baseline');
  const reports = batches.filter((b: Batch) => b.agentRuns.some((r) => goal === ALL || r.goal === goal)).length;

  return (
    <main>
      <header className="page-head">
        <h1>Stats</h1>
        <p className="lede">
          The whole project in a few numbers: how many times each model has played, how many decisions it made, and
          what that cost. One goal at a time, so the models in a table all faced the same task.
        </p>
      </header>

      <div className="goal-chips" role="group" aria-label="Goal">
        {goals.map((g) => (
          <button key={g} type="button" aria-pressed={goal === g} onClick={() => setGoal(g)}>
            {g} <span className="muted">{runsOf(g).length}</span>
          </button>
        ))}
        <button type="button" aria-pressed={goal === ALL} onClick={() => setGoal(ALL)}>
          All goals <span className="muted">{runs.length}</span>
        </button>
      </div>
      <p className="goal-chip-note muted">
        {goal === ALL
          ? 'Every goal added up. Models played different goals, so these rows are counts, not a comparison.'
          : (goalNotes[goal] ?? `The ${goal} goal.`)}
      </p>

      <div className="stats">
        <div className="stat">
          <strong>{n(total.runs)}</strong>
          <span>agent runs (one agent, one run; a team of three is three)</span>
        </div>
        <div className="stat">
          <strong>{n(total.decisions)}</strong>
          <span>decisions made by the agents</span>
        </div>
        <div className="stat">
          <strong>{millions(total.tokensIn)}</strong>
          <span>tokens sent to the models ({millions(total.tokensOut)} written back)</span>
        </div>
        <div className="stat">
          <strong>{dollars(total.cost)}</strong>
          <span>spent on paid models</span>
        </div>
        <div className="stat">
          <strong>{n(total.met)}</strong>
          <span>runs that met their goal ({total.runs ? Math.round((total.met / total.runs) * 100) : 0}%)</span>
        </div>
        <div className="stat">
          <strong>{n(total.deaths)}</strong>
          <span>deaths in the game</span>
        </div>
        <div className="stat">
          <strong>{reports}</strong>
          <span>published batches and team runs</span>
        </div>
      </div>

      <h2 className="section-title">By model</h2>
      <div className="prose">
        <div className="table-wrap">
          <table className="conditions stats-table">
            <thead>
              <tr>
                <th>Model</th>
                <th className="num">Runs</th>
                <th className="num">Decisions</th>
                <th className="num">Per run</th>
                <th className="num">Tokens in / out</th>
                <th className="num">Cost</th>
                <th className="num">Per decision</th>
                <th className="num">Deaths per run</th>
                <th className="num">Goal met</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.model}>
                  <td>{t.model}</td>
                  <td className="num">{n(t.runs)}</td>
                  <td className="num">{n(t.decisions)}</td>
                  <td className="num">{one(t.decisions / t.runs)}</td>
                  <td className="num">{t.tokensIn ? `${millions(t.tokensIn)} / ${millions(t.tokensOut)}` : '–'}</td>
                  <td className="num">{dollars(t.cost)}</td>
                  <td className="num">{t.cost ? cents(perDecision(t)) : 'free'}</td>
                  <td className="num">{(t.deaths / t.runs).toFixed(1)}</td>
                  <td className="num">
                    {t.met} of {t.runs}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ul className="stats-facts">
        {cheapest && dearest && cheapest !== dearest && (
          <li>
            A decision cost {cents(perDecision(cheapest))} on {cheapest.model} and {cents(perDecision(dearest))} on{' '}
            {dearest.model}: about {Math.round(perDecision(dearest) / perDecision(cheapest))} times as much.
          </li>
        )}
        {scripted && (
          <li>
            The scripted baseline, with no model at all, met {goal === ALL ? 'its goal' : 'this goal'} in {scripted.met} of{' '}
            {scripted.runs} runs: the control that says whether a model adds anything.
          </li>
        )}
      </ul>

      <h2 className="section-title">Prompt caching</h2>
      <p className="goal-chip-note">
        Each decision resends the same rules and skill list; only the latest observation changes. The providers keep
        that repeated start of the prompt and charge a fraction of the price to read it again. Claude saved about{' '}
        <strong>{dollars(saved)}</strong> this way: {dollars(paidFor)} paid, against{' '}
        {dollars(paidFor + saved)} for the same calls uncached.
      </p>
      <div className="prose">
        <div className="table-wrap">
          <table className="conditions stats-table">
            <thead>
              <tr>
                <th>Model</th>
                <th className="num">Calls</th>
                <th className="num">Tokens in</th>
                <th className="num">Read from cache</th>
                <th className="num">Written to cache</th>
                <th className="num">Paid</th>
                <th className="num">Uncached</th>
                <th className="num">Saved</th>
              </tr>
            </thead>
            <tbody>
              {usage.models.map((m) => (
                <tr key={m.model}>
                  <td>{m.model}</td>
                  <td className="num">{n(m.calls)}</td>
                  <td className="num">{millions(m.inputTokens)}</td>
                  <td className="num">
                    {millions(m.cacheReadTokens)} ({pct(m.cacheReadTokens, m.inputTokens)})
                  </td>
                  <td className="num">{m.cacheWriteTokens ? millions(m.cacheWriteTokens) : 'not reported'}</td>
                  <td className="num">{dollars(m.costUSD)}</td>
                  <td className="num">{m.savingCosted ? dollars(m.uncachedUSD) : '–'}</td>
                  <td className="num">
                    {m.savingCosted ? `${dollars(m.uncachedUSD - m.costUSD)} (${pct(m.uncachedUSD - m.costUSD, m.uncachedUSD)})` : 'not costed'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="muted small">
        From every model call logged on the machine that runs the experiment, {usage.from} to {usage.to}, all goals,
        proof runs included (published reports carry only tokens in and out, and logs from earlier machines are gone).
        Costs cover input and output; "uncached" prices every input token in full. On Claude a cache read costs a tenth
        of the input price and a write a quarter more. OpenAI caches by itself and doesn't report its cache writes, so
        GPT-6 Luna's cached input is billed here at the full price and its saving isn't counted.
      </p>

      <p className="muted small">
        Counted from the published reports on the <a href={HASH.results}>Results</a> page: every agent in every run they
        cover. Proof runs (one rep, to check a fix) are not published, so they are not here. A team agent's run counts as
        met when its team met the goal. The local model and the scripted baseline cost nothing.
      </p>
    </main>
  );
}
