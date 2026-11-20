// Turns the client build into static HTML per page, so search engines and answer engines that don't run JavaScript
// see each page's content, title and description. Runs after both Vite builds (npm run build):
//   dist/        client build; index.html is the template
//   dist-ssr/    server build of entry-server.tsx (deleted when done)
// Writes dist/index.html, dist/<path>/index.html, dist/sitemap.xml and dist/llms.txt. dist/404.html is public/404.html.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist');
const ssrDir = join(root, 'dist-ssr');
const { render, sitePages, canonicalUrl, llmsTxt, SITE_URL } = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href);

/**
 * When each doc was first and last committed (YYYY-MM-DD), from one pass over git's history of docs/. CI checks out
 * the whole history for this; with a shallow clone the dates are only as old as the clone, and with no git none are given.
 */
function docDates() {
  const dates = {};
  let log = '';
  try {
    log = execFileSync('git', ['log', '--format=@%cs', '--name-only', '--', 'docs'], { cwd: join(root, '../..'), encoding: 'utf8', maxBuffer: 64 << 20 });
  } catch {
    console.log('prerender: no git history, so no dates');
    return dates;
  }
  let day = '';
  // Newest first: the first time a file appears is its last change, the last time its first.
  for (const line of log.split('\n')) {
    if (line.startsWith('@')) day = line.slice(1);
    else if (line) {
      dates[line] ??= { published: day, modified: day };
      dates[line].published = day;
    }
  }
  return dates;
}

const template = readFileSync(join(out, 'index.html'), 'utf8');
const escape = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function replaceOnce(html, pattern, replacement) {
  if (!pattern.test(html)) throw new Error(`prerender: template is missing ${pattern}`);
  return html.replace(pattern, replacement);
}

async function pageHtml(page) {
  const url = canonicalUrl(page.path);
  const title = escape(page.title);
  const description = escape(page.description);
  const image = `${SITE_URL}/og.png`;
  const head = [
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="${page.ogType}" />`,
    `<meta property="og:site_name" content="Rayman Jamal · AI agents" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="Three AI agents given a goal, not instructions: 20 of 20 runs, about $1 a success." />`,
    `<meta property="og:locale" content="en_CA" />`,
    page.ogType === 'article' ? `<meta name="author" content="Rayman Jamal" />` : null,
    page.published ? `<meta property="article:published_time" content="${page.published}" />` : null,
    page.modified ? `<meta property="article:modified_time" content="${page.modified}" />` : null,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    `<script type="application/ld+json">${JSON.stringify(page.jsonLd).replace(/</g, '\\u003c')}</script>`,
  ]
    .filter(Boolean)
    .map((tag) => `    ${tag}`)
    .join('\n');

  let html = template;
  html = replaceOnce(html, /<title>[^<]*<\/title>/, `<title>${title}</title>`);
  html = replaceOnce(html, /<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${description}" />`);
  html = replaceOnce(html, /<\/head>/, `${head}\n  </head>`);
  html = replaceOnce(html, /<div id="root"><\/div>/, `<div id="root">${await render(page.route)}</div>`);
  return html;
}

const pages = await sitePages(docDates());
for (const page of pages) {
  const file = page.path === '/' ? join(out, 'index.html') : join(out, page.path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, await pageHtml(page));
}
console.log(`prerendered ${pages.length} pages`);

// lastmod only where it's known (the docs, from git). The build date would mark every page as changed on every
// deploy, and search engines learn to ignore a lastmod like that.
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${canonicalUrl(p.path)}</loc>${p.modified ? `<lastmod>${p.modified}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;
writeFileSync(join(out, 'sitemap.xml'), sitemap);
writeFileSync(join(out, 'llms.txt'), llmsTxt(pages));
console.log('wrote sitemap.xml and llms.txt');

rmSync(ssrDir, { recursive: true, force: true });
