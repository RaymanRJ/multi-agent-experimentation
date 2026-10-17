# Can a small local model make an iron pickaxe?

*Results from batch b13, 17 October 2026. Model: Qwen3 4B Instruct, running locally (free).
Every number here comes from logged runs (`npm run report -- --by condition --batch b13`), and
every failure was read from its log.*

## In one paragraph

For the first time the `iron` goal was met in a full run: twice, both by the model with
`--progress on`. The model without it and the scripted baseline met it in none of their
three runs. Three runs per condition is too few to credit the progress list: 0/3 and 2/3 have
overlapping intervals. The smelt fix from b11 worked: both successes called `smelt` with
`raw_iron` and got ingots. The baseline lost most of two runs to its own rule of not starting
underground work at night. Most runs, whatever their brain, spent a large share of the day
digging down or failing to reach ore it could see.

## The setup

- **The goal (`iron`).** *Craft an iron pickaxe.* That means wood, a wooden pickaxe,
  cobblestone, a stone pickaxe, iron ore found underground, fuel, a furnace, smelting, and the
  craft itself.
- **World and time.** Sandbox (peaceful), 24,000 ticks (one day and night). Each run was in a
  fresh copy of the same seeded world.
- **Conditions.** The scripted baseline, and the model with no memory, with `--progress` off
  and on. Three runs each.
- **Code.** Main at `1d049ee`, with the smelt, flooded-cave, flee, dusk and progress changes.

## Results

| Condition | Met | 95% CI | Ticks to goal |
|---|---|---|---|
| Scripted baseline | 0/3 | 0%–56% | – |
| Model, no memory | 0/3 | 0%–56% | – |
| Model, no memory, `--progress on` | 2/3 | 21%–94% | 17,500 and 20,300 |

## Why the runs failed

- **The baseline waited out the night (2 of 3 runs).** Night fell while it was still above
  y=55. Its rule `if (!isDay && y > 55) wait` then had it wait in 30-second steps until
  sunrise: about 11,000 ticks, nearly half the run. The rule exists for survival, where caves
  at night are dangerous, but it also applies in the peaceful sandbox. The third run was
  already below y=55 at dusk, kept digging, and reached y=17, but still mined no iron (below).
- **The flooded cave still slowed everyone.** `descend` stopped over water again and again
  ("every way down is unsafe"). The baseline's new move-elsewhere rule worked (it explored and
  tried again), and so did the model's own `explore` calls. Once it found a dry way down,
  `descend` to y=16 took 3,000–6,000 ticks and usually wore out a stone pickaxe.
- **Seen ore could not be reached.** "gave up after 5 iron ore blocks could not be reached or
  broken" ended `mine_ore` calls in three of the seven failed runs (one baseline, two model). Its events show `out of reach` and
  `digging ore timed out after 20000ms` on ore a few blocks away. One baseline mine_ore call
  ran 5,000 ticks and gained nothing. This was not investigated.
- **The model looped on "need 3 more cobblestone".** In five of the six model runs, including
  both successes, it asked `craft stone_pickaxe` with no cobblestone 4–16 times in one run
  before trying `mine_stone`. The planks message says "gather_wood first", but the cobblestone message does
  not name the skill that gets it. Not fixed.
- **The model sat on raw iron.** One no-memory run reached y=−7 with 7 raw iron and a coal,
  and never called `smelt` in 13 more decisions. It kept mining and retrying the craft. The
  craft failure does say "mine_ore, then smelt".
- **One death in the peaceful sandbox,** deep underground (y≈3). The run log records only
  "you died and respawned", not the cause. The server log was gone by the time this was read,
  since each batch server is replaced by the next. Probably lava or drowning.

## What worked

- **`smelt` with the raw item's name.** Both successes called `smelt raw_iron`, which in b11
  failed five times in a row. One run first asked for three ingots from two raw iron and was
  told it needed one more.
- **`craft` pointing at the furnace.** "iron_ingot is smelted from raw_iron, not crafted" was
  followed by the model mining more ore, not by another craft attempt.
- **Moving away from the flooded cave.** Both brains got below it in most runs.

## Not a finding

- **The report's "Furthest" column reads `stone_pickaxe` for runs that met the goal,** because
  the milestone ladder is the same for every goal and has no iron step. Known; see
  `docs/limitations.md`.
