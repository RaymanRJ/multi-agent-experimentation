import { useEffect, useRef, useState } from 'react';
import { parseBatch, type Batch } from '../lib/batches';
import { REPO, SITE, hasDoc, loadDoc, renderDoc } from '../lib/docs';
import { HASH } from '../lib/route';
import { BatchSummary, reportBody } from './BatchSummary';

/** Which section of the site a doc belongs to, for the breadcrumb. */
function crumb(path: string): { label: string; href: string } {
  if (path.startsWith('results/write-ups/')) return { label: 'Case studies', href: HASH.findings };
  if (path.startsWith('results/')) return { label: 'Results', href: HASH.results };
  return { label: 'Overview', href: HASH.home };
}

export function DocPage({ path, anchor }: { path: string; anchor: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [batch, setBatch] = useState<{ batch: Batch; title: string } | null>(null);
  const article = useRef<HTMLElement>(null);
  const exists = hasDoc(path);

  useEffect(() => {
    let live = true;
    setHtml(null);
    setBatch(null);
    loadDoc(path).then((text) => {
      if (!live || text === null) return;
      const title = /^#\s+(.+)$/m.exec(text)?.[1];
      // A batch report gets a summary at the top, built from the report itself.
      if (path.startsWith('results/batch-reports/')) {
        setBatch({ batch: parseBatch(path, text), title: title ?? path });
        setHtml(renderDoc(reportBody(text), path));
      } else {
        setHtml(renderDoc(text, path));
      }
      document.title = title ? `${title.replace(/[*`]/g, '')} · ${SITE}` : SITE;
    });
    return () => {
      live = false;
    };
  }, [path]);

  // Land on the heading a link asked for, once the doc is on the page.
  useEffect(() => {
    if (!html) return;
    if (anchor) document.getElementById(anchor)?.scrollIntoView({ block: 'start' });
  }, [html, anchor]);

  if (!exists) {
    return (
      <main className="narrow">
        <h1>No such page</h1>
        <p>
          There's no doc at <code>{path}</code>. Try the <a href={HASH.lessons}>lessons</a>, the{' '}
          <a href={HASH.findings}>case studies</a> or the{' '}
          <a href={HASH.results}>results</a>.
        </p>
      </main>
    );
  }

  const back = crumb(path);
  return (
    <main className={path.startsWith('results/batch-reports/') ? 'report' : 'narrow'}>
      <nav className="crumbs" aria-label="Breadcrumb">
        <a href={back.href}>{back.label}</a>
        <a className="source" href={`${REPO}/blob/main/docs/${path}.md`} target="_blank" rel="noreferrer">
          View on GitHub
        </a>
      </nav>
      {batch && <BatchSummary batch={batch.batch} title={batch.title} />}
      {html === null ? (
        <p className="muted">Loading…</p>
      ) : (
        <article className="prose doc" ref={article} dangerouslySetInnerHTML={{ __html: html }} />
      )}
    </main>
  );
}
