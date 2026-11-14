import { useEffect } from 'react';
import { DeepDive } from './pages/DeepDive';
import { DocPage } from './pages/DocPage';
import { CaseStudy, Cases } from './pages/Cases';
import { Home } from './pages/Home';
import { Lessons } from './pages/Lessons';
import { Method } from './pages/Method';
import { HowItWorks } from './pages/HowItWorks';
import { Results } from './pages/Results';
import { CONTACT } from './lib/contact';
import { DeepNav, deepSection } from './lib/DeepNav';
import { REPO, SITE } from './lib/docs';
import { PageNav } from './lib/PageNav';
import { HASH, useRoute, type Route } from './lib/route';

// Two readers: the overview is for someone deciding in a few minutes; everything technical sits under the deep dive.
const NAV: Array<{ label: string; href: string; active: (r: Route) => boolean }> = [
  { label: 'Overview', href: HASH.home, active: (r) => r.page === 'home' && !r.section },
  { label: 'Deep dive', href: HASH.deep, active: (r) => ['deep', 'lessons', 'cases', 'case', 'method', 'results', 'how', 'doc'].includes(r.page) },
  { label: 'Contact', href: HASH.contact, active: (r) => r.page === 'home' && r.section === 'contact' },
];

const TITLES: Partial<Record<Route['page'], string>> = {
  home: SITE,
  deep: `Deep dive · ${SITE}`,
  lessons: `Lessons · ${SITE}`,
  method: `Method and limits · ${SITE}`,
  cases: `Case studies · ${SITE}`,
  case: `Case study · ${SITE}`,
  how: `How it works · ${SITE}`,
  results: `Results · ${SITE}`,
};

export default function App() {
  const route = useRoute();
  const section = deepSection(route);
  useEffect(() => {
    const title = TITLES[route.page];
    if (title) document.title = title;
  }, [route.page]);

  return (
    <div className="app">
      <header className="site-header">
        <a className="brand" href={HASH.home}>
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path d="M9 22 16 9l7 13Z" fill="none" stroke="currentColor" strokeWidth="2.4" />
            <circle cx="16" cy="9" r="4.5" />
            <circle cx="9" cy="22" r="4.5" />
            <circle cx="23" cy="22" r="4.5" />
          </svg>
          <span>{SITE}</span>
        </a>
        <nav aria-label="Pages">
          {NAV.map((item) => (
            <a key={item.label} href={item.href} aria-current={item.active(route) ? 'page' : undefined}>
              {item.label}
            </a>
          ))}
          <a href={REPO} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </nav>
      </header>

      {section && <DeepNav active={section} />}

      {route.page === 'home' && <Home section={route.section} />}
      {route.page === 'deep' && <DeepDive />}
      {route.page === 'lessons' && <Lessons />}
      {route.page === 'method' && <Method />}
      {route.page === 'cases' && <Cases />}
      {route.page === 'case' && <CaseStudy id={route.id} />}
      {route.page === 'how' && <HowItWorks />}
      {route.page === 'results' && <Results />}
      {route.page === 'doc' && <DocPage path={route.path} anchor={route.anchor} />}
      {route.page === 'missing' && (
        <main className="narrow">
          <h1>No such page</h1>
          <p>
            Start from the <a href={HASH.home}>overview</a>.
          </p>
        </main>
      )}

      <PageNav key={JSON.stringify(route)} />

      <footer className="site-footer">
        <span>
          {CONTACT.name} · <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> ·{' '}
          <a href={CONTACT.linkedin} target="_blank" rel="noreferrer">LinkedIn</a> ·{' '}
          <a href={CONTACT.website} target="_blank" rel="noreferrer">rrjamal.ca</a>
        </span>
        <span>
          Every number traces back to a logged run.{' '}
          <a href={REPO} target="_blank" rel="noreferrer">
            Source and data on GitHub
          </a>
        </span>
      </footer>
    </div>
  );
}
