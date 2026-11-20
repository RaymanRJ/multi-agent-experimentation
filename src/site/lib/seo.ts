import { cases } from '../content/cases';
import { FIGURES, HEADLINE } from '../content/headline';
import { lessons } from '../content/lessons';
import { lessonOf, parseBatch } from './batches';
import { CONTACT } from './contact';
import { REPO, SITE, docPaths, loadDoc, loadedDoc, resolveLink, writeUps } from './docs';
import { HREF, parse, type Route } from './route';
import { docTitle, pageTitle } from './titles';

/**
 * What search engines and answer engines are told about each page, used only when the site is built
 * (entry-server.tsx, scripts/prerender.mjs): every page's title, description, canonical URL and JSON-LD, the sitemap
 * and llms.txt. A page missing from `sitePages` is never pre-rendered, so the live site serves it the 404 page.
 */
export const SITE_URL = 'https://multi-agent-experiment.rrjamal.ca';

export interface PageMeta {
  /** The URL path: "/", "/lessons", "/docs/results/write-ups/08-reaching-80". */
  path: string;
  route: Route;
  title: string;
  description: string;
  jsonLd: object;
  ogType: 'website' | 'article';
  /** A doc's first and last commit (YYYY-MM-DD), as published and modified dates; left out where unknown. */
  published?: string;
  modified?: string;
}

/** When each doc first and last changed, by its repository path ("docs/lessons.md"), from git (prerender.mjs). */
export type DocDates = Record<string, { published: string; modified: string }>;

export const canonicalUrl = (path: string) => (path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`);

// The same person as rrjamal.ca's JSON-LD, by its @id, so engines tie this site to its author.
const person = {
  '@type': 'Person',
  '@id': 'https://rrjamal.ca/#person',
  name: CONTACT.name,
  url: 'https://rrjamal.ca/',
  email: `mailto:${CONTACT.email}`,
  jobTitle: 'Senior Software Engineer',
  sameAs: [CONTACT.linkedin, 'https://github.com/RaymanRJ'],
};

const website = {
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: `${SITE_URL}/`,
  name: SITE,
  alternateName: 'Multi-Agent Experimentation',
  inLanguage: 'en',
  author: { '@id': person['@id'] },
  publisher: { '@id': person['@id'] },
};

const sourceCode = {
  '@type': 'SoftwareSourceCode',
  '@id': `${SITE_URL}/#code`,
  name: 'Multi-Agent Experimentation',
  description:
    'An open-source testbed for running AI agents hands-off: Claude, GPT and a local model share one Minecraft world, and every decision is logged to measure success, recovery, teamwork and cost.',
  codeRepository: REPO,
  programmingLanguage: 'TypeScript',
  license: `${REPO}/blob/main/LICENSE`,
  author: { '@id': person['@id'] },
};

/** "Some **bold** [link](x) `code`" -> "Some bold link code". */
const plain = (markdown: string) =>
  markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** At most about `max` characters, cut at the end of a sentence where one falls late enough, otherwise at a word. */
export function clip(text: string, max = 200): string {
  if (text.length <= max) return text;
  const head = text.slice(0, max);
  const sentence = head.lastIndexOf('. ');
  if (sentence > max * 0.5) return head.slice(0, sentence + 1);
  return `${head.slice(0, head.lastIndexOf(' ')).replace(/[,;:]$/, '')}…`;
}

/** A doc's first paragraph of prose, under its title. */
function firstParagraph(markdown: string): string {
  const paragraphs = markdown.split(/\n\s*\n/).map((p) => p.trim());
  const prose = paragraphs.find((p) => p && !/^(#|\||```|<|-|\*\s|\d+\.|>)/.test(p) && !/^\*[^*].*\*$/s.test(p));
  return plain(prose ?? '');
}

function docDescription(path: string, markdown: string): string {
  if (path.startsWith('results/write-ups/')) {
    const lesson = lessonOf(markdown);
    if (lesson) return clip(plain(lesson));
  }
  if (path.startsWith('results/batch-reports/')) {
    const b = parseBatch(path, markdown);
    const what = b.kind === 'team' ? `Team run ${b.name}` : `Batch ${b.name}`;
    const goals = b.goals.length ? ` on ${b.goals.join(', ')}` : '';
    const models = b.models.length ? ` with ${b.models.join(', ')}` : '';
    return clip(`${what}${goals}${models}${b.dates ? `, ${b.dates}` : ''}: ${b.met} of ${b.runs} runs met their goal. The report built from its logs: outcomes, deaths, decisions, tokens and cost.`, 240);
  }
  return clip(firstParagraph(markdown));
}

/** Where a page sits under the deep dive, for the breadcrumb trail engines show in results. */
function trail(route: Route): Array<{ name: string; path: string }> {
  const deep = { name: 'Deep dive', path: HREF.deep };
  switch (route.page) {
    case 'lessons':
    case 'method':
    case 'how':
    case 'results':
    case 'cases':
      return [deep];
    case 'case':
      return [deep, { name: 'Case studies', path: HREF.cases }];
    case 'doc':
      if (route.path === 'lessons') return [deep, { name: 'Lessons', path: HREF.lessons }];
      if (route.path === 'limitations' || route.path === 'experiments') return [deep, { name: 'Method and limits', path: HREF.method }];
      if (route.path.startsWith('results/write-ups/')) return [deep, { name: 'Case studies', path: HREF.cases }];
      if (route.path.startsWith('results/')) return [deep, { name: 'Results', path: HREF.results }];
      return [deep];
    default:
      return [];
  }
}

function breadcrumbs(route: Route, path: string, name: string) {
  const items = [{ name: 'Overview', path: '/' }, ...trail(route), { name, path }];
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: canonicalUrl(item.path) })),
  };
}

/** A page's JSON-LD: the page itself, its breadcrumb trail, and the site it belongs to. */
function graph(route: Route, path: string, name: string, description: string, page: object) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@id': `${canonicalUrl(path)}#page`,
        url: canonicalUrl(path),
        name,
        description,
        inLanguage: 'en',
        isPartOf: { '@id': website['@id'] },
        about: { '@id': sourceCode['@id'] },
        ...page,
      },
      ...(path === '/' ? [] : [breadcrumbs(route, path, name)]),
      website,
      person,
      sourceCode,
    ],
  };
}

const short = (title: string) => title.replace(` · ${SITE}`, '');

/** A case study as the question it asks and what the runs answered, in its own words (content/cases.ts). */
const question = (c: (typeof cases)[number]) => ({
  '@type': 'Question',
  name: c.question,
  url: canonicalUrl(HREF.caseStudy(c.id)),
  acceptedAnswer: {
    '@type': 'Answer',
    text: `${c.result.value} ${c.result.label}. ${c.happened.join(' ')}`,
    url: canonicalUrl(HREF.caseStudy(c.id)),
  },
});

// The deep dive's own pages, described in their own words (each page's opening paragraph).
const SECTIONS: Array<{ path: string; description: string }> = [
  {
    path: HREF.deep,
    description:
      'AI agents given a goal, a fixed set of skills and a short account of their situation, then left alone. The model decides; deterministic code does. Every number traces back to a logged run.',
  },
  {
    path: HREF.how,
    description:
      'The agent harness around the models: the tools, context, shared state and control loop. One rule holds it together: the model decides, the code does.',
  },
  {
    path: HREF.results,
    description:
      'How often the AI agents met their goal, what it cost per success, and how that changed over every logged batch of runs, each linked to the report built from its logs.',
  },
  {
    path: HREF.cases,
    description:
      'Four case studies of AI agents left to work alone: the question, what happened, what changed and the lessons it shows, each linked to its full write-up and the reports behind it.',
  },
  {
    path: HREF.lessons,
    description:
      'Eight principles for building AI agents that work on their own, each drawn from logged runs: a tool’s report has to be true, fix the tools before changing the model, measure on frozen code, and count cost per success.',
  },
  {
    path: HREF.method,
    description: 'How the AI agent runs are done, measured and judged, and how far to trust the numbers: no human steps in, code is frozen, and every limitation is listed.',
  },
];

const HOME_DESCRIPTION = `Give three AI agents a goal, not instructions: they plan, divide the work and finish the job, ${HEADLINE.successRate} runs, at about ${HEADLINE.costPerSuccess} a success. How the structure around AI models makes agents reliable, with every run logged.`;

/** Every page of the site, in sitemap order: the overview, the deep dive's sections, the case studies, then the docs. */
export async function sitePages(dates: DocDates = {}): Promise<PageMeta[]> {
  const pages: PageMeta[] = [];
  const add = (path: string, description: string, ogType: PageMeta['ogType'], extra: object = {}, when: { published?: string; modified?: string } = {}) => {
    const route = parse(path);
    const title = pageTitle(route) ?? SITE;
    pages.push({ path, route, title, description, ogType, ...when, jsonLd: graph(route, path, short(title), description, extra) });
  };

  add('/', HOME_DESCRIPTION, 'website', { '@type': 'WebPage', mainEntity: { '@id': sourceCode['@id'] }, author: { '@id': person['@id'] } });
  for (const s of SECTIONS) {
    // The case studies are each a question and its answer, so the list is marked up as one.
    const extra = s.path === HREF.cases ? { '@type': ['CollectionPage', 'FAQPage'], mainEntity: cases.map(question) } : { '@type': 'WebPage' };
    add(s.path, s.description, 'website', extra);
  }
  for (const c of cases) {
    add(HREF.caseStudy(c.id), clip(`${c.question} ${c.result.value} ${c.result.label}.`, 240), 'article', {
      '@type': 'TechArticle',
      headline: c.title,
      author: { '@id': person['@id'] },
      mainEntity: question(c),
      citation: canonicalUrl(HREF.doc(c.writeUp.doc)),
    });
  }

  for (const path of docPaths) {
    const text = (await loadDoc(path)) ?? '';
    const route = parse(HREF.doc(path));
    const title = docTitle(text) ?? path;
    const description = docDescription(path, text);
    const when = dates[`docs/${path}.md`] ?? {};
    const report = path.startsWith('results/batch-reports/');
    const url = HREF.doc(path);
    pages.push({
      path: url,
      route,
      title: `${title} · ${SITE}`,
      description,
      ogType: 'article',
      ...when,
      jsonLd: graph(route, url, title, description, {
        '@type': report ? 'Report' : 'TechArticle',
        headline: clip(title, 110),
        author: { '@id': person['@id'] },
        ...(when.published ? { datePublished: when.published, dateModified: when.modified } : {}),
      }),
    });
  }
  return pages;
}

export const notFoundPage = { title: `Page not found · ${SITE}`, description: 'This page doesn’t exist.' };

/**
 * llms.txt (llmstxt.org): the site in plain text for AI tools, built from the same headline figures as the landing
 * page, so it can't drift from them.
 */
export function llmsTxt(pages: PageMeta[]): string {
  const line = (p: PageMeta) => `- [${p.path === '/' ? 'Overview' : short(p.title)}](${canonicalUrl(p.path)}): ${p.description}`;
  const pick = (test: (p: PageMeta) => boolean) => pages.filter(test).map(line).join('\n');
  return `# ${SITE}

> ${HOME_DESCRIPTION}

An open-source testbed by ${CONTACT.name} (${CONTACT.website}) for running AI agents hands-off. Claude, GPT and a free local model each drive an agent in one shared Minecraft world, chosen because agent behaviour there is observable and runs can be repeated; the game is the test environment, not the subject. The model chooses high-level goals; deterministic code (a skill library) carries them out. Every decision is logged, so every figure traces back to a run. Source code and data: ${REPO}

The full text of the case studies, lessons, write-ups and limitations, in one Markdown file: ${SITE_URL}/llms-full.txt

## Headline results (${HEADLINE.asOf})

${FIGURES.map((f) => `- ${f.value} ${f.label}. ${f.detail}`).join('\n')}

## Lessons for building agents

${lessons.map((l) => `- ${l.title}`).join('\n')}

## Pages

${pick((p) => !p.path.startsWith('/docs/'))}

## Write-ups

${pick((p) => p.path.startsWith('/docs/results/write-ups/'))}

## Research notes

${pick((p) => p.path.startsWith('/docs/') && !p.path.startsWith('/docs/results/write-ups/') && !p.path.startsWith('/docs/results/batch-reports/'))}

## Optional

- [Batch reports](${canonicalUrl(HREF.results)}): one report per batch of runs, ${pages.filter((p) => p.path.startsWith('/docs/results/batch-reports/')).length} in all, each built from its logs and listed on the Results page.

## Contact

- ${CONTACT.name}: ${CONTACT.email}, ${CONTACT.linkedin}, ${CONTACT.website}
`;
}

/** A doc's markdown with its links made absolute, so they still work read out of context. */
function absolute(docPath: string, markdown: string): string {
  return markdown.replace(/(?<!!)\[([^\]]*)\]\(([^)\s]+)\)/g, (_, text: string, href: string) => {
    const { url } = resolveLink(docPath, href);
    return `[${text}](${url.startsWith('/') ? `${SITE_URL}${url}` : url})`;
  });
}

function caseMarkdown(c: (typeof cases)[number]): string {
  const titles = new Map(lessons.map((l) => [l.id, l.title]));
  const list = (items: string[]) => items.map((x) => `- ${x}`).join('\n');
  return [
    `## Case study: ${c.title}`,
    `Source: ${canonicalUrl(HREF.caseStudy(c.id))}`,
    `**Question.** ${c.question}`,
    `**Setup.** ${c.setup}`,
    `**Result.** ${c.result.value} ${c.result.label}.`,
    `**What happened.**\n\n${list(c.happened)}`,
    `**What changed.**\n\n${list(c.changed)}`,
    c.leftAlone ? `**Left alone.** ${c.leftAlone}` : '',
    `**Lessons.** ${c.lessons.map((id) => titles.get(id) ?? id).join('; ')}.`,
    `**Full write-up:** [${c.writeUp.title}](${canonicalUrl(HREF.doc(c.writeUp.doc, c.writeUp.anchor))})`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

/**
 * llms-full.txt: the site's substance in one Markdown file, for AI tools that read a whole site at once. The llms.txt
 * summary, the case studies, the lessons notebook, every write-up (newest first) and the known limits. The batch
 * reports are left out: they are long tables, each a page of its own and listed in the sitemap. Call after
 * `sitePages`, which loads the docs.
 */
export function llmsFullTxt(pages: PageMeta[]): string {
  const doc = (path: string) => {
    const text = loadedDoc(path);
    if (text === null) throw new Error(`llms-full.txt: ${path} isn't loaded`);
    // Each doc's title becomes a level-2 heading under the file's own title, with its source beneath it.
    const body = absolute(path, text).replace(/^(#+)/gm, '#$1');
    return body.replace(/^(## .+)$/m, `$1\n\nSource: ${canonicalUrl(HREF.doc(path))}`);
  };
  return [
    llmsTxt(pages).trimEnd(),
    '# Case studies',
    ...cases.map(caseMarkdown),
    '# Lessons for building agents (the full notebook)',
    doc('lessons'),
    '# Write-ups',
    ...writeUps.map((w) => doc(w.path)),
    '# Known limits',
    doc('limitations'),
  ].join('\n\n') + '\n';
}
