# Project site

The public site for the experiment, for two readers. The overview (`pages/Home.tsx`) is for someone deciding in a
few minutes, such as a prospective employer or client: the result in plain terms, what it means for a company, how
the work is approached, and contact details (`lib/contact.ts`); the game appears once, as the test environment. The
deep dive (`pages/DeepDive.tsx`) is the way in for a technical reader: the lessons (`docs/lessons.md`), case studies
(the write-ups), results, stats, "how it's built" and limitations. Every
doc in the repository's `docs/` (write-ups, batch reports, limitations…) rendered when the site is
built, so a new write-up appears on the next deploy without touching this code. `docs/next-steps.md`
is left out: it's working notes.

Vite, React and TypeScript, like music-viz. Pages use hash routes (`#/findings`,
`#/docs/results/write-ups/06-team-base`), so the static S3 site needs no rewrite rules. Links
between docs stay on the site; links to code open on GitHub.

```sh
npm install
npm run dev       # http://localhost:5174, reloads on change
npm run build     # type-check, then build to dist/
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

The front page's lesson cards and chart are in `content/lessons.ts`, hand-written from
`docs/lessons.md` and the write-ups it cites: update them together. Each write-up opens with a
"What this teaches about building agents" section; its first sentence (`lessonOf` in
`lib/batches.ts`) is shown on Case studies, on Results beside every batch the write-up covers, and at
the top of those batch reports. A new write-up needs that section to show up there. Hosting is in `src/terraform/` (S3 + CloudFront at its own domain), and
`.github/workflows/site.yaml` builds and deploys on every push to `main` that touches this folder or
`docs/`. Asset paths are relative, so the same build would also work under a path.
