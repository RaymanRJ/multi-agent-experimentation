# Where things stand, and what's next

Read this at the start of a session; update it when something finishes or a new ask comes in.
*Last updated 18 October 2026.*

## Setting up a new machine

1. Docker, [Ollama](https://ollama.com/) and Node 25+, then `npm install`.
2. `cp .env.example .env` and add `ANTHROPIC_API_KEY` (and any other keys). Never commit it.
3. `./start.sh --check` says what's missing. It pulls the local model (`qwen3:4b-instruct`); the
   agent makes its 8k-context variant itself on first use.
4. `npm test && npm run typecheck` should pass with no server, model or key.
5. `runs/` (run logs) is not in git, so it starts empty. The results that matter are written up in
   `docs/results/`.

## Where things stand

- **The single-agent loop** works with the free local model, the scripted baseline and Claude.
  Results so far are in `docs/results/`; what isn't done is in `docs/limitations.md`.
- **Paid models (18 October).** Haiku 4.5, Sonnet 5.5 and Opus 5.5 each met `tools` in 4–5
  decisions for $0.01–$0.04 (batch poc1). The free 4B model usually needs dozens. Prompt caching
  works on Sonnet and Opus (~70% of input); Haiku's minimum is above our prompt, so it never caches.
- **Teams (18 October).** `team-camp` is a goal for the whole team: four stone tools between them,
  every member carrying one, and a two-storey shelter. Agents can `give`, `pick_up` and `go_to`; a
  collaborative agent stays until the whole team is done. Each run writes a behaviour report beside
  its log (`runs/<file>.summary.md`), and the minds panel (`:3010`) has a Run setup dialog.
- **What the team runs showed:**
  - Haiku plans well, talks, and tried to help: it built the whole camp, then tried to hand qwen a
    tool. Early `give` failed in the real game (fixed: 8 of 8 live hand-overs now work).
  - The free 4B model (qwen) contributes nothing: it waits "for safety" in a peaceful world, crafts
    the same tool four times, or repeats one no-op decision 147 times even when told the fix.
  - Agents that drift apart couldn't meet again (fixed: `go_to`). Haiku died in lava while clearing
    a shelter (fixed: `build_shelter` won't dig beside lava or water).
  - Repeated chat ("Gathering 10 more logs…") interrupted teammates over and over (fixed: the same
    words from the same sender interrupt only once).

## Open, most wanted first

1. **A comparison of goals and agents.** The owner wants, eventually, a breakdown of each goal and
   how the agents behaved, to compare across goals, models and team set-ups (who did what, what they
   said, what they handed over). Build on the per-run report (`src/summary.ts`).
2. **The long paid test** (proof of concept, step 2 of the runbook in `docs/experiments.md`): one
   `outpost` run each on Haiku, Sonnet and Opus, survival, 27,000 ticks, `BUDGET_USD=5`. Estimated
   about $5 in total; ask before running.
3. **Confirm recent fixes on the free model:** an outpost batch with `--progress` off and on (3 runs
   each, ~2 h), then the two open baseline problems in `docs/limitations.md` (waiting out the night in
   the sandbox; `mine_ore` failing to reach ore it can see).
4. **`mine_stone` dig timeouts** ("digging stone timed out after 20000ms") took most of Sonnet's
   `tools` run and both agents' time in a team run. Not investigated.
5. **The panel shows a run only after its first decision ends,** which can be minutes. An agent
   could write a start line when it joins.
6. **Extended thinking for Claude** (`--thinking on`) was discussed and left off for now: it costs
   several times more per decision and would be its own condition.
7. **Before making the repo public:** scan the git history for secrets, check the `protect-main`
   ruleset is enforced (`gh api repos/RaymanRJ/multi-agent-experimentation/rulesets`), and go back to
   branches and pull requests.
