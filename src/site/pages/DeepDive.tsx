import { lessons } from '../content/lessons';
import { REPO } from '../lib/docs';
import { HASH } from '../lib/route';

/** A reading order for someone new to the project: how it works, what it teaches, then one case in full. */
const PATH = [
  {
    title: 'How it’s built',
    body: 'The world, the agents, the skill library, the model backends and the control loop that keeps the model out of the fast path.',
    href: HASH.how,
  },
  {
    title: 'What it teaches',
    body: 'Lessons on tools, context, shared state, the control loop and evaluation, each with the runs that showed it.',
    href: HASH.lessons,
  },
  {
    title: 'One case in full',
    body: 'The latest write-up: three agents on one shared goal, from under 1 in 3 to 8 in 10, and what changed along the way.',
    href: HASH.doc('results/write-ups/07-luna-majority'),
  },
];

const GROUPS = [
  {
    title: 'Evidence',
    items: [
      { title: 'Case studies', body: 'Every set of runs written up: how the agents organised, coped and helped or hindered each other.', href: HASH.findings },
      { title: 'Results', body: 'Every batch and team run, oldest first, with the report built from its logs.', href: HASH.results },
      { title: 'Stats', body: 'Success, cost, tokens and prompt caching across all runs.', href: HASH.stats },
    ],
  },
  {
    title: 'Caveats and source',
    items: [
      { title: 'Limitations', body: 'What the agents can’t do, what the numbers can’t show, and which results compare.', href: HASH.doc('limitations') },
      { title: 'Source and data', body: 'The code, the docs and every published report, on GitHub.', href: REPO, external: true },
    ],
  },
];

export function DeepDive() {
  return (
    <main className="deep">
      <header className="page-head">
        <h1>The technical deep dive</h1>
        <p className="lede">
          AI agents given a goal, a fixed set of skills and a short account of their situation, then left alone. The
          model decides; deterministic code does. Every decision is logged, so every number here traces back to a run.
        </p>
      </header>

      <section>
        <h2 className="section-title">Start here</h2>
        <ol className="path">
          {PATH.map((p, i) => (
            <li key={p.title}>
              <a href={p.href}>
                <span className="step-n">{i + 1}</span>
                <span>
                  <strong>{p.title}</strong>
                  <span>{p.body}</span>
                </span>
              </a>
            </li>
          ))}
        </ol>
      </section>

      {GROUPS.map((g) => (
        <section key={g.title}>
          <h2 className="section-title">{g.title}</h2>
          <div className="links">
            {g.items.map((t) => (
              <a className="tile" key={t.title} href={t.href} {...('external' in t && t.external ? { target: '_blank', rel: 'noreferrer' } : {})}>
                <strong>{t.title}</strong>
                <span>{t.body}</span>
              </a>
            ))}
          </div>
        </section>
      ))}

      <section>
        <h2 className="section-title">Seven lessons at a glance</h2>
        <ul className="lesson-list">
          {lessons.map((l) => (
            <li key={l.id}>
              <span className="eyebrow">{l.theme}</span>
              <a href={HASH.lessons}>{l.title}</a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
