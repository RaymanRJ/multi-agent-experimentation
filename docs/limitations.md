# Known limits and further work

What this MVP does not do, does not do well, or has not been tested on. Nothing here is being
worked on. The list is so a reader knows where the edges are before trusting a result or
building on it.

## Not yet tested

- **Paid models have only been tried, not compared.**
  - Claude Haiku 4.5, Sonnet 5.5 and Opus 5.5 each met the `tools` goal once (batch poc1, 18 October:
    4–5 decisions, $0.01–$0.04 a run), and Haiku and Sonnet have played team runs. No batch with
    repeats has run on a paid model, and no long goal (`outpost`) has.
  - Prompt caching works on Sonnet and Opus (about 70% of input cached). Haiku 4.5 never caches: our
    prompt (about 2,150 tokens) is below its minimum.
  - OpenAI, Grok, Gemini, Groq and OpenRouter are wired up and unit-tested only. Each needs its
    model's price in `src/backends/pricing.ts`, or a paid run refuses to start.
- **The `iron` goal has been met only twice** (batch b13, sandbox, one day, three runs per
  condition): both by the model with `--progress on` (2/3). The model without it and the
  baseline went 0/3. Too few runs to credit the progress list. Details in
  `docs/results/2026-10-iron.md`. Open problems found there, none fixed:
  - **The baseline waits out the night above y=55 even in the peaceful sandbox,** losing about
    11,000 ticks in two of three runs. The rule is meant for survival.
  - **`mine_ore` often can't reach iron it can see** ("out of reach", 20-second dig timeouts),
    then gives up after five blocks. One baseline call ran 5,000 ticks for nothing.
  - **"need 3 more cobblestone" didn't name `mine_stone`,** unlike the planks message, which
    names `gather_wood`. The model retried the craft 4–16 times per run before mining stone.
    Since fixed, but not yet confirmed in a full run: the message now names `mine_stone`.
  - **`descend` to y=16 takes 3,000–6,000 ticks** and usually wears out a stone pickaxe.
  - **Deaths are logged without a cause.** The run log says "you died and respawned"; the
    server log that has the cause is replaced with the next batch's server.
- **The `diamond` goal has only been checked skill by skill** (`scripts/skill-smoke.sh`), never
  as a full run.
- **Other platforms.** Developed on an Apple Silicon Mac. Linux, Windows (WSL2) and Intel Macs
  should work but are untested. So is running Ollama in Docker on an NVIDIA machine.

## What agents can't do

- **No fighting, farming or chest storage.** An agent can only run from mobs (`flee`), eat food it
  already has, and keep everything in its inventory, or hand it to another agent (`give`).
- **`give` needs the receiver within reach of the giver.** The giver walks up beside them and drops
  the items at its feet; 8 of 8 live hand-overs worked that way. Tossing from two blocks or more
  overshot (1 of 5), and from one block the giver swept its own toss back up. A wall between them,
  such as the giver standing inside its shelter, can still leave the items on the giver's side; the
  receiver is then told by name that they are on the ground, so it can `pick_up` them.
- **`flee` walls the agent in when it can't run away,** for example in a pit or a cave. In b12 it
  walled one agent in, and once, underground, failed with two gaps left that it could not fill
  (that baseline run later died). Without dirt, cobblestone or planks to place it gives up. Before this fix, being cornered ended at least one outpost run.
- **The model rarely completes the outpost goal** (3 of 18 runs in b12; see
  `docs/results/2026-10-outpost.md`). `--progress on` got it to try the shelter more often
  (6 of 9 runs against 3 of 9), but the sample is small. Open problems found in b12, none fixed:
  - **The baseline's outpost goes on to dig for iron** after its shelter, and the flooded-cave
    fix now takes it away from the shelter to do so. It fell from 3/3 in b10 to 1/3. Now
    it never digs with its last pickaxe (one run lost the outpost that way), and in b14 it met
    the goal 3/3. Being caught underground at night (the other failed b12 run) is not addressed.
  - **The model keeps crafting tools it already holds,** dozens of times per run, failing for
    want of cobblestone. Since fixed, but not yet confirmed: a failed craft now says when the
    item is already held, and the cobblestone message names `mine_stone`.
  - **A run with the goal all but met ended on two "done"s** before the night it had to survive.
  - **Full memory fills the local model's 8,192-token window** (~7,200 tokens per call), and
    five of six runs gave up early.
  - **`build_shelter` sometimes can't clear dirt or grass from its own floor,** and `smelt`
    once failed three times with "destination full". Neither was investigated.
- **The terrain near spawn is awkward.**
  - Some agents start on top of dark oak trees and lose time getting down.
  - A flooded cave lies under the spawn area. The skills now stop before digging into water, but agents near it still mine slowly.
- **Ore must be visible to be mined.** By design there is no x-ray. Finding iron and diamonds
  means digging staircases and tunnels, which wears out pickaxes and takes many minutes.

## What the measurements can and can't show

- **Small samples.** Most conditions have 3 runs, so a 3/3 is consistent with a true success
  rate as low as 44%. Pooled batches are firmer, but only batches run on the same code are
  comparable.
- **One model.** All findings so far are about one 4B local model (Qwen3 4B Instruct). Bigger
  models may behave differently, especially with plan memory.
- **The code changed between batches.** Each batch was run on one version of the code, but fixes
  went in between batches. Compare batches only where the write-ups say they are comparable.
- **Start points vary within a 20-block area,** which puts some agents beside oak and others beside
  dark oak, and some near the flooded cave.
- **Wall-clock depends on the machine.** The game keeps running while a model thinks, so a slow
  machine or a slow provider costs game time. That is on purpose, but it means results from
  different machines are not directly comparable.
- **No pre-registration.** Hypotheses were not written down before the batches ran.

## Rough edges in the code

- **Two gaps in the drowning reflex, left on purpose (18 October).** A skill is stopped when air
  falls to half, and the code swims the agent out before the model decides, so the model is told
  afterwards and never asked to handle the water. Not covered:
  - **Water while the model is thinking.** No interrupt watches while a decision is being made, so
    an agent that slips into water then waits until the decision returns (5–20 s on a paid model)
    before the swim-out runs. Fix: run the same check on a timer during the decision.
  - **A failed escape.** If the swim-out finds no way out, the next skill starts with air already
    below half, and the air interrupt only fires when air *crosses* half, so only drowning damage
    stops it (and `flee`, `eat` and `sleep` ignore damage). The model does see "could not find a
    way out" and `air`. Fix: start no skill but the one the model chose with that in view, and fire
    the air interrupt whenever air is below half.

- **Messages by name interrupt an agent at most once a minute,** timed on the wall clock. That is
  enough to stop two agents cancelling each other's work, but it is a rule of thumb, not tuned.
- **Narration in chat is limited to once every 1.5 seconds** to avoid the server kicking a bot for
  spam. In a burst of instant failures, other agents' view of what that agent is doing can lag.
- **Prompt caching is built but not yet seen working on a real account.** It is checked only by
  tests with fake API clients so far:
  - Claude requests mark the system prompt and the history for caching.
  - OpenAI caches long prompts by itself, and the report counts the hits.
  - GPT-6 models have no listed cached price, so their cached tokens are billed at the full input
    price in our numbers. Our numbers can overstate their cost, never understate it.
  - The system prompt is about 1,300–1,800 tokens, which may be under some Claude models' minimum
    for caching. Runs with no or plan memory then get no saving on that model.
  - With full memory on a paid model, the history is now cut to half its budget when it fills,
    rather than one exchange at a time. That keeps the cache hitting, but it also means the model
    sees between 10,000 and 20,000 tokens of history rather than always about 20,000.
- **CI runs no game.** Pull requests are checked by unit tests only. The skills' real
  behaviour is checked by hand with `scripts/skill-smoke.sh`, and by the batches.
- **Run logs are not backed up.** `runs/` is gitignored because logs contain full prompts. Copy
  it somewhere if the results matter.
