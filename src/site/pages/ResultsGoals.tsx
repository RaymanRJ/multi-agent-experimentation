import { batches } from 'virtual:batches';
import { GOALS, TEAM_GOALS } from '../../agents/src/goals';
import { goalNotes } from '../content/goals';
import type { Batch } from '../lib/batches';

// The Results page's goals: what each goal asks, in the words the agents are given (read from the
// agents' own goal list, so the page can't drift from what they were told), who tried it and how
// often it was met. Not ranked: a rate here says as much about who tried a goal as about the goal.

interface Tally {
  met: number;
  of: number;
}

interface GoalView {
  name: string;
  team: boolean;
  worlds: Set<string>;
  /** Met of tried, by model; for a team goal, by teams that model was in. */
  byModel: Map<string, Tally>;
  total: Tally;
  /** When it first ran: the order the cards are in. */
  first: string;
  /** For a team goal that no team met: the most parts one team had at the end. */
  best?: { met: number; of: number };
}

const views = new Map<string, GoalView>();
const view = (name: string, b: Batch): GoalView => {
  const v = views.get(name) ?? {
    name,
    team: TEAM_GOALS.has(name),
    worlds: new Set<string>(),
    byModel: new Map<string, Tally>(),
    total: { met: 0, of: 0 },
    first: b.started,
  };
  if (b.started < v.first) v.first = b.started;
  views.set(name, v);
  return v;
};
const add = (map: Map<string, Tally>, key: string, met: number, of: number) => {
  const t = map.get(key) ?? { met: 0, of: 0 };
  map.set(key, { met: t.met + met, of: t.of + of });
};

for (const b of batches as Batch[]) {
  if (b.kind === 'batch') {
    for (const c of b.conditions) {
      const v = view(c.goal, b);
      if (c.scenario) v.worlds.add(c.scenario);
      add(v.byModel, c.model, c.met, c.runs);
      v.total = { met: v.total.met + c.met, of: v.total.of + c.runs };
    }
  } else {
    // A team goal is met or missed by the team as a whole, so teams are counted, not agents.
    const v = view(b.goals[0] ?? 'team', b);
    for (const c of b.conditions) if (c.scenario) v.worlds.add(c.scenario);
    for (const t of b.teams) {
      for (const m of b.models) add(v.byModel, m, t.met ? 1 : 0, 1);
      v.total = { met: v.total.met + (t.met ? 1 : 0), of: v.total.of + 1 };
      if (t.parts && (!v.best || t.partsMet / t.parts > v.best.met / v.best.of)) v.best = { met: t.partsMet, of: t.parts };
    }
  }
}

/** Each task with its guided variant, if any, in the order the tasks first ran. */
const tasks = [...views.values()]
  .filter((v) => !v.name.endsWith('-guided') || !views.has(v.name.replace(/-guided$/, '')))
  .map((v) => ({ plain: v, guided: views.get(`${v.name}-guided`) }))
  .sort((a, b) => {
    const first = (t: typeof a) => [t.plain.first, t.guided?.first ?? t.plain.first].sort()[0]!;
    return first(a).localeCompare(first(b));
  });

const count = (t: Tally, unit: string) => `${t.met} of ${t.of} ${t.of === 1 ? unit.replace(/s$/, '') : unit}`;

function Outcome({ goal }: { goal: GoalView }) {
  const unit = goal.team ? 'teams' : 'runs';
  return (
    <div className="goal-outcome">
      <p className="goal-total">
        <strong>{count(goal.total, unit)}</strong> met it
        {goal.best && !goal.total.met && <span className="muted"> · best team: {goal.best.met} of {goal.best.of} parts</span>}
      </p>
      <ul className="goal-models">
        {[...goal.byModel].map(([model, t]) => (
          <li key={model}>
            <span>{model}</span>
            <span className="muted">{count(t, unit)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GoalCard({ plain, guided }: { plain: GoalView; guided?: GoalView }) {
  const worlds = [...new Set([...plain.worlds, ...(guided?.worlds ?? [])])].sort().join(' and ');
  return (
    <article className="goal-card">
      <header className="goal-head">
        <h3>
          <code>{plain.name}</code>
        </h3>
        <span className="goal-tags">
          <span className="goal-tag">{plain.team ? 'team' : 'one agent'}</span>
          {worlds && <span className="goal-tag">{worlds}</span>}
        </span>
      </header>
      {goalNotes[plain.name] && <p className="goal-why">{goalNotes[plain.name]}</p>}
      <blockquote className="goal-text">{GOALS[plain.name] ?? 'Not a preset goal.'}</blockquote>
      <Outcome goal={plain} />
      {guided && (
        <div className="goal-guided">
          <h4>
            With the steps spelled out: <code>{guided.name}</code>
          </h4>
          <blockquote className="goal-text">{GOALS[guided.name]}</blockquote>
          <Outcome goal={guided} />
        </div>
      )}
    </article>
  );
}

export function ResultsGoals() {
  return (
    <section className="goals" aria-labelledby="goals-heading">
      <h2 id="goals-heading">The goals</h2>
      <p className="muted">
        What each goal asks, word for word as the agents are told it, in the order the goals were first tried. Who
        tried a goal matters as much as the goal: compare models within a card, not one card's total with another's.
      </p>
      <div className="goal-grid">
        {tasks.map((t) => (
          <GoalCard key={t.plain.name} plain={t.plain} guided={t.guided} />
        ))}
      </div>
    </section>
  );
}
