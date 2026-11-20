import { useEffect, useRef, useState } from 'react';
import { parseBatch } from '../lib/batches';
import { REPO, SITE, hasDoc, loadDoc, loadedDoc, renderDoc } from '../lib/docs';
import { docTitle } from '../lib/titles';
import { HREF } from '../lib/route';
import { BatchSummary, reportBody } from './BatchSummary';

/** Which section of the site a doc belongs to, for the breadcrumb. */
/** Where a doc sits in the deep dive, as a trail back: "Deep dive › Case studies" for a write-up, "Deep dive" for lessons. */
function crumbs(path: string): Array<{ label: string; href: string }> {
  const trail = [{ label: 'Deep dive', href: HREF.deep }];
  if (path === 'lessons') trail.push({ label: 'Lessons', href: HREF.lessons });
  else if (path === 'limitations' || path === 'experiments') trail.push({ label: 'Method and limits', href: HREF.method });
  else if (path.startsWith('results/write-ups/')) trail.push({ label: 'Case studies', href: HREF.cases });
  else if (path.startsWith('results/')) trail.push({ label: 'Results', href: HREF.results });
  return trail;
}

/** A doc as the page shows it: a batch report gets a summary at the top, built from the report itself. */
function shown(path: string, text: string) {
  const title = docTitle(text);
  if (path.startsWith('results/batch-reports/')) {
    return { html: renderDoc(reportBody(text), path), batch: { batch: parseBatch(path, text), title: title ?? path }, title };
  }
  return { html: renderDoc(text, path), batch: null, title };
}

export function DocPage({ path, anchor }: { path: string; anchor: string }) {
  const [doc, setDoc] = useState(() => {
    const text = loadedDoc(path);
    return text === null ? null : shown(path, text);
  });
  const article = useRef<HTMLElement>(null);
  const exists = hasDoc(path);
  const html = doc?.html ?? null;
  const batch = doc?.batch ?? null;

  useEffect(() => {
    let live = true;
    const ready = loadedDoc(path);
    if (ready !== null) setDoc(shown(path, ready));
    else setDoc(null);
    loadDoc(path).then((text) => {
      if (!live || text === null) return;
      const next = shown(path, text);
      if (ready === null) setDoc(next);
      document.title = next.title ? `${next.title} · ${SITE}` : SITE;
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
          There's no doc at <code>{path}</code>. Try the <a href={HREF.lessons}>lessons</a>, the{' '}
          <a href={HREF.cases}>case studies</a> or the{' '}
          <a href={HREF.results}>results</a>.
        </p>
      </main>
    );
  }

  const trail = crumbs(path);
  return (
    <main className={path.startsWith('results/batch-reports/') ? 'report' : 'narrow'}>
      <nav className="crumbs" aria-label="Breadcrumb">
        <span className="trail">
          {trail.map((c, i) => (
            <span key={c.href}>
              {i > 0 && <span className="sep" aria-hidden="true">›</span>}
              <a href={c.href}>{c.label}</a>
            </span>
          ))}
        </span>
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
