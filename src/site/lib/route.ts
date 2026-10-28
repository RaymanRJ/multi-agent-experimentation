import { useEffect, useState } from 'react';

/**
 * Hash routes, as in music-viz: the static S3 site serves every page from index.html, with no rewrite
 * rules. `#/docs/<path>::<anchor>` opens a doc at a heading; "::" stands in for a second "#".
 */
export type Route =
  | { page: 'home' }
  | { page: 'findings' }
  | { page: 'how' }
  | { page: 'results' }
  | { page: 'stats' }
  | { page: 'doc'; path: string; anchor: string }
  | { page: 'missing'; hash: string };

export const HASH = {
  home: '#/',
  lessons: '#/docs/lessons',
  findings: '#/findings',
  how: '#/how-it-works',
  results: '#/results',
  stats: '#/stats',
  doc: (path: string, anchor = '') => `#/docs/${path}${anchor ? `::${anchor}` : ''}`,
};

export function parse(hash: string): Route {
  const raw = decodeURIComponent(hash.replace(/^#\/?/, ''));
  const [path = '', anchor = ''] = raw.split('::');
  if (path === '') return { page: 'home' };
  if (path === 'findings') return { page: 'findings' };
  if (path === 'how-it-works') return { page: 'how' };
  if (path === 'results') return { page: 'results' };
  if (path === 'stats') return { page: 'stats' };
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
      if (!(next.page === 'doc' && next.anchor)) window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return route;
}
