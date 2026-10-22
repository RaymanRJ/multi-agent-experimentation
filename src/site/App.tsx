import { useEffect } from 'react';
import { DocPage } from './pages/DocPage';
import { Findings } from './pages/Findings';
import { Home } from './pages/Home';
import { HowItWorks } from './pages/HowItWorks';
import { Results } from './pages/Results';
import { REPO } from './lib/docs';
import { HASH, useRoute, type Route } from './lib/route';

const NAV: Array<{ label: string; href: string; active: (r: Route) => boolean }> = [
  { label: 'Overview', href: HASH.home, active: (r) => r.page === 'home' },
  { label: 'Findings', href: HASH.findings, active: (r) => r.page === 'findings' || (r.page === 'doc' && r.path.startsWith('results/write-ups/')) },
  { label: 'Results', href: HASH.results, active: (r) => r.page === 'results' || (r.page === 'doc' && r.path.startsWith('results/') && !r.path.startsWith('results/write-ups/')) },
  { label: 'How it works', href: HASH.how, active: (r) => r.page === 'how' },
];

const TITLES: Partial<Record<Route['page'], string>> = {
  home: 'Agents, left alone',
  findings: 'Findings · Agents, left alone',
  how: 'How it works · Agents, left alone',
  results: 'Results · Agents, left alone',
};

export default function App() {
  const route = useRoute();
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
          <span>Agents, left alone</span>
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

      {route.page === 'home' && <Home />}
      {route.page === 'findings' && <Findings />}
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

      <footer className="site-footer">
        <span>
          By <a href="https://rrjamal.ca">Rayman Jamal</a>. Every number traces back to a logged run.
        </span>
        <a href={REPO} target="_blank" rel="noreferrer">
          Source and data on GitHub
        </a>
      </footer>
    </div>
  );
}
