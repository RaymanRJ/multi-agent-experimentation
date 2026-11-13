import { useState } from 'react';
import { batches } from 'virtual:batches';
import { milestones } from '../content/milestones';
import usage from '../../../docs/results/token-usage.json';
import type { AgentRun, Batch } from '../lib/batches';
import { HASH } from '../lib/route';
import { dollars } from './BatchParts';

// One page for "how well does it work, and is it getting better?": the shared goal's milestones, a few totals, every
// batch with its report, and a short table by model. The narrative of each set of runs belongs to the case studies.

const newestFirst = [...batches].sort((a: Batch, b: Batch) => b.started.localeCompare(a.started));
const runs = batches.reduce((n: number, b: Batch) => n + b.runs, 0);
const spent = batches.reduce((n: number, b: Batch) => n + b.cost, 0);
const pct = (x: number) => `${Math.round(x * 100)}%`;

function outcome(b: Batch): string {
  if (b.kind === 'team' && b.teams.length) {
    const met = b.teams.filter((t) => t.met).length;
    return `${met} of ${b.teams.length} ${b.teams.length === 1 ? 'team' : 'teams'}`;
  }
  return `${b.met} of ${b.runs} runs`;
}

const day = (iso: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '');

// By model, over every published run: how many runs, how often the goal was met, cost per run, and how much of the
// input the provider read from its cache (from docs/results/token-usage.json).
const byModel = (() => {
  const all: AgentRun[] = batches.flatMap((b: Batch) => b.agentRuns);
  const rows = new Map<string, { runs: number; met: number; cost: number }>();
  for (const r of all) {
    const t = rows.get(r.model) ?? { runs: 0, met: 0, cost: 0 };
    t.runs += 1;
    t.met += r.met ? 1 : 0;
    t.cost += r.cost;
    rows.set(r.model, t);
  }
  const cached = new Map(usage.models.map((m) => [m.model, m.inputTokens ? m.cacheReadTokens / m.inputTokens : 0]));
  return [...rows.entries()]
    .map(([model, t]) => ({ model, ...t, cached: cached.get(model) }))
    .sort((a, b) => b.runs - a.runs);
})();

export function Results() {
  const [all, setAll] = useState(false);
  const shown = all ? newestFirst : newestFirst.slice(0, 20);
  return (
    <main className="results-page">
      <header className="page-head">
        <h1>Results</h1>
        <p className="lede">How often the agents met their goal, what it cost, and how that changed. Every row opens the report built from its logs.</p>
      </header>

      <section>
        <h2 className="section-title">The shared team goal, over time</h2>
        <p className="muted section-note">
          Three agents, one goal over three simulated days: a home for all, a bed each, an iron pickaxe each and 10
          cooked meat stored. Same world throughout; the models, home design and code changed between milestones.
        </p>
        <ol className="milestones">
          {milestones.map((m) => (
            <li key={m.when + m.team}>
              <div className="ms-head">
                <span className="ms-when">{m.when}</span>
                <span className="ms-team">{m.team}</span>
              </div>
              <div className="ms-bar" role="img" aria-label={`${m.met} of ${m.runs} runs met the goal`}>
                <span style={{ width: pct(m.met / m.runs) }} />
              </div>
              <div className="ms-figures">
                <strong>{pct(m.met / m.runs)}</strong>
                <span>
                  {m.met} of {m.runs} runs{m.costPerSuccess ? ` · ${m.costPerSuccess} per success` : ''}
                </span>
              </div>
              <p className="ms-note">
                {m.note} <a href={HASH.doc(m.source.doc, m.source.anchor)}>Source →</a>
              </p>
            </li>
          ))}
        </ol>
        <p className="fineprint">
          The mixed team’s cost is the estimate of the time; the latest is at billed rates. Costs for three Lunas before
          10 November were estimated with cached input priced in full, so they are left out.
        </p>
      </section>

      <section>
        <div className="stats">
          <div className="stat">
            <strong>{batches.length}</strong>
            <span>published batches and team runs</span>
          </div>
          <div className="stat">
            <strong>{runs.toLocaleString('en-GB')}</strong>
            <span>agent runs logged, every decision kept</span>
          </div>
          <div className="stat">
            <strong>{dollars(spent)}</strong>
            <span>model spend over all of them, as estimated at the time</span>
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-title">Every batch</h2>
        <div className="table-wrap">
          <table className="batches">
            <thead>
              <tr>
                <th>Batch</th>
                <th>Date</th>
                <th>Goal</th>
                <th>Models</th>
                <th>Met the goal</th>
                <th className="num">Cost</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((b: Batch) => (
                <tr key={b.path}>
                  <td>
                    <a href={HASH.doc(b.path)}>{b.name}</a>
                  </td>
                  <td>{day(b.started)}</td>
                  <td>{b.goals.join(', ')}</td>
                  <td>{b.models.join(', ')}</td>
                  <td>{outcome(b)}</td>
                  <td className="num">{dollars(b.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!all && newestFirst.length > shown.length && (
          <button type="button" className="button show-all" onClick={() => setAll(true)}>
            Show all {newestFirst.length}
          </button>
        )}
      </section>

      <section>
        <h2 className="section-title">By model</h2>
        <p className="muted section-note">
          Over every published run. Models were given different goals, so this is a count, not a ranking.
        </p>
        <div className="table-wrap">
          <table className="batches">
            <thead>
              <tr>
                <th>Model</th>
                <th className="num">Runs</th>
                <th className="num">Met the goal</th>
                <th className="num">Cost per run</th>
                <th className="num">Input read from cache</th>
              </tr>
            </thead>
            <tbody>
              {byModel.map((m) => (
                <tr key={m.model}>
                  <td>{m.model}</td>
                  <td className="num">{m.runs}</td>
                  <td className="num">{pct(m.met / m.runs)}</td>
                  <td className="num">{dollars(m.cost / m.runs)}</td>
                  <td className="num">{m.cached === undefined ? '–' : pct(m.cached)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
