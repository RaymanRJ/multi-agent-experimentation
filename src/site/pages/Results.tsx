import { useState } from 'react';
import { batches, writeUpOf } from 'virtual:batches';
import { HASH } from '../lib/route';
import { OutcomeBar, dollars, when } from './BatchParts';

type Kind = 'all' | 'batch' | 'team';

const KINDS: Array<{ id: Kind; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'batch', label: 'One agent per world' },
  { id: 'team', label: 'Teams' },
];

const newestFirst = [...batches].sort((a, b) => b.started.localeCompare(a.started));
const goals = [...new Set(newestFirst.flatMap((b) => b.goals))];
const paid = batches.reduce((n, b) => n + b.cost, 0);
const runs = batches.reduce((n, b) => n + b.runs, 0);
const models = new Set(batches.flatMap((b) => b.models).filter((m) => m !== 'Scripted baseline'));

export function Results() {
  const [kind, setKind] = useState<Kind>('all');
  const [goal, setGoal] = useState<string | null>(null);
  const shown = newestFirst.filter((b) => (kind === 'all' || b.kind === kind) && (!goal || b.goals.includes(goal)));

  return (
    <main>
      <header className="page-head">
        <h1>Results</h1>
        <p className="lede">
          Every batch and team run, as its report was built from the logs by code: no judgement, newest first. A report
          appears here as soon as it is published. What the runs mean is in the <a href={HASH.findings}>findings</a>.
        </p>
      </header>

      <div className="stats">
        <div className="stat"><strong>{batches.length}</strong><span>batches and team runs</span></div>
        <div className="stat"><strong>{runs.toLocaleString('en-GB')}</strong><span>runs</span></div>
        <div className="stat"><strong>{models.size}</strong><span>models, and a scripted baseline</span></div>
        <div className="stat"><strong>{dollars(paid)}</strong><span>spent on paid models</span></div>
      </div>

      <div className="filters" role="group" aria-label="Filter batches">
        {KINDS.map((k) => (
          <button key={k.id} type="button" className="chip" aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>
            {k.label}
          </button>
        ))}
        <span className="filters-gap" />
        {goals.map((g) => (
          <button key={g} type="button" className="chip mono" aria-pressed={goal === g} onClick={() => setGoal(goal === g ? null : g)}>
            {g}
          </button>
        ))}
      </div>

      <ol className="batches">
        {shown.map((b) => {
          const writeUp = writeUpOf[b.name];
          return (
            <li key={b.path} className="batch">
              <div className="batch-head">
                <a className="batch-name" href={HASH.doc(b.path)}>
                  {b.name}
                </a>
                <span className="batch-kind">{b.kind === 'team' ? 'Team run' : 'Batch'}</span>
                <span className="batch-when">{when(b.started)}</span>
              </div>
              <div className="batch-goals">
                {b.goals.map((g) => (
                  <code key={g}>{g}</code>
                ))}
              </div>
              <p className="batch-who">{b.models.join(', ')}{b.kind === 'team' ? ', together' : ''}</p>
              <OutcomeBar batch={b} />
              <p className="batch-foot">
                <span>{b.runs} runs</span>
                <span>{dollars(b.cost)}</span>
                {b.tokensIn && <span>{b.tokensIn} / {b.tokensOut} tokens in / out</span>}
                {writeUp && (
                  <a href={HASH.doc(writeUp.path)}>Written up in: {writeUp.title}</a>
                )}
              </p>
            </li>
          );
        })}
      </ol>
      {shown.length === 0 && <p className="muted">No batch matches both filters.</p>}

      <p className="muted">
        What a run, a condition and a batch are, how batches are named, and why the logs aren't published:{' '}
        <a href={HASH.doc('results/README')}>about these results</a>. Which skills the agents chose and how often they
        worked: <a href={HASH.doc('results/skill-usage')}>skill usage</a>.
      </p>
    </main>
  );
}
