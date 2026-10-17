# Known limits and further work

What this MVP does not do, does not do well, or has not been tested on. Nothing here is being
worked on. The list is so a reader knows where the edges are before trusting a result or
building on it.

## Not yet tested

- **Paid models have not been run end to end.**
  - The Claude and OpenAI adapters are unit-tested, and they make one check call before a run starts.
  - But no full experiment has run on a paid model yet: every result so far is from the free local model.
  - Grok, Gemini, Groq and OpenRouter are wired up the same way, with the same caveat.
  - Each needs its model's price added to `src/backends/pricing.ts`, or a paid run refuses to start.
- **Some goals have barely been run.** `iron` and `diamond` were checked once each, skill by skill
  (`scripts/skill-smoke.sh`). They have not been run as full experiments.
- **Other platforms.** Developed on an Apple Silicon Mac. Linux, Windows (WSL2) and Intel Macs
  should work but are untested. So is running Ollama in Docker on an NVIDIA machine.

## What agents can't do

- **No fighting, farming or chest storage.** An agent can only run from mobs (`flee`), eat food it
  already has, and keep everything in its inventory.
- **`flee` can't get out of a pit.** If an agent is down a hole it dug, or boxed in, `flee` reports
  "no path away" and the agent is stuck until the mob leaves. This ended at least one outpost run.
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

- **Messages by name interrupt an agent at most once a minute,** timed on the wall clock. That is
  enough to stop two agents cancelling each other's work, but it is a rule of thumb, not tuned.
- **Narration in chat is limited to once every 1.5 seconds** to avoid the server kicking a bot for
  spam. In a burst of instant failures, other agents' view of what that agent is doing can lag.
- **No prompt caching.** Paid runs resend the whole prompt each decision. Caching would cut cost,
  especially with full memory.
- **Run logs are not backed up.** `runs/` is gitignored because logs contain full prompts. Copy
  it somewhere if the results matter.
