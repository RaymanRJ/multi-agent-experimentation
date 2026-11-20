import { HREF, type Route } from './route';

/** The deep dive's sections: one bar under the header on every technical page, so a reader can always move between them. */
export const DEEP_SECTIONS = [
  { key: 'start', label: 'Start here', href: HREF.deep },
  { key: 'how', label: 'How it works', href: HREF.how },
  { key: 'results', label: 'Results', href: HREF.results },
  { key: 'cases', label: 'Case studies', href: HREF.cases },
  { key: 'lessons', label: 'Lessons', href: HREF.lessons },
  { key: 'method', label: 'Method and limits', href: HREF.method },
] as const;

export type DeepSection = (typeof DEEP_SECTIONS)[number]['key'];

/** Which deep-dive section a route belongs to, or null for a page outside the deep dive (the landing page). */
export function deepSection(route: Route): DeepSection | null {
  switch (route.page) {
    case 'deep':
      return 'start';
    case 'lessons':
      return 'lessons';
    case 'how':
    case 'results':
      return route.page;
    case 'cases':
    case 'case':
      return 'cases';
    case 'method':
      return 'method';
    case 'doc':
      if (route.path === 'lessons') return 'lessons';
      if (route.path === 'limitations' || route.path === 'experiments') return 'method';
      if (route.path.startsWith('results/write-ups/')) return 'cases';
      if (route.path.startsWith('results/')) return 'results';
      return 'start';
    default:
      return null;
  }
}

export function DeepNav({ active }: { active: DeepSection }) {
  return (
    <nav className="deep-nav" aria-label="Deep dive sections">
      <span className="deep-nav-label">Deep dive</span>
      <div className="deep-nav-items">
        {DEEP_SECTIONS.map((s) => (
          <a key={s.key} href={s.href} aria-current={s.key === active ? 'page' : undefined}>
            {s.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
