# Project site

The public site for the experiment: a hand-written overview, findings and "how it works", and every
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

The Results page is built from `docs/results/batch-reports/` with no hand-kept list: `lib/batches.ts`
reads each report written by `src/agents/scripts/publish-reports.sh` (its totals, goals, teams and
"Success per condition" table), and `vite.config.ts` serves the summaries as `virtual:batches`. A new
report is on the page at the next build (at once under `npm run dev`), linked to its write-up if the
write-up links to the report or `docs/results/README.md`'s table names it. Opening a report shows the
same summary above its full text. The overview at the top of Results (`pages/ResultsOverview.tsx`)
totals the same summaries: how often runs met their goal, by goal and by model, and how many teams
met theirs. If `publish-reports.sh` changes the layout of a report, change
`lib/batches.ts` with it. How it works draws the README's control-loop diagram (mermaid, loaded only
on that page) from `README.md` itself, so the two can't drift.

The front page's findings and chart are in `content/findings.ts`, hand-written from
`docs/results/write-ups/06-team-base.md`: update both together. Hosting is in `src/terraform/` (S3 + CloudFront at its own domain), and
`.github/workflows/site.yaml` builds and deploys on every push to `main` that touches this folder or
`docs/`. Asset paths are relative, so the same build would also work under a path.
