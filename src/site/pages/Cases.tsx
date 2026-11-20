import { batches } from 'virtual:batches';
import { caseById, cases } from '../content/cases';
import { lessons } from '../content/lessons';
import type { Batch } from '../lib/batches';
import { writeUps } from '../lib/docs';
import { HREF } from '../lib/route';
import { Screenshots } from '../lib/Screenshot';

/** The list: three curated cases, then every full write-up as the research record. */
export function Cases() {
  return (
    <main className="cases-page">
      <header className="page-head">
        <h1>Case studies</h1>
        <p className="lede">
          Four cases, each in the same short form: the question, what happened, what changed, and the lessons it shows.
          Each links to its full write-up and the reports behind it.
        </p>
      </header>

      <div className="case-cards">
        {cases.map((c) => (
          <a className="case-card" key={c.id} href={HREF.caseStudy(c.id)}>
            <strong className="case-figure">{c.result.value}</strong>
            <span className="case-title">{c.title}</span>
            <span className="case-question">{c.question}</span>
            <span className="more">Read the case →</span>
          </a>
        ))}
      </div>

      <section className="record">
        <h2 className="section-title">The full write-ups</h2>
        <p className="muted section-note">The research record: every set of runs written up in full, newest first.</p>
        <ul>
          {writeUps.map((w) => (
            <li key={w.path}>
              <a href={HREF.doc(w.path)}>
                <span className="number">{w.number}</span> {w.title}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

const reportOf = (name: string) => batches.find((b: Batch) => b.name === name);
const lessonOf = (id: string) => lessons.find((l) => l.id === id);

/** One case, in the fixed form. */
export function CaseStudy({ id }: { id: string }) {
  const c = caseById(id);
  if (!c) {
    return (
      <main className="narrow">
        <h1>No such case study</h1>
        <p>
          See the <a href={HREF.cases}>case studies</a>.
        </p>
      </main>
    );
  }
  const others = cases.filter((o) => o.id !== c.id);
  return (
    <main className="narrow case-page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <span className="trail">
          <span>
            <a href={HREF.deep}>Deep dive</a>
          </span>
          <span>
            <span className="sep" aria-hidden="true">›</span>
            <a href={HREF.cases}>Case studies</a>
          </span>
        </span>
      </nav>

      <header className="page-head">
        <h1>{c.title}</h1>
        <p className="lede">{c.question}</p>
      </header>

      <p className="case-setup">
        <span>Setup</span>
        {c.setup}
      </p>

      <div className="case-result">
        <strong>{c.result.value}</strong>
        <span>{c.result.label}</span>
      </div>

      <section>
        <h2>What happened</h2>
        <ul className="case-points">
          {c.happened.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        {c.figure && <Screenshots figure={c.figure} />}
      </section>

      <section>
        <h2>What changed</h2>
        <ul className="case-points">
          {c.changed.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        {c.leftAlone && <p className="muted">{c.leftAlone}</p>}
      </section>

      <section>
        <h2>The lessons it shows</h2>
        <ul className="case-lessons">
          {c.lessons.map((lid) => (
            <li key={lid}>
              <a href={HREF.lessons}>{lessonOf(lid)?.title ?? lid}</a>
            </li>
          ))}
        </ul>
      </section>

      <section className="case-sources">
        <h2>Sources</h2>
        <p>
          <a href={HREF.doc(c.writeUp.doc, c.writeUp.anchor)}>{c.writeUp.title} →</a>
        </p>
        <p className="muted">
          Batch reports:{' '}
          {c.batches.map((name, i) => {
            const b = reportOf(name);
            return (
              <span key={name}>
                {i > 0 && ', '}
                {b ? <a href={HREF.doc(b.path)}>{name}</a> : name}
              </span>
            );
          })}
          {' '}· <a href={HREF.results}>all results</a>
        </p>
      </section>

      <nav className="case-next" aria-label="Other case studies">
        {others.map((o) => (
          <a key={o.id} href={HREF.caseStudy(o.id)}>
            <span className="muted">Another case</span>
            <strong>{o.title}</strong>
          </a>
        ))}
      </nav>
    </main>
  );
}
