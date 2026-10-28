# Project site

The public site for the experiment, framed around what it teaches about building agents: a
hand-written overview, the lessons (`docs/lessons.md`), case studies (the write-ups) and "how it's built", and every
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

The Results page tells the batches as a story, oldest first, in chapters: each asks one question,
each run says in a line what it showed and what was changed after it, and each chapter ends with what
it taught and a link to the lesson. The narrative is hand-written in `content/story.ts` from the
write-ups; everything else about a run (models, goals, outcome, cost) comes from its report:
`lib/batches.ts` reads each report written by `src/agents/scripts/publish-reports.sh` (its totals,
goals, teams and "Success per condition" table), and `vite.config.ts` serves the summaries as
`virtual:batches`. A new report is on the page at the next build (at once under `npm run dev`), in a
last chapter, "Not yet written up", until it is added to `content/story.ts` with the write-up; it is
linked to its write-up if the write-up links to the report or `docs/results/README.md`'s table names it. Opening a report shows the
same summary above its full text. The overview above the chapters (`pages/ResultsOverview.tsx`)
totals the same summaries: how often runs met their goal, by goal and by model, and how many teams
met theirs. Below it, the goals (`pages/ResultsGoals.tsx`): each goal's text is read from the agents'
own `src/agents/src/goals.ts` and its tallies from the reports, so both are automatic; the one-line note
on why each goal exists is hand-written in `content/goals.ts`. The Stats page (`#/stats`, `pages/Stats.tsx`)
adds up every report's per-agent tables (one row per agent per run): runs, decisions, tokens, cost,
deaths and goals met, by model, one goal at a time (the latest first) or all goals together; it is
automatic too. Its prompt-caching table is not: reports don't carry cache counts, so it reads
`docs/results/token-usage.json`, made from the run logs on the machine that runs the experiment by
`cd src/agents && npx tsx scripts/token-usage.ts`; run that again after a run and commit the file.
If `publish-reports.sh` changes the layout of a report, change `lib/batches.ts` with it. How it's built draws the README's control-loop diagram (mermaid, loaded only
on that page) from `README.md` itself, so the two can't drift.

The front page's lesson cards and chart are in `content/lessons.ts`, hand-written from
`docs/lessons.md` and the write-ups it cites: update them together. Each write-up opens with a
"What this teaches about building agents" section; its first sentence (`lessonOf` in
`lib/batches.ts`) is shown on Case studies, on Results beside every batch the write-up covers, and at
the top of those batch reports. A new write-up needs that section to show up there. Hosting is in `src/terraform/` (S3 + CloudFront at its own domain), and
`.github/workflows/site.yaml` builds and deploys on every push to `main` that touches this folder or
`docs/`. Asset paths are relative, so the same build would also work under a path.
