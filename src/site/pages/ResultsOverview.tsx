import { batches } from 'virtual:batches';
import type { Batch } from '../lib/batches';
import { dollars } from './BatchParts';

// The Results page's overview: how often runs met their goal, over every published report. Single
// agents count runs; teams count teams, since a team goal is met or missed by the team as a whole.

interface Tally {
  met: number;
  of: number;
}

/** The 95% Wilson interval for met of `of`, as fractions; the same interval the reports use. */
function wilson({ met, of }: Tally): [number, number] {
  if (!of) return [0, 0];
  const z = 1.96;
  const p = met / of;
  const centre = (p + (z * z) / (2 * of)) / (1 + (z * z) / of);
  const half = (z * Math.sqrt((p * (1 - p)) / of + (z * z) / (4 * of * of))) / (1 + (z * z) / of);
  return [Math.max(0, centre - half), Math.min(1, centre + half)];
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const add = (map: Map<string, Tally>, key: string, met: number, of: number) => {
  const t = map.get(key) ?? { met: 0, of: 0 };
  map.set(key, { met: t.met + met, of: t.of + of });
};

const single = batches.filter((b: Batch) => b.kind === 'batch').flatMap((b) => b.conditions);
const byGoal = new Map<string, Tally>();
const byModel = new Map<string, Tally>();
for (const c of single) {
  add(byGoal, c.goal, c.met, c.runs);
  add(byModel, c.model, c.met, c.runs);
}
const teamGoals = new Map<string, Tally & { best: number; parts: number }>();
for (const b of batches.filter((b: Batch) => b.kind === 'team')) {
  for (const t of b.teams) {
    const goal = b.goals[0] ?? 'team';
    const g = teamGoals.get(goal) ?? { met: 0, of: 0, best: 0, parts: 0 };
    g.met += t.met ? 1 : 0;
    g.of += 1;
    if (t.parts && t.partsMet / t.parts >= g.best / (g.parts || 1)) [g.best, g.parts] = [t.partsMet, t.parts];
    teamGoals.set(goal, g);
  }
}

const sum = (rows: Tally[]): Tally => rows.reduce((s, t) => ({ met: s.met + t.met, of: s.of + t.of }), { met: 0, of: 0 });
const scripted = byModel.get('Scripted baseline') ?? { met: 0, of: 0 };
const withModel = sum([...byModel].filter(([m]) => m !== 'Scripted baseline').map(([, t]) => t));
const teams = sum([...teamGoals.values()]);
const paid = batches.reduce((n: number, b: Batch) => n + b.cost, 0);
const runs = batches.reduce((n: number, b: Batch) => n + b.runs, 0);
const models = new Set(batches.flatMap((b: Batch) => b.models).filter((m: string) => m !== 'Scripted baseline'));
const byRate = (a: [string, Tally], b: [string, Tally]) => b[1].met / b[1].of - a[1].met / a[1].of || b[1].of - a[1].of;

/** One row: a name, the rate as a dot within its shaded 95% interval, and the count. */
function RateRow({ name, tally, unit, note, mono }: { name: string; tally: Tally; unit: string; note?: string; mono?: boolean }) {
  const [low, high] = wilson(tally);
  const rate = tally.of ? tally.met / tally.of : 0;
  return (
    <li className="rate-row">
      <span className="rate-name">{mono ? <code>{name}</code> : name}</span>
      <span
        className="interval rate-bar"
        title={`${tally.met} of ${tally.of} ${unit} met the goal (${pct(rate)}); 95% interval ${pct(low)} to ${pct(high)}`}
      >
        <span className="interval-range" style={{ left: pct(low), width: pct(high - low) }} />
        <span className="interval-dot" style={{ left: pct(rate) }} />
      </span>
      <span className="rate-count">
        <strong>{pct(rate)}</strong> {tally.met} of {tally.of} {unit}
        {note && <span className="muted"> · {note}</span>}
      </span>
    </li>
  );
}

export function ResultsOverview() {
  return (
    <section className="overview" aria-label="Overview">
      <div className="stats">
        <div className="stat">
          <strong>{pct(withModel.met / withModel.of)}</strong>
          <span>of single-agent runs with a model deciding met their goal ({withModel.met} of {withModel.of})</span>
        </div>
        <div className="stat">
          <strong>{pct(scripted.met / scripted.of)}</strong>
          <span>for the scripted baseline, no model, on the goals it was given ({scripted.met} of {scripted.of})</span>
        </div>
        <div className="stat">
          <strong>{teams.met} of {teams.of}</strong>
          <span>teams met their shared goal</span>
        </div>
        <div className="stat">
          <strong>{dollars(paid)}</strong>
          <span>spent on paid models, over {runs.toLocaleString('en-GB')} runs in {batches.length} batches and team runs</span>
        </div>
      </div>

      <div className="overview-grid">
        <div>
          <h2>By goal</h2>
          <ul className="rates">
            {[...byGoal].sort(byRate).map(([goal, t]) => (
              <RateRow key={goal} name={goal} tally={t} unit="runs" mono />
            ))}
            {[...teamGoals].sort(byRate).map(([goal, t]) => (
              <RateRow
                key={goal}
                name={goal}
                tally={t}
                unit="teams"
                mono
                note={!t.met && t.parts ? `best team: ${t.best} of ${t.parts} parts` : undefined}
              />
            ))}
          </ul>
        </div>
        <div>
          <h2>By model, single agents</h2>
          <ul className="rates">
            {[...byModel].sort(byRate).map(([model, t]) => (
              <RateRow key={model} name={model} tally={t} unit="runs" />
            ))}
          </ul>
          <p className="muted small">
            Models were given different goals ({models.size} models in all), so these rows are not a ranking: compare
            models within a batch, below.
          </p>
        </div>
      </div>
      <p className="muted small">
        Each dot is the share of runs (or teams) that met the goal; the shaded band is its 95% Wilson interval, wide
        where there were few runs. Counted from every report below, including runs made before fixes they led to.
      </p>
    </section>
  );
}
