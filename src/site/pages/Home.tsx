import { findings, reps } from '../content/findings';
import { HASH } from '../lib/route';

export function Home() {
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">An open experiment</p>
        <h1>What do AI agents do when they're given a goal, a set of tools, and then left alone?</h1>
        <p className="lede">
          Several agents, each driven by a different model, share one world and one goal. Nobody tells
          them how to reach it, and nobody steps in when they get stuck. Every decision is logged, so we
          can read how they planned, recovered and worked together, and what it cost.
        </p>
        <p className="lede muted">
          The world is Minecraft, because agents in it can be watched, the goals take real planning, and
          a fixed seed makes runs repeatable. The game isn't the subject: the same structure would hold
          for agents in a codebase, a ticket queue or a data pipeline.
        </p>
        <div className="actions">
          <a className="button primary" href={HASH.doc('results/write-ups/06-team-base')}>
            Read the latest write-up
          </a>
          <a className="button" href={HASH.how}>
            How it works
          </a>
        </div>
      </section>

      <section>
        <h2 className="section-title">What we've found so far</h2>
        <div className="cards">
          {findings.map((finding) => (
            <article className="card" key={finding.title}>
              <h3>{finding.title}</h3>
              <p>{finding.body}</p>
              <a className="more" href={finding.link.href}>
                {finding.link.label} →
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="split">
        <div>
          <h2 className="section-title">Better tools, not better prompts</h2>
          <p>
            The agents are never coached. When they get stuck, we read the logs and ask whether a tool
            failed or told them something false. If so, we fix the tool and run again; if it was their
            own judgement, we report it.
          </p>
          <p>
            Fixing tools and information alone took the same team from one or two parts of a four-part
            goal to three, and halved the decisions that failed.
          </p>
          <a className="more" href={HASH.doc('results/write-ups/06-team-base', 'how-this-testbed-gets-better-from-where-the-agents-get-stuck')}>
            Where they got stuck, and the same problem in real systems →
          </a>
        </div>
        <figure className="chart" aria-label="Parts of the goal met per rep">
          <figcaption>Parts of the four-part goal met, rep by rep</figcaption>
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
            One rep each after the first run: a sign, not proof. Same models, settings and world each time.
          </p>
        </figure>
      </section>

      <section className="links">
        <a className="tile" href={HASH.findings}>
          <strong>Findings</strong>
          <span>Every write-up, from the first local-model runs to teams of three</span>
        </a>
        <a className="tile" href={HASH.results}>
          <strong>Results</strong>
          <span>All batch reports, generated from the logs</span>
        </a>
        <a className="tile" href={HASH.doc('limitations')}>
          <strong>Limitations</strong>
          <span>What the measurements can and can't show</span>
        </a>
      </section>
    </main>
  );
}
