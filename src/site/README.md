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

The front page's findings and chart are in `content/findings.ts`, hand-written from
`docs/results/write-ups/06-team-base.md`: update both together. Hosting is in `src/terraform/`, and
`.github/workflows/site.yaml` builds and deploys on every push to `main` that touches this folder or
`docs/`.
