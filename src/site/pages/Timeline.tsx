import { useState } from 'react';
import { batches, writeUpOf } from 'virtual:batches';
import { changes } from 'virtual:timeline';
import type { Batch } from '../lib/batches';
import { REPO } from '../lib/docs';
import type { Change, ChangeKind } from '../lib/timeline';
import { HASH } from '../lib/route';
import { OutcomeBar, dollars } from './BatchParts';

type Filter = 'tests' | ChangeKind;

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'tests', label: 'Tests' },
  { id: 'agents', label: 'Agent code' },
  { id: 'docs', label: 'Write-ups and docs' },
  { id: 'site', label: 'Site' },
];

const KIND_LABEL: Record<ChangeKind, string> = { agents: 'Agent code', docs: 'Docs', site: 'Site' };

type Event = { at: string; test: Batch } | { at: string; change: Change };

const byName = new Map(batches.map((b) => [b.name, b]));
/** How many changes name each batch: what it led to. */
const ledTo = new Map<string, number>();
for (const c of changes) for (const name of c.runs) ledTo.set(name, (ledTo.get(name) ?? 0) + 1);

const events: Event[] = [
  ...batches.map((b) => ({ at: new Date(b.started.replace('Z', ':00Z')).toISOString(), test: b })),
  ...changes.map((c) => ({ at: c.at, change: c })),
].sort((a, b) => b.at.localeCompare(a.at));

const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const time = (iso: string) => iso.slice(11, 16);

const agentChanges = changes.filter((c) => c.kind === 'agents').length;
const days = new Set(events.map((e) => e.at.slice(0, 10))).size;

export function Timeline() {
  const [shown, setShown] = useState<Set<Filter>>(() => new Set<Filter>(['tests', 'agents']));
  const toggle = (f: Filter) =>
    setShown((s) => {
      const next = new Set(s);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });

  const visible = events.filter((e) => ('test' in e ? shown.has('tests') : shown.has(e.change.kind)));
  const groups: Array<{ day: string; events: Event[] }> = [];
  for (const e of visible) {
    const d = day(e.at);
    if (groups.at(-1)?.day !== d) groups.push({ day: d, events: [] });
    groups.at(-1)!.events.push(e);
  }

  return (
    <main>
      <header className="page-head">
        <h1>Timeline</h1>
        <p className="lede">
          Every change to the testbed and every test run on it, in the order they happened. Read down from a test to
          see what it ran on; read up from it to see what it led to. A change that cites a run was usually found by
          reading that run’s logs.
        </p>
      </header>

      <div className="stats">
        <div className="stat"><strong>{batches.length}</strong><span>tests: batches and team runs</span></div>
        <div className="stat"><strong>{agentChanges}</strong><span>changes to the agents’ code</span></div>
        <div className="stat"><strong>{changes.length - agentChanges}</strong><span>to the docs and the site</span></div>
        <div className="stat"><strong>{days}</strong><span>days</span></div>
      </div>

      <div className="filters" role="group" aria-label="Show on the timeline">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className={`chip kind-${f.id}`} aria-pressed={shown.has(f.id)} onClick={() => toggle(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {changes.length === 0 && (
        <p className="muted">This build had no git history, so only the tests are shown.</p>
      )}

      <ol className="timeline">
        {groups.map((g) => (
          <li key={g.day} className="tl-day">
            <h2>{g.day}</h2>
            <ol>
              {g.events.map((e) =>
                'test' in e ? (
                  <TestItem key={e.test.path} batch={e.test} at={e.at} />
                ) : (
                  <ChangeItem key={e.change.sha} change={e.change} />
                ),
              )}
            </ol>
          </li>
        ))}
      </ol>
      {visible.length === 0 && <p className="muted">Nothing to show: pick something above.</p>}

      <p className="muted">
        Times are UTC. A test is placed when its first run started. Changes are read from the repository’s history
        when the site is built; merges are left out, since the changes they bring are listed one by one.
      </p>
    </main>
  );
}

function TestItem({ batch, at }: { batch: Batch; at: string }) {
  const writeUp = writeUpOf[batch.name];
  const led = ledTo.get(batch.name) ?? 0;
  return (
    <li className="tl-item tl-test">
      <span className="tl-time">{time(at)}</span>
      <div className="tl-body">
        <div className="tl-head">
          <span className="tl-badge">{batch.kind === 'team' ? 'Team run' : 'Batch'}</span>
          <a className="batch-name" href={HASH.doc(batch.path)}>{batch.name}</a>
          {batch.goals.map((g) => (
            <code key={g}>{g}</code>
          ))}
        </div>
        <p className="batch-who">
          {batch.models.join(', ')}
          {batch.kind === 'team' ? ', together' : ''} · {batch.runs} runs · {dollars(batch.cost)}
        </p>
        <OutcomeBar batch={batch} />
        <p className="tl-foot">
          {led > 0 && <span>Led to {led} {led === 1 ? 'change' : 'changes'} (above)</span>}
          {writeUp && <a href={HASH.doc(writeUp.path)}>Written up in: {writeUp.title}</a>}
        </p>
      </div>
    </li>
  );
}

function ChangeItem({ change }: { change: Change }) {
  return (
    <li className={`tl-item tl-change kind-${change.kind}`}>
      <span className="tl-time">{time(change.at)}</span>
      <div className="tl-body">
        <p>
          <span className="tl-kind">{KIND_LABEL[change.kind]}</span>
          {change.subject}
        </p>
        <p className="tl-foot">
          {change.runs.map((name) => {
            const b = byName.get(name);
            return b ? (
              <a key={name} className="tl-run" href={HASH.doc(b.path)}>cites {name}</a>
            ) : null;
          })}
          <a className="tl-sha" href={`${REPO}/commit/${change.sha}`} target="_blank" rel="noreferrer">
            {change.sha.slice(0, 7)}
          </a>
        </p>
      </div>
    </li>
  );
}
