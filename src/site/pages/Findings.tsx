import { writeUps } from '../lib/docs';
import { HASH } from '../lib/route';

export function Findings() {
  return (
    <main>
      <header className="page-head">
        <h1>Case studies</h1>
        <p className="lede">
          Each write-up reads one set of runs from their logs. It opens with what those runs teach about building
          agents, then gives the evidence: what the agents did toward the goal and away from it, how they met the
          unexpected and each other, and what in our own code got in their way. Newest first.
        </p>
      </header>
      <ol className="write-ups">
        {writeUps.map((w) => (
          <li key={w.path}>
            <a href={HASH.doc(w.path)}>
              <span className="number">{w.number}</span>
              <span>
                <strong>{w.title}</strong>
                {w.lesson && <span className="lesson">{w.lesson}</span>}
                {w.note && <span className="note">{w.note}</span>}
              </span>
            </a>
          </li>
        ))}
      </ol>
      <p className="muted">
        The lessons drawn from all of them are in <a href={HASH.lessons}>one place</a>. The numbers behind each are
        in the <a href={HASH.results}>batch reports</a>, built from the logs by code.
      </p>
    </main>
  );
}
