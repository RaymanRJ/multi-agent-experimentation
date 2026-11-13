import { lessons, reps } from '../content/lessons';
import { REPO } from '../lib/docs';
import { HASH } from '../lib/route';

const TILES = [
  { title: 'Lessons', body: 'What the runs teach about building agents: tools, context, shared state, the control loop, evaluation and the improvement loop.', href: HASH.lessons },
  { title: 'Case studies', body: 'Each set of runs written up: how the agents organised, kept the goal in view, met the unexpected, and helped or hindered each other.', href: HASH.findings },
  { title: 'Results', body: 'Every batch and team run, oldest first, as its report was built from the logs.', href: HASH.results },
  { title: 'Stats', body: 'Success, cost, tokens and prompt caching across all runs.', href: HASH.stats },
  { title: 'Architecture', body: 'How it’s built: the world, the agents’ bodies, the skill library, the model backends and the control loop.', href: HASH.how },
  { title: 'Limitations', body: 'What the agents can’t do, what the numbers can’t show, and which results compare.', href: HASH.doc('limitations') },
];

export function DeepDive() {
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">The technical deep dive</p>
        <h1>How the agents are built, run and measured</h1>
        <p className="lede">
          Agents get a goal, a finite set of skills and a compressed account of their situation, and are left alone. The
          model decides; deterministic code does: it chooses a goal (gather wood, build a shelter, mine ore), and code
          carries it out, retries, gives up and reports back. Every decision is logged with what the agent was told and
          why it chose, so every number here traces back to a run.
        </p>
        <p className="lede muted">
          The environment is Minecraft, on a seeded Paper server, with bots on mineflayer and models behind one
          backend interface (Claude, GPT and a free local model through Ollama). Failures are sorted three ways (the
          tool, missing information, or the agent’s own judgement), and only the first two are changed.
        </p>
        <div className="actions">
          <a className="button primary" href={HASH.how}>
            Architecture
          </a>
          <a className="button" href={REPO} target="_blank" rel="noreferrer">
            Source and data on GitHub
          </a>
        </div>
      </section>

      <section className="links six">
        {TILES.map((t) => (
          <a className="tile" key={t.title} href={t.href}>
            <strong>{t.title}</strong>
            <span>{t.body}</span>
          </a>
        ))}
      </section>

      <section>
        <h2 className="section-title">Lessons so far</h2>
        <div className="cards">
          {lessons.map((lesson) => (
            <article className="card" key={lesson.part}>
              <p className="eyebrow">{lesson.part}</p>
              <h3>{lesson.title}</h3>
              <p>{lesson.body}</p>
              <p className="evidence">{lesson.evidence}</p>
              <a className="more" href={HASH.doc('lessons', lesson.anchor)}>
                More on {lesson.part.toLowerCase()} →
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="split">
        <div>
          <h2 className="section-title">The structure is the deliverable</h2>
          <p>
            The agents are never coached. A stuck point is sorted three ways: a tool failed or misled the agent; it
            lacked information a person in its place would have; or it was its own judgement. Only the first two are
            changed, and each fix is checked in the real environment. Judgement is reported, because that is what is
            being measured.
          </p>
          <p>
            Fixes to tools and information alone took the same team of three models from one or two parts of a
            four-part goal to three, and cut its failed decisions by about two fifths. Later, three of the cheapest
            model met the whole goal in 8 of 10 runs on one commit.
          </p>
          <a className="more" href={HASH.doc('results/write-ups/06-team-base', 'how-this-testbed-gets-better-from-where-the-agents-get-stuck')}>
            Every fix, beside the same problem in real systems →
          </a>
        </div>
        <figure className="chart" aria-label="Parts of the goal met per rep">
          <figcaption>Parts of the four-part team goal met, rep by rep (mixed team, October)</figcaption>
          <ol>
            {reps.map((rep) => (
              <li key={rep.label}>
                <span className="bar-label">{rep.label}</span>
                <span className="bar-track">
                  <span className="bar" style={{ width: `${(rep.met / 4) * 100}%` }}>
                    {rep.met}
                  </span>
                </span>
                <span className="bar-note">{rep.note}</span>
              </li>
            ))}
          </ol>
          <p className="chart-foot">
            One rep each from tbase2 to tbase4, three each in tbase1 and tbase5: a sign, not proof. Same models,
            settings and world each time.
          </p>
        </figure>
      </section>
    </main>
  );
}
