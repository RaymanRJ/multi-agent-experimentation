# Project site

The public site for the experiment, for two readers. The overview (`pages/Home.tsx`) is for someone deciding in a
few minutes, such as a prospective employer or client: the result in plain terms, what it means for a company, how
the work is approached, and contact details (`lib/contact.ts`); the game appears once, as the test environment. The
deep dive (`pages/DeepDive.tsx`) is the way in for a technical reader: the lessons (`docs/lessons.md`), case studies
(the write-ups), results, stats, "how it's built" and limitations. Every
doc in the repository's `docs/` (write-ups, batch reports, limitations…) rendered when the site is
built, so a new write-up appears on the next deploy without touching this code. `docs/next-steps.md`
is left out: it's working notes.

Vite, React and TypeScript, like music-viz. Pages have real paths (`/lessons`,
`/docs/results/write-ups/06-team-base#heading`), and links between them change the page without a reload
(`lib/route.ts`). Old hash addresses (`#/lessons`, `#/docs/x::heading`, used until 19 November) redirect to their
paths. Links between docs stay on the site; links to code open on GitHub.

**Search and answer engines.** `npm run build` pre-renders every page to static HTML, as rrjamal.ca does: a second
Vite build of `entry-server.tsx` (into `dist-ssr/`, deleted afterwards), then `scripts/prerender.mjs` writes
`dist/<path>/index.html` for each page with its own title, description, canonical URL, Open Graph tags and JSON-LD,
plus `dist/sitemap.xml`, `dist/llms.txt` (a summary with every page) and `dist/llms-full.txt` (the case studies,
lessons notebook, write-ups and limitations in one Markdown file, links made absolute, for AI tools that read a whole
site). The build fails, rather than ship a broken page, on a doc whose name has a dot (CloudFront would serve it as a
file), two pages at one path, or a page with no description. All of it comes from `lib/seo.ts`, which lists every page: the overview,
the deep dive's sections, each case study and every doc. A new doc is picked up by itself; **a new page needs an entry
there**, or it is never pre-rendered and the live site serves it the 404 page. A doc's dates (sitemap `lastmod`,
`datePublished`) are its first and last commit, so CI checks out the whole history. Both llms files are built
from `content/headline.ts`, `content/cases.ts` and the docs, so they never need editing by hand. Each case study is
marked up as its question and answer, and Case studies as a `FAQPage` of all four. The landing page's "How we know"
explanations are in the page, hidden until opened, so the reason for each figure is in the HTML too. The JSON-LD names the author by rrjamal.ca's `Person` id, so
engines tie the two sites together. React draws over the pre-rendered page rather than hydrating it; a doc is loaded
before the first draw, so there is no "Loading…" flash. `public/robots.txt` allows every crawler, and each deploy
pings IndexNow (Bing and others) with the sitemap's URLs; the key in `site.yaml` must match `public/<key>.txt`.
`public/og.png` is the link-preview card, rendered from `scripts/og-card.html` (the command is in its header): it
repeats the headline figures, so re-render it when they change. CloudFront serves `/lessons` from
`lessons/index.html` with a viewer-request function (`src/terraform/modules/cloudfront/`), which also sends `www.` to
the bare domain. `npm run preview` doesn't map paths to their `index.html` the way CloudFront does, so request
`/lessons/` there to see the pre-rendered page.

```sh
npm install
npm run dev       # http://localhost:5174, reloads on change
npm run build     # type-check, build to dist/, pre-render every page, sitemap and llms.txt
npm run preview   # serve dist/ at http://localhost:4174
```

The deep dive has six sections, one menu on every technical page (`lib/DeepNav.tsx`): Start here, How it works,
Results, Case studies, Lessons, and Method and limits. Their text is short and purpose-built in `content/` and
`pages/`, not the long docs: `content/milestones.ts` (the shared goal over time), `content/cases.ts` (four curated
cases), `content/lessons.ts` (eight principles). The full research record in `docs/` (write-ups, the lessons
notebook, limitations, batch reports) is still rendered and linked for depth. Results lists every report
automatically: `lib/batches.ts` reads each report written by `src/agents/scripts/publish-reports.sh`, and
`vite.config.ts` serves the summaries as `virtual:batches`; opening a report shows the same summary above its full
text.

Every page has an "On this page" guide (`lib/PageNav.tsx`): its sections (the h2s, and a doc's h3s), the one being
read, and how far down the reader is. It sits beside the text where the screen leaves room, otherwise it is a button in
the corner that opens the list.

Screenshots are WebP files in `assets/screenshots/`, each sized, described, captioned and traced to its run in
`content/screenshots.ts`, and on deep-dive pages only, never the overview. `lib/Screenshot.tsx` shows them; like the
control-loop diagram, each opens full size when clicked (`lib/Enlarge.tsx`).

The front page's lesson cards and chart are in `content/lessons.ts`, hand-written from
`docs/lessons.md` and the write-ups it cites: update them together. Each write-up opens with a
"What this teaches about building agents" section; its first sentence (`lessonOf` in
`lib/batches.ts`) is shown on Case studies, on Results beside every batch the write-up covers, and at
the top of those batch reports. A new write-up needs that section to show up there. Hosting is in `src/terraform/` (S3 + CloudFront at its own domain), and
`.github/workflows/site.yaml` builds and deploys on every push to `main` that touches this folder or
`docs/`. Asset paths are relative, so the same build would also work under a path.
