import { useEffect, useState } from 'react';

/**
 * Hash routes, as in music-viz: the static S3 site serves every page from index.html, with no rewrite
 * rules. `#/docs/<path>::<anchor>` opens a doc at a heading; "::" stands in for a second "#".
 */
export type Route =
  | { page: 'home'; section?: string }
  | { page: 'deep' }
  | { page: 'lessons' }
  | { page: 'cases' }
  | { page: 'case'; id: string }
  | { page: 'method' }
  | { page: 'findings' }
  | { page: 'how' }
  | { page: 'results' }
  | { page: 'doc'; path: string; anchor: string }
  | { page: 'missing'; hash: string };

export const HASH = {
  home: '#/',
  contact: '#/contact',
  deep: '#/deep-dive',
  lessons: '#/lessons',
  /** The full lessons notebook (docs/lessons.md), linked from the Lessons page as an appendix. */
  notebook: '#/docs/lessons',
  cases: '#/case-studies',
  caseStudy: (id: string) => `#/case-studies/${id}`,
  method: '#/method',
  findings: '#/findings',
  how: '#/how-it-works',
  results: '#/results',
  doc: (path: string, anchor = '') => `#/docs/${path}${anchor ? `::${anchor}` : ''}`,
};

export function parse(hash: string): Route {
  const raw = decodeURIComponent(hash.replace(/^#\/?/, ''));
  const [path = '', anchor = ''] = raw.split('::');
  if (path === '') return { page: 'home' };
  // A section of the landing page, scrolled to once it has rendered (Home).
  if (path === 'contact') return { page: 'home', section: 'contact' };
  if (path === 'deep-dive') return { page: 'deep' };
  if (path === 'lessons') return { page: 'lessons' };
  if (path === 'case-studies') return { page: 'cases' };
  if (path.startsWith('case-studies/')) return { page: 'case', id: path.slice('case-studies/'.length) };
  if (path === 'method') return { page: 'method' };
  if (path === 'findings') return { page: 'findings' };
  if (path === 'how-it-works') return { page: 'how' };
  if (path === 'results') return { page: 'results' };
  // Stats became part of Results; the old address still lands there.
  if (path === 'stats') return { page: 'results' };
  if (path.startsWith('docs/')) return { page: 'doc', path: path.slice(5), anchor };
  return { page: 'missing', hash };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(location.hash));
  useEffect(() => {
    const update = () => {
      const next = parse(location.hash);
      setRoute(next);
      // A heading link scrolls itself into view once the doc has rendered (DocPage).
      if (!(next.page === 'doc' && next.anchor) && !(next.page === 'home' && next.section)) window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return route;
}
