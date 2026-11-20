import { useEffect, useState } from 'react';

/**
 * Path routes. Every page is pre-rendered to its own `<path>/index.html` (scripts/prerender.mjs), which the
 * CloudFront function serves for `/<path>`, so search engines see each page as its own. In the browser, links
 * within the site change the page without a reload (`useRoute`). A doc's heading is the URL's hash:
 * `/docs/<path>#<anchor>`. The site used hash routes (`#/lessons`) until 19 November; `legacyPath` keeps those links working.
 */
export type Route =
  | { page: 'home'; section?: string }
  | { page: 'deep' }
  | { page: 'lessons' }
  | { page: 'cases' }
  | { page: 'case'; id: string }
  | { page: 'method' }
  | { page: 'how' }
  | { page: 'results' }
  | { page: 'doc'; path: string; anchor: string }
  | { page: 'missing'; path: string };

export const HREF = {
  home: '/',
  contact: '/#contact',
  deep: '/deep-dive',
  lessons: '/lessons',
  /** The full lessons notebook (docs/lessons.md), linked from the Lessons page as an appendix. */
  notebook: '/docs/lessons',
  cases: '/case-studies',
  caseStudy: (id: string) => `/case-studies/${id}`,
  method: '/method',
  how: '/how-it-works',
  results: '/results',
  doc: (path: string, anchor = '') => `/docs/${path}${anchor ? `#${anchor}` : ''}`,
};

/** The route for a URL's path and hash. A trailing slash is ignored: CloudFront serves `/lessons/` too. */
export function parse(pathname: string, hash = ''): Route {
  const path = decodeURIComponent(pathname).replace(/^\/+|\/+$/g, '');
  const anchor = decodeURIComponent(hash.replace(/^#/, ''));
  if (path === '') return anchor ? { page: 'home', section: anchor } : { page: 'home' };
  if (path === 'deep-dive') return { page: 'deep' };
  if (path === 'lessons') return { page: 'lessons' };
  if (path === 'case-studies') return { page: 'cases' };
  if (path.startsWith('case-studies/')) return { page: 'case', id: path.slice('case-studies/'.length) };
  if (path === 'method') return { page: 'method' };
  if (path === 'how-it-works') return { page: 'how' };
  if (path === 'results') return { page: 'results' };
  if (path.startsWith('docs/')) return { page: 'doc', path: path.slice(5), anchor };
  return { page: 'missing', path };
}

/**
 * Where an old hash address (`#/docs/x::heading`, from before path routes) now lives, or null for any other hash.
 * "::" stood in for a doc's heading; `#/findings` and `#/stats` were already aliases of Case studies and Results.
 */
export function legacyPath(hash: string): string | null {
  if (!hash.startsWith('#/')) return null;
  const [path = '', anchor = ''] = decodeURIComponent(hash.slice(2)).split('::');
  if (path === '') return HREF.home;
  if (path === 'contact') return HREF.contact;
  if (path === 'findings') return HREF.cases;
  if (path === 'stats') return HREF.results;
  return `/${path}${anchor ? `#${anchor}` : ''}`;
}

/** Opens a page of this site without a reload. */
export function navigate(href: string) {
  history.pushState(null, '', href);
  dispatchEvent(new PopStateEvent('popstate'));
}

/** A click that should stay in the app: a plain left click on a link to another page of this site. */
function inAppTarget(event: MouseEvent): URL | null {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const link = (event.target as Element | null)?.closest?.('a');
  if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return null;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin) return null;
  // Another heading on the same page: the browser scrolls to it, and `hashchange` updates the route.
  if (url.pathname === location.pathname && url.hash) return null;
  return url;
}

/** The route in the browser, following in-app links, back and forward, and heading links. */
export function useRoute(initial?: Route): Route {
  const [route, setRoute] = useState(() => initial ?? parse(location.pathname, location.hash));
  useEffect(() => {
    const update = () => {
      const next = parse(location.pathname, location.hash);
      setRoute(next);
      // A heading link scrolls itself into view once the doc has rendered (DocPage), a landing-page section once
      // the page has (Home).
      if (!(next.page === 'doc' && next.anchor) && !(next.page === 'home' && next.section)) window.scrollTo(0, 0);
    };
    const click = (event: MouseEvent) => {
      const url = inAppTarget(event);
      if (!url) return;
      event.preventDefault();
      navigate(url.pathname + url.search + url.hash);
    };
    addEventListener('popstate', update);
    addEventListener('hashchange', update);
    document.addEventListener('click', click);
    return () => {
      removeEventListener('popstate', update);
      removeEventListener('hashchange', update);
      document.removeEventListener('click', click);
    };
  }, []);
  return route;
}
