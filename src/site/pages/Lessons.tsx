import { caseById } from '../content/cases';
import { lessons } from '../content/lessons';
import { HASH } from '../lib/route';

export function Lessons() {
  return (
    <main className="narrow lessons-page">
      <header className="page-head">
        <h1>Lessons</h1>
        <p className="lede">
          Eight principles for building agents that work on their own, each drawn from logged runs. They apply to any
          agent: in a codebase, a ticket queue or a business tool.
        </p>
        <nav className="toc" aria-label="Lessons on this page">
          {lessons.map((l, i) => (
            <a key={l.id} href={HASH.lessons} onClick={(e) => { e.preventDefault(); document.getElementById(l.id)?.scrollIntoView({ behavior: 'smooth' }); }}>
              <span>{i + 1}</span>
              {l.title}
            </a>
          ))}
        </nav>
      </header>

      {lessons.map((l, i) => (
        <article className="lesson" id={l.id} key={l.id}>
          <p className="eyebrow">
            {i + 1} · {l.theme}
          </p>
          <h2>{l.title}</h2>
          <p>{l.why}</p>
          <div className="lesson-evidence">
            <span>Evidence</span>
            <p>{l.evidence}</p>
            <a href={HASH.doc(l.source.doc, l.source.anchor)}>{l.source.label} →</a>
          </div>
          <p className="lesson-practice">
            <span>In practice</span>
            {l.practice}
          </p>
          <p className="lesson-cases">
            Case {l.cases.length === 1 ? 'study' : 'studies'}:{' '}
            {l.cases.map((id, j) => (
              <span key={id}>
                {j > 0 && ', '}
                <a href={HASH.caseStudy(id)}>{caseById(id)?.title ?? id}</a>
              </span>
            ))}
          </p>
        </article>
      ))}

      <aside className="appendix">
        <strong>The full notebook</strong>
        <p>All 52 lessons, grouped by theme, each with its evidence line: the research record these eight are drawn from.</p>
        <a href={HASH.notebook}>Read the full notebook →</a>
      </aside>
    </main>
  );
}
