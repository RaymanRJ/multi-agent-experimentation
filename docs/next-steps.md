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
  - **First real teamwork** (team trio1: Haiku, Sonnet and qwen, all fixes in): goal met in 8,100
    ticks for $0.33. Sonnet proposed the split, made all four tools, built the two-storey shelter,
    then handed qwen an axe and Haiku a shovel with `give` (both worked). Haiku lost most of its run
    to `mine_stone` under water. qwen asked for logs it already held 28 times; told that `count` is a
    total, it raised its count twice (10, then 20, then 40) but kept looping.
  - **Requests between agents** (team trio2, 18 October: same three agents, with `tell_agent`,
    `ask_agent` and no hearing their own messages; 12,000 ticks by mistake, trio1 had 24,000). Goal
    not met; $0.41. By 5,500 ticks Haiku alone held all four stone tools and had built the
    two-storey shelter: only handing tools over was left, and that never happened.
    - Haiku asked qwen 17 questions (its tools, then its coordinates). qwen never answered one:
      every "answer" was its usual line to everyone ("Gathering more logs…"), which `ask_agent` then
      accepted (fixed: only a reply addressed to the asker counts). qwen started by exploring 10
      times and ended ~200 blocks away; it gave its coordinates once, addressed to itself.
    - Sonnet used `tell_agent` once, well: it told Haiku to give qwen a stone axe, and Haiku complied
      at once (the give failed: qwen was out of sight). qwen also told Haiku to give it the axe.
    - Haiku's `give` to Sonnet failed with the giver sweeping its own toss back up (8 of 8 had worked live).
    - Sonnet drowned in `mine_stone` twice, died once and lost its pickaxe (item 4).
    - Haiku's unusable answers rose from 0 in trio1 to 11 of 50 calls: analysis with no JSON, and
      invented skills (`say`, `tell_agent` with a `question`). The new skills may be confusing it.
  - **Team trio3** (18 October, after the drowning and trio2 fixes, 24,000 ticks): **goal met at
    ~19,000 ticks for $1.28** (Haiku $0.44, Sonnet $0.85, near its $1 cap). No deaths and no
    drowning: qwen went under twice and the reflex swam it out both times. Sonnet made all four tools,
    built the two-storey shelter (on its third try: twice "blocked by dark_oak_log") and gave Haiku a
    shovel; qwen looped on `gather_wood` 40 times, then crafted its own stone pickaxe at the very
    end, which completed the goal. Nobody used `tell_agent`; Haiku used `ask_agent` 7 times.
    Found:
    - **Agents are never told their own name** (not in the observation, not in the prompt). Haiku
      tried three times to `give` to "haiku", Sonnet asked "sonnet" a question, qwen spoke to "qwen".
    - **`go_to(to)` and `go_to(x, z)` are always rejected:** the parser requires every arg a skill
      lists, but go_to takes either. All 24 of Haiku's re-asks were this (~$0.12).
    - **`ask_agent` took `give`'s own chat line** ("bringing you 1 stone_shovel, stay where you
      are") as the answer, twice.
    - Sonnet answered in tool-call form first on 41 of its 79 calls (item 0): about half its cost.
    - *Fixed after trio3:* the prompt gives the agent its name; skill args can be optional (`"number?"`,
      so `go_to(to)`, `go_to(x, z)`, `give` without a count, `pick_up` without an item, `build_shelter`
      and `tunnel` without their options all parse); a skill's own chat lines are marked `[auto]` and
      `ask_agent` ignores them. Not yet tried in a team run.
    - Haiku called `pick_up` for a shovel 20 times, mostly while already holding it; qwen claimed to
      have handed over a sword it never had.

- **Team quad1** (18 October; Haiku, Sonnet, GPT-6 Luna and qwen, with every fix above): **goal met
  in 4:54 of game time for $0.28** (trio3: 15:56, $1.28). Sonnet made all four stone tools by 1:49
  and handed a sword to Luna, an axe to Haiku and a shovel to qwen; Luna built the two-storey
  shelter, its first and only build, in 10 decisions for under half a cent. Nobody died. qwen still
  looped (`gather_wood` 13 times) but ended holding the shovel it was given. Sonnet's re-asks fell
  from about half its calls to 9 of 25; all 9 were it calling a skill's name as a tool instead of
  `decide` (fixed after the run: read as choosing that skill; live, 4 of 4 decisions in one call).
  Nobody used `tell_agent` or `ask_agent`. One run, not a comparison.
- **Prompt changes on 18 October, after trio3:** the collaborative stance lost "so share what you
  find and split the work" (it steered the model); `air` now says what 0 means (2 health a second
  while under water, not instant death); `gather_wood` says every kind of log counts and makes the
  same things. Team runs trio1–trio3 had the old wording.

## Open, most wanted first

0. **Sonnet's tool-call answers: fixed 18 October.** Claude is now offered a `decide` tool (not
   forced, so Haiku still writes its reasoning before calling it). Live: Sonnet and Haiku each
   decided in one call through the tool. GPT stays on JSON text (see `docs/limitations.md`).

0a. **Done after trio2 (18 October), not yet tried in a team run:** a note after every third
   `ask_agent`/`tell_agent` in a row to the same agent; `give` paths away from the drop when
   stepping back goes nowhere (3 of 3 live, back to a wall) and won't drop for a receiver under
   water; a `say` to oneself goes to everyone. **Drowning:** `mine_stone` counted stone beside water
   as exposed and swam to it, so agents dug under water (25× slower: the "digging stone timed out"
   failures) until their air ran out. Now stone touching water is never mined, the search looks only
   for open stone (it used to look at the nearest 128 stone blocks, nearly all buried, and dig down
   when none was open), and swimming costs the pathfinder 8× a step. Live: 4 of 4 runs from spawn,
   random spots and a lake shore, 0 ticks under water. A skill is stopped at half air, before any
   damage; the code swims the agent out *before* the model decides (not after); the agent sees `air`
   when it is losing it. Live: out of a 5-deep pool in 1.3 s, out of a flooded room with a ceiling
   in 10.7 s.

1. **A comparison of goals and agents: done 18 October** (`npm run compare`, `src/compare.ts`).
   Every team run and batch writes `runs/compare-<team|batch>-<name>.md`: by goal, by model and
   condition, and for teams who did what, requests and a timeline. Extend it as questions come up.
2. **The long paid test** (proof of concept, step 2 of the runbook in `docs/experiments.md`): one
   `outpost` run each on Haiku, Sonnet and Opus, survival, 27,000 ticks, `BUDGET_USD=5`. Estimated
   about $5 in total; ask before running.
3. **Confirm recent fixes on the free model:** an outpost batch with `--progress` off and on (3 runs
   each, ~2 h), then the two open baseline problems in `docs/limitations.md` (waiting out the night in
   the sandbox; `mine_ore` failing to reach ore it can see).
4. **`mine_stone` is slow:** the drowning is fixed (0a; trio3 had none), but "digging stone timed
   out after 20000ms" still appears in trio3 (Haiku and qwen), with walking and exploring timeouts.
   The under-water digging explained some of it, not all. Not yet investigated.
5. **Panel start line: done 18 October.** An agent writes `<log>.start.json` when it starts, and the
   panel lists it as "Starting" until its first decision is logged.
6. **Extended thinking for Claude: left off, written up as a limitation** (`docs/limitations.md`,
   "Not yet tested", with how to measure it). Candidate for the long paid test (#2 above).
7. **Made public 18 October.** The history was scanned for keys, tokens and private keys (none); the
   `protect-main` ruleset is enforced and now also requires CI; outside contributors' pull requests
   need approval before any workflow runs; only GitHub-owned actions are allowed; the workflow token
   is read-only. Work goes through branches and pull requests (`CLAUDE.md`).
8. **Two drowning gaps, deferred by the owner (18 October):** water while the model is thinking,
   and a skill started after a failed escape. Both are described with their fixes in
   `docs/limitations.md` ("Rough edges in the code"). Leave them unless drowning shows up again.
