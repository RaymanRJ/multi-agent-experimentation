import { lessons, reps } from '../content/lessons';
import { HASH } from '../lib/route';

export function Home() {
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">An open testbed</p>
        <h1>What does it take to build AI agents that work on their own?</h1>
        <p className="lede">
          Not a better prompt, mostly. Agents here get a goal, a set of tools and a short account of their
          situation, and are left alone. When they get stuck, we read the logs and ask what failed: the tool,
          what the agent was told, or its own judgement. These are the lessons, about tools, context, shared
          state, the control loop and evaluation, for agents anywhere.
        </p>
        <p className="lede muted">
          The agents play Minecraft, alone and in teams of different models, because there an agent can be
          watched and a run repeated from the same seed. The game is the evidence, not the subject.
        </p>
        <div className="actions">
          <a className="button primary" href={HASH.lessons}>
            Read the lessons
          </a>
          <a className="button" href={HASH.how}>
            How it’s built
          </a>
        </div>
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
            lacked information a person in its place would have; or it was its own judgement. Only the first two
            are changed, and each fix is checked in the real environment. Judgement is reported, because that is
            what is being measured.
          </p>
          <p>
            Fixes to tools and information alone took the same team of three models from one or two parts of a
            four-part goal to three, and cut its failed decisions by about two fifths. With reflexes and shared
            sightings added, it met all four once, with no deaths.
          </p>
          <a className="more" href={HASH.doc('results/write-ups/06-team-base', 'how-this-testbed-gets-better-from-where-the-agents-get-stuck')}>
            Every fix, beside the same problem in real systems →
          </a>
        </div>
        <figure className="chart" aria-label="Parts of the goal met per rep">
          <figcaption>Parts of the four-part team goal met, rep by rep</figcaption>
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

      <section className="links">
        <a className="tile" href={HASH.findings}>
          <strong>Case studies</strong>
          <span>Each set of runs, what it teaches about building agents, and the evidence</span>
        </a>
        <a className="tile" href={HASH.results}>
          <strong>Results</strong>
          <span>Every batch and team run, as its report was built from the logs</span>
        </a>
        <a className="tile" href={HASH.doc('limitations')}>
          <strong>Limitations</strong>
          <span>What the agents can’t do, and what the numbers can’t show</span>
        </a>
      </section>
    </main>
  );
}
