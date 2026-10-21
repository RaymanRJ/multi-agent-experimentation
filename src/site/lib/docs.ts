import { Marked } from 'marked';
import { HASH } from './route';

/** The public repository; links from the docs to code open it on GitHub. */
export const REPO = 'https://github.com/RaymanRJ/multi-agent-experimentation';

// Every doc in the repository's docs/, read when the site is built: one small chunk each, loaded when
// opened. next-steps.md is working notes for whoever works on the repo, not for readers.
const loaders = import.meta.glob(['../../../docs/**/*.md', '!../../../docs/next-steps.md'], {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

// The write-ups are listed with their titles and dates, so they are bundled outright.
const writeUpText = import.meta.glob('../../../docs/results/write-ups/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** "../../../docs/results/README.md" -> "results/README". */
const docKey = (file: string) => file.replace(/^.*?\/docs\//, '').replace(/\.md$/, '');

const byKey = new Map(Object.entries(loaders).map(([file, load]) => [docKey(file), load]));

export const hasDoc = (path: string) => byKey.has(path);

export async function loadDoc(path: string): Promise<string | null> {
  const load = byKey.get(path);
  return load ? load() : null;
}

export interface WriteUp {
  path: string;
  number: string;
  title: string;
  /** The italic note under the title: which batches, when, on what. */
  note: string;
}

/** The write-ups, newest first. */
export const writeUps: WriteUp[] = Object.entries(writeUpText)
  .map(([file, text]) => {
    const path = docKey(file);
    const title = /^#\s+(.+)$/m.exec(text)?.[1]?.trim() ?? path;
    const italic = /^\*([^*][\s\S]*?)\*\s*$/m.exec(text)?.[1] ?? '';
    return { path, number: /(\d+)-/.exec(path)?.[1] ?? '', title, note: italic.replace(/\s+/g, ' ').trim() };
  })
  .sort((a, b) => b.number.localeCompare(a.number));

/** GitHub's heading ids, so links written for GitHub ("#the-clearest-finding…") still land. */
function slugger() {
  const seen = new Map<string, number>();
  return (text: string) => {
    const base = text
      .toLowerCase()
      .trim()
      .replace(/<[^>]*>/g, '')
      .replace(/&[a-z]+;|&#\d+;/g, '')
      .replace(/[^\p{L}\p{N}\- _]/gu, '')
      .replace(/ /g, '-');
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n ? `${base}-${n}` : base;
  };
}

/** Resolves "a/./b/../c" to "a/c". */
function normalise(path: string): string {
  const out: string[] = [];
  for (const part of path.split('/')) {
    if (part === '..') out.pop();
    else if (part && part !== '.') out.push(part);
  }
  return out.join('/');
}

/**
 * Where a link in a doc goes on the site: another doc opens here; anything else in the repository
 * (code, the README, an excluded doc) opens on GitHub; the web stays the web.
 */
export function resolveLink(docPath: string, href: string): { url: string; external: boolean } {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return { url: href, external: true };
  if (href.startsWith('#')) return { url: HASH.doc(docPath, href.slice(1)), external: false };
  const [target = '', anchor = ''] = href.split('#');
  const dir = `docs/${docPath}`.split('/').slice(0, -1).join('/');
  const repoPath = normalise(`${dir}/${target}`);
  if (repoPath.startsWith('docs/') && repoPath.endsWith('.md')) {
    const key = repoPath.slice(5, -3);
    if (hasDoc(key)) return { url: HASH.doc(key, anchor), external: false };
  }
  const kind = /\.[a-z0-9]+$/i.test(repoPath) ? 'blob' : 'tree';
  return { url: `${REPO}/${kind}/main/${repoPath}${anchor ? `#${anchor}` : ''}`, external: true };
}

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/** A doc as HTML: GitHub-style headings with anchors, site links, and tables that scroll on a phone. */
export function renderDoc(markdown: string, docPath: string): string {
  const slug = slugger();
  const marked = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        const id = slug(inner);
        return `<h${depth} id="${id}"><a class="anchor" href="${escapeAttr(HASH.doc(docPath, id))}" aria-hidden="true">#</a>${inner}</h${depth}>\n`;
      },
      link({ href, title, tokens }) {
        const inner = this.parser.parseInline(tokens);
        const { url, external } = resolveLink(docPath, href);
        return `<a href="${escapeAttr(url)}"${title ? ` title="${escapeAttr(title)}"` : ''}${external ? ' target="_blank" rel="noreferrer"' : ''}>${inner}</a>`;
      },
    },
  });
  const html = marked.parse(markdown, { async: false }) as string;
  return html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');
}
