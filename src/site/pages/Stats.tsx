import { batches } from 'virtual:batches';
import type { AgentRun, Batch } from '../lib/batches';
import { HASH } from '../lib/route';
import { dollars } from './BatchParts';

// A high-level count over every published report: how many runs each model played, how many decisions
// it made and what they cost. One agent in one run is one run, so a three-agent team rep is three.

interface ModelTotals {
  model: string;
  runs: number;
  decisions: number;
  cost: number;
  deaths: number;
  met: number;
}

const all: AgentRun[] = batches.flatMap((b: Batch) => b.agentRuns);
const byModel = new Map<string, ModelTotals>();
for (const r of all) {
  const t = byModel.get(r.model) ?? { model: r.model, runs: 0, decisions: 0, cost: 0, deaths: 0, met: 0 };
  t.runs += 1;
  t.decisions += r.decisions;
  t.cost += r.cost;
  t.deaths += r.deaths;
  t.met += r.met ? 1 : 0;
  byModel.set(r.model, t);
}
const rows = [...byModel.values()].sort((a, b) => b.runs - a.runs || b.decisions - a.decisions);
const total = rows.reduce(
  (s, t) => ({ runs: s.runs + t.runs, decisions: s.decisions + t.decisions, cost: s.cost + t.cost, deaths: s.deaths + t.deaths, met: s.met + t.met }),
  { runs: 0, decisions: 0, cost: 0, deaths: 0, met: 0 },
);
const paid = rows.filter((t) => t.cost > 0);
const perDecision = (t: ModelTotals) => t.cost / t.decisions;
const cheapest = [...paid].sort((a, b) => perDecision(a) - perDecision(b))[0];
const dearest = [...paid].sort((a, b) => perDecision(b) - perDecision(a))[0];
const scripted = byModel.get('Scripted baseline');

const n = (x: number) => x.toLocaleString('en-GB');
const one = (x: number) => (x >= 10 ? Math.round(x).toString() : x.toFixed(1));
const cents = (usd: number) => `${(usd * 100).toFixed(2)}¢`;

export function Stats() {
  return (
    <main>
      <header className="page-head">
        <h1>Stats</h1>
        <p className="lede">
          The whole project in a few numbers: how many times each model has played, how many decisions it made, and
          what that cost.
        </p>
      </header>

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
          <strong>{dollars(total.cost)}</strong>
          <span>spent on paid models</span>
        </div>
        <div className="stat">
          <strong>{n(total.met)}</strong>
          <span>runs that met their goal ({Math.round((total.met / total.runs) * 100)}%)</span>
        </div>
        <div className="stat">
          <strong>{n(total.deaths)}</strong>
          <span>deaths in the game</span>
        </div>
        <div className="stat">
          <strong>{batches.length}</strong>
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
        <li>
          The scripted baseline, with no model at all, met its goal in {scripted ? `${scripted.met} of ${scripted.runs}` : 'none'} runs:
          the control that says whether a model adds anything.
        </li>
      </ul>

      <p className="muted small">
        Counted from the {batches.length} published reports on the <a href={HASH.results}>Results</a> page: every agent
        in every run they cover. Proof runs (one rep, to check a fix) are not published, so they are not here. Models had
        different goals, so a row is a count, not a ranking. A team agent's run counts as met when its team met the goal.
        The local model and the scripted baseline cost nothing.
      </p>
    </main>
  );
}
