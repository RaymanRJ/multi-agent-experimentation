import { writeUpOf } from 'virtual:batches';
import type { Batch } from '../lib/batches';
import { HASH } from '../lib/route';
import { ConditionTable, OutcomeBar, dollars, when } from './BatchParts';

/** The report's own title, totals and "Success per condition" section: the summary shows them instead. */
export function reportBody(markdown: string): string {
  return markdown
    .replace(/^#\s+.+\n/m, '')
    .replace(/^\d+ runs? · .+ total cost .+\n/m, '')
    .replace(/^## Success per condition\s+```[\s\S]*?```\s*/m, '');
}

/** The top of a batch report's page: what ran, what it achieved and cost, and success per condition. */
export function BatchSummary({ batch, title }: { batch: Batch; title: string }) {
  const writeUp = writeUpOf[batch.name];
  return (
    <section className="prose batch-summary">
      <h1>{title}</h1>
      <p className="lede">
        {batch.models.join(', ')}
        {batch.kind === 'team' ? ', together' : ''}, on {batch.goals.map((g, i) => (
          <span key={g}>
            {i > 0 && (i === batch.goals.length - 1 ? ' and ' : ', ')}
            <code>{g}</code>
          </span>
        ))}
        .
      </p>
      <div className="stats">
        <div className="stat"><strong>{batch.runs}</strong><span>runs, started {when(batch.started)}</span></div>
        <div className="stat"><strong>{dollars(batch.cost)}</strong><span>in all</span></div>
        <div className="stat">
          <strong>{batch.tokensIn ?? '–'}</strong>
          <span>tokens in{batch.tokensOut ? `, ${batch.tokensOut} out` : ''}</span>
        </div>
      </div>
      <OutcomeBar batch={batch} />
      {writeUp && (
        <p>
          What these runs mean: <a href={HASH.doc(writeUp.path)}>{writeUp.title}</a>.
        </p>
      )}
      {batch.conditions.length > 0 && (
        <>
          <h2 id="success-per-condition">Success per condition</h2>
          <ConditionTable conditions={batch.conditions} />
        </>
      )}
    </section>
  );
}
