import type { Batch, Condition } from '../lib/batches';

/** "2026-10-21T18:01Z" -> "21 Oct 2026, 18:01 UTC". */
export function when(started: string): string {
  const d = new Date(started.replace('Z', ':00Z'));
  if (Number.isNaN(d.getTime())) return '';
  const day = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return `${day}, ${started.slice(11, 16)} UTC`;
}

/** Game time as the reports give it: 20 ticks a second, "19:01" or "1:02:30". */
export function gameTime(ticks: number): string {
  const s = Math.round(ticks / 20);
  const [h, m, sec] = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60];
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export const dollars = (usd: number) => (usd === 0 ? 'free' : usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`);

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * What a batch achieved, in its report's own terms: runs that met the goal; for a team run, teams that
 * did, and how much of the goal the best team had standing at the end.
 */
export function outcome(batch: Batch): { share: number; text: string; detail: string } {
  const counted = batch.conditions.reduce((n, c) => n + c.runs, 0);
  if (batch.kind === 'team' && batch.teams.length) {
    const met = batch.teams.filter((t) => t.met).length;
    const withParts = batch.teams.filter((t) => t.parts > 0);
    const best = withParts.reduce((b, t) => (t.partsMet / t.parts > b.partsMet / (b.parts || 1) ? t : b), { partsMet: 0, parts: 0 });
    return {
      share: met / batch.teams.length,
      text: `${met} of ${plural(batch.teams.length, 'team')} met the goal`,
      detail: !met && best.parts ? `best: ${best.partsMet} of ${best.parts} parts of the goal` : `${batch.met} of ${plural(counted, 'agent run')}`,
    };
  }
  return {
    share: counted ? batch.met / counted : 0,
    text: `${batch.met} of ${plural(counted, 'run')} met the goal`,
    detail: counted < batch.runs ? `${batch.runs - counted} not counted` : '',
  };
}

export function OutcomeBar({ batch }: { batch: Batch }) {
  const o = outcome(batch);
  return (
    <div className="outcome" title={`${o.text}${o.detail ? `; ${o.detail}` : ''}`}>
      <div className="outcome-track">
        <div className="outcome-fill" style={{ width: `${Math.round(o.share * 100)}%` }} />
      </div>
      <span className="outcome-text">
        <strong>{o.text}</strong>
        {o.detail && <span>{o.detail}</span>}
      </span>
    </div>
  );
}

/** The success rate with its 95% interval, on a 0-100% track: the range shaded, the rate a dot. */
function Interval({ c }: { c: Condition }) {
  const rate = c.runs ? c.met / c.runs : 0;
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  return (
    <span className="interval" title={`${c.met} of ${c.runs} met; 95% interval ${pct(c.ciLow)} to ${pct(c.ciHigh)}`}>
      <span className="interval-range" style={{ left: pct(c.ciLow), width: pct(c.ciHigh - c.ciLow) }} />
      <span className="interval-dot" style={{ left: pct(rate) }} />
    </span>
  );
}

/** A report's "Success per condition" block, as a table. Columns that say nothing here are left out. */
export function ConditionTable({ conditions }: { conditions: Condition[] }) {
  const varies = (key: keyof Condition) => new Set(conditions.map((c) => c[key])).size > 1;
  const show = {
    goal: varies('goal'),
    memory: varies('memory'),
    progress: varies('progress'),
    stance: varies('stance'),
    scenario: varies('scenario'),
    excluded: conditions.some((c) => c.excluded > 0),
  };
  const same = conditions[0];
  const fixed = same
    ? [
        !show.goal && `goal ${same.goal}`,
        !show.memory && same.memory !== '-' && `memory ${same.memory}`,
        !show.progress && same.progress !== '-' && `progress list ${same.progress}`,
        !show.stance && same.stance !== '-' && `stance ${same.stance}`,
        !show.scenario && `scenario ${same.scenario}`,
      ].filter(Boolean)
    : [];
  return (
    <div className="conditions">
      {fixed.length > 0 && <p className="muted">Every condition: {fixed.join(' · ')}.</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {show.goal && <th>Goal</th>}
              <th>Model</th>
              {show.memory && <th>Memory</th>}
              {show.progress && <th>Progress list</th>}
              {show.stance && <th>Stance</th>}
              {show.scenario && <th>Scenario</th>}
              <th>Met</th>
              <th className="interval-head">Rate, 95% interval</th>
              <th className="num">Game time*</th>
              <th className="num">Decisions*</th>
              <th className="num">Tokens in</th>
              <th className="num">Median wait</th>
              <th className="num">Cost</th>
              {show.excluded && <th className="num">Excluded</th>}
            </tr>
          </thead>
          <tbody>
            {conditions.map((c, i) => (
              <tr key={i}>
                {show.goal && <td><code>{c.goal}</code></td>}
                <td>{c.model}</td>
                {show.memory && <td>{c.memory}</td>}
                {show.progress && <td>{c.progress}</td>}
                {show.stance && <td>{c.stance}</td>}
                {show.scenario && <td>{c.scenario}</td>}
                <td className="met">{c.met} of {c.runs}</td>
                <td><Interval c={c} /></td>
                <td className="num">{c.ticks === null ? '–' : gameTime(c.ticks)}</td>
                <td className="num">{c.decisions ?? '–'}</td>
                <td className="num">{c.tokensIn.toLocaleString('en-GB')}</td>
                <td className="num">{c.medianMs < 1000 ? `${c.medianMs} ms` : `${(c.medianMs / 1000).toFixed(1)} s`}</td>
                <td className="num">{dollars(c.costUsd)}</td>
                {show.excluded && <td className="num">{c.excluded}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        * Median over the runs that met the goal. Success uses each run's stance rule; the interval is the 95% Wilson
        interval, so a few runs leave it wide. Median wait is the model's median answer time.
      </p>
    </div>
  );
}
