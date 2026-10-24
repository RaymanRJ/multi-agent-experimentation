import { batches, writeUpOf } from 'virtual:batches';
import { chapters, type Chapter, type StoryRun } from '../content/story';
import type { Batch } from '../lib/batches';
import { HASH } from '../lib/route';
import { OutcomeBar, dollars, when } from './BatchParts';

const byName = new Map(batches.map((b) => [b.name, b]));
const placed = new Set(chapters.flatMap((c) => c.runs.map((r) => r.name)));

// A published batch no chapter names yet still appears, at the end, oldest first.
const unplaced = [...batches].filter((b) => !placed.has(b.name)).sort((a, b) => a.started.localeCompare(b.started));
const story: Chapter[] = unplaced.length
  ? [
      ...chapters,
      {
        title: 'Not yet written up',
        question: 'Published since the last write-up. What these runs showed is still being read from their logs.',
        runs: unplaced.map((b) => ({ name: b.name, showed: '' })),
        lesson: { text: '', anchor: '' },
      },
    ]
  : chapters;

const paid = batches.reduce((n, b) => n + b.cost, 0);
const runs = batches.reduce((n, b) => n + b.runs, 0);
const models = new Set(batches.flatMap((b) => b.models).filter((m) => m !== 'Scripted baseline'));

const shortDay = (started: string) => when(started).replace(/ \d{4},.*$/, '');

/** "16 Oct" or "20–23 Oct", from the chapter's batches. */
function dates(chapter: Chapter): string {
  const days = chapter.runs.map((r) => byName.get(r.name)?.started).filter((s): s is string => !!s).sort();
  if (!days.length) return '';
  const [first, last] = [shortDay(days[0]!), shortDay(days.at(-1)!)];
  if (first === last) return first;
  const [d1, m1] = first.split(' ');
  const [d2, m2] = last.split(' ');
  return m1 === m2 ? `${d1}–${d2} ${m2}` : `${first} – ${last}`;
}

const anchor = (i: number) => `chapter-${i + 1}`;
const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

export function Results() {
  return (
    <main>
      <header className="page-head">
        <h1>Results</h1>
        <p className="lede">
          Every test, in the order it ran. Each chapter asks one question. Each run shows something; what we
          changed because of it leads to the next run. Read down to follow how the agents, and the structure
          around them, got further.
        </p>
      </header>

      <div className="stats">
        <div className="stat"><strong>{batches.length}</strong><span>batches and team runs</span></div>
        <div className="stat"><strong>{runs.toLocaleString('en-GB')}</strong><span>runs</span></div>
        <div className="stat"><strong>{models.size}</strong><span>models, and a scripted baseline</span></div>
        <div className="stat"><strong>{dollars(paid)}</strong><span>spent on paid models</span></div>
      </div>

      <nav className="chapter-map" aria-label="Chapters">
        <ol>
          {story.map((c, i) => (
            <li key={c.title}>
              <button type="button" onClick={() => jump(anchor(i))}>
                <span className="chapter-n">{i + 1}</span>
                <span className="chapter-map-text">
                  <strong>{c.title}</strong>
                  <span>
                    {dates(c)} · {c.runs.length} {c.runs.length === 1 ? 'test' : 'tests'}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {story.map((c, i) => (
        <ChapterSection key={c.title} chapter={c} index={i} last={i === story.length - 1} />
      ))}

      <p className="muted">
        What a run, a condition and a batch are, and why the logs aren't published:{' '}
        <a href={HASH.doc('results/README')}>about these results</a>. Which skills the agents chose and how often they
        worked: <a href={HASH.doc('results/skill-usage')}>skill usage</a>.
      </p>
    </main>
  );
}

function ChapterSection({ chapter, index, last }: { chapter: Chapter; index: number; last: boolean }) {
  const writeUp = chapter.runs.map((r) => writeUpOf[r.name]).find(Boolean);
  return (
    <section className="chapter" id={anchor(index)}>
      <header className="chapter-head">
        <p className="eyebrow">
          Chapter {index + 1} · {dates(chapter)}
        </p>
        <h2>{chapter.title}</h2>
        <p className="chapter-question">{chapter.question}</p>
      </header>

      <ol className="story">
        {chapter.runs.map((run) => {
          const batch = byName.get(run.name);
          return batch ? <RunItem key={run.name} run={run} batch={batch} /> : null;
        })}
      </ol>

      {(chapter.lesson.text || writeUp) && (
        <footer className="chapter-end">
          {chapter.lesson.text && (
            <p>
              <strong>What it taught:</strong> {chapter.lesson.text}{' '}
              <a href={HASH.doc('lessons', chapter.lesson.anchor)}>The lesson →</a>
            </p>
          )}
          {writeUp && (
            <p className="muted">
              The full account: <a href={HASH.doc(writeUp.path)}>{writeUp.title}</a>
            </p>
          )}
        </footer>
      )}
      {!last && (
        <button type="button" className="next-chapter" onClick={() => jump(anchor(index + 1))}>
          Next: chapter {index + 2} ↓
        </button>
      )}
    </section>
  );
}

function RunItem({ run, batch }: { run: StoryRun; batch: Batch }) {
  return (
    <li className="story-run">
      <article className="batch">
        <div className="batch-head">
          <a className="batch-name" href={HASH.doc(batch.path)}>
            {batch.name}
          </a>
          <span className="batch-kind">{batch.kind === 'team' ? 'Team run' : 'Batch'}</span>
          <span className="batch-when">{when(batch.started)}</span>
        </div>
        <p className="batch-who">
          {batch.models.join(', ')}
          {batch.kind === 'team' ? ', together' : ''} on{' '}
          {batch.goals.map((g, i) => (
            <span key={g}>
              {i > 0 && ', '}
              <code>{g}</code>
            </span>
          ))}
          {' '}· {batch.runs} runs · {dollars(batch.cost)}
        </p>
        <OutcomeBar batch={batch} />
        {run.showed && <p className="story-showed">{run.showed}</p>}
      </article>
      {run.then && (
        <p className="story-then">
          <span className="story-then-label">Changed next</span>
          {run.then}
        </p>
      )}
    </li>
  );
}
