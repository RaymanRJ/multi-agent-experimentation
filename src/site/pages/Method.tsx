import { HASH } from '../lib/route';

// How runs are done, measured and judged, and what the numbers can't show. The long-form record is docs/limitations.md
// and docs/experiments.md, linked at the end.

const TERMS = [
  { term: 'Run', text: 'One agent playing one game, from a fresh world to its end: a goal, a model and a time limit.' },
  { term: 'Team run', text: 'Several agents in one world, on one shared goal.' },
  { term: 'Set', text: 'Several runs on the same code and settings, so their results can be pooled into a rate.' },
  { term: 'Frozen code', text: 'Code that does not change during a set. Fixes found mid-set wait for the next one.' },
];

const RULES = [
  'Every run starts in a fresh copy of the same world, from the same seed and starting area.',
  'The goal states an outcome, never the steps. Nothing in the prompt says how to reach it.',
  'No one intervenes during a run: no hints, no corrections, no hand-picked restarts.',
  'A run ends when the goal is met, when the agent gives up with a reason, or when its time or money runs out. A “done” claimed too early is refused once, and counted.',
  'Every decision is logged with the exact prompt and answer, so any run can be replayed and costed without calling a model again.',
];

const LOOP = [
  { step: 'Run', text: 'Agents get a goal and are left alone.' },
  { step: 'Read', text: 'Where they got stuck: what each was told, what it reasoned, what really happened.' },
  { step: 'Sort', text: 'A tool failed or misled it; it lacked information a person would have; or it was its own judgement.' },
  { step: 'Fix', text: 'Only the first two, each checked in the real game against the old code first.' },
  { step: 'Measure', text: 'A fresh set on frozen code, reported with its sample size.' },
];

const MEASURED = [
  { what: 'Outcome', text: 'Every part of the goal checked by code, and how long it took.' },
  { what: 'Behaviour', text: 'Which decisions worked, failed or were interrupted; loops; false claims of success; giving up.' },
  { what: 'Teamwork', text: 'Who did what, what was handed over, who asked whom, and whether they did it.' },
  { what: 'Cost', text: 'Tokens and dollars at the provider’s billed rates; time waiting on the model is recorded, never a limit.' },
];

const CAVEATS = [
  {
    title: 'One environment, one hard goal',
    text: 'The headline is about one shared three-day goal in one world. It says how far this structure takes these agents there, not how agents do everywhere.',
  },
  {
    title: 'Small samples',
    text: 'Ten runs is a wide estimate: 8 of 10 is consistent with a true rate anywhere from about 49% to 94%. Two sets of ten on the same code scored 7 and 8.',
  },
  {
    title: 'The setup changed between milestones',
    text: 'Models, the home design and the code all changed over time. Figures are compared within one setup, not across them.',
  },
  {
    title: 'Our own bugs shaped earlier results',
    text: 'For two weeks a reflex dug out the home’s door, and until 12 November a hunt started at home never left it. Results from those periods understate what the agents could do.',
  },
  {
    title: 'Costs before 12 November are estimates',
    text: 'They ran about 9% under the bill, and Luna costs before 10 November priced cached input in full. Current figures are calibrated to the actual bill.',
  },
  {
    title: 'The models already know the game',
    text: 'Nothing is trained here; the models came knowing Minecraft. In a private domain, tools and context would have to carry what a model can’t already know.',
  },
];

export function Method() {
  return (
    <main className="narrow method-page">
      <header className="page-head">
        <h1>Method and limits</h1>
        <p className="lede">How runs are done, measured and judged, and how far to trust the numbers.</p>
      </header>

      <section>
        <h2>Terms</h2>
        <dl className="layers">
          {TERMS.map((t) => (
            <div key={t.term}>
              <dt>{t.term}</dt>
              <dd>{t.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2>How a run works</h2>
        <ul className="case-points">
          {RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>How the system gets better</h2>
        <dl className="layers">
          {LOOP.map((item, i) => (
            <div key={item.step}>
              <dt>
                {i + 1}. {item.step}
              </dt>
              <dd>{item.text}</dd>
            </div>
          ))}
        </dl>
        <p className="muted">
          The agents’ own judgement is reported, never coached: coach it away in the prompt and you measure the coaching.
        </p>
      </section>

      <section>
        <h2>What gets measured</h2>
        <dl className="layers">
          {MEASURED.map((m) => (
            <div key={m.what}>
              <dt>{m.what}</dt>
              <dd>{m.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2>Limits</h2>
        <div className="caveats">
          {CAVEATS.map((c) => (
            <div className="caveat" key={c.title}>
              <strong>{c.title}</strong>
              <p>{c.text}</p>
            </div>
          ))}
        </div>
      </section>

      <aside className="appendix">
        <strong>The full record</strong>
        <p>Every known limitation in detail, and how batches and conditions are set up for fair comparison.</p>
        <a href={HASH.doc('limitations')}>All limitations →</a> · <a href={HASH.doc('experiments')}>Running experiments →</a>
      </aside>
    </main>
  );
}
