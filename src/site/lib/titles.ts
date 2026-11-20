import { cases } from '../content/cases';
import { SITE } from './docs';
import type { Route } from './route';

const TITLES: Partial<Record<Route['page'], string>> = {
  // The landing page says what the site is about, for a search result; the header still shows SITE.
  home: 'Rayman Jamal · AI agents that deliver: a multi-agent testbed',
  deep: `Deep dive · ${SITE}`,
  lessons: `Lessons · ${SITE}`,
  method: `Method and limits · ${SITE}`,
  cases: `Case studies · ${SITE}`,
  how: `How it works · ${SITE}`,
  results: `Results · ${SITE}`,
};

/** A doc's title: its first heading, without markdown. */
export const docTitle = (markdown: string): string | null => /^#\s+(.+)$/m.exec(markdown)?.[1]?.replace(/[*`]/g, '').trim() ?? null;

/** A page's title, in the browser tab and in the pre-rendered page (a doc's comes from its heading, in DocPage). */
export function pageTitle(route: Route): string | null {
  if (route.page === 'case') {
    const c = cases.find((x) => x.id === route.id);
    return c ? `${c.title} · ${SITE}` : `Case study · ${SITE}`;
  }
  return TITLES[route.page] ?? null;
}
