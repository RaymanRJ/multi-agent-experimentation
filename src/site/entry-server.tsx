// Build-time entry: draws each page to static HTML (see scripts/prerender.mjs).
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import App from './App';
import { loadDoc } from './lib/docs';
import type { Route } from './lib/route';

export { SITE_URL, canonicalUrl, llmsFullTxt, llmsTxt, notFoundPage, sitePages } from './lib/seo';

export async function render(route: Route): Promise<string> {
  // DocPage draws a doc that has already been loaded in one pass.
  if (route.page === 'doc') await loadDoc(route.path);
  return renderToString(
    <StrictMode>
      <App initialRoute={route} />
    </StrictMode>,
  );
}
