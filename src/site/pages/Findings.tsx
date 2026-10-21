import { writeUps } from '../lib/docs';
import { HASH } from '../lib/route';

export function Findings() {
  return (
    <main>
      <header className="page-head">
        <h1>Findings</h1>
        <p className="lede">
          Each write-up reads one set of runs from their logs: how the agents behaved toward the goal, how
          they handled the unexpected, how they helped or hindered each other, and what in our own code
          got in their way. Newest first.
        </p>
      </header>
      <ol className="write-ups">
        {writeUps.map((w) => (
          <li key={w.path}>
            <a href={HASH.doc(w.path)}>
              <span className="number">{w.number}</span>
              <span>
                <strong>{w.title}</strong>
                {w.note && <span className="note">{w.note}</span>}
              </span>
            </a>
          </li>
        ))}
      </ol>
      <p className="muted">
        The numbers behind each are in the <a href={HASH.results}>batch reports</a>, built from the logs by code.
      </p>
    </main>
  );
}
