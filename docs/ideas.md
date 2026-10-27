# Ideas

Skills and changes that look worth having but aren't started. Each comes from something seen in the
logs. Move an item to `docs/next-steps.md` when it is picked up. As with every skill, the model would
choose it and deterministic code would do it.

## Skills

1. **Done 19 October: `hunt` (anything, players included, the owner's call) and `shear`.** Still open
   around them: telling an attacked agent who hit it, counting attacks between agents in the report,
   and a fighting reflex (hit back when hit, without asking the model, as the water reflex swims out). A creeper killed
   Sonnet in p2, and Haiku died at night; both might have gone differently. It would also let agents
   attack each other, which changes what the experiment allows: the owner decides whether it covers
   animals and hostile mobs only, or players too.
2. **`store` / `take`: use a chest.** Teams share only by `give`, which needs both agents in one
   place. A shared chest at camp would let them coordinate without meeting, and is a good team test.
3. **`farm`: plant and harvest wheat or carrots.** Only matters for runs of several days: in
   today's one-day outpost runs no agent's food fell below 15 of 20.
4. **Ranged weapons:** `craft` can already make a bow and arrows (string from spiders, feathers from
   chickens), but no skill shoots.
5. **`light`: place torches.** Mobs spawn in the dark, including in an unlit shelter or mine.
   Cheap to build, but torches need coal, which ties it to `mine_ore`.

## Hard goals

Goals for after the outpost, when single agents mostly meet it. A hard goal is too big for one day
and for one agent, and has steps that depend on each other, so that splitting the work pays.
Stated as outcomes, like every preset goal; what the game requires reaches the model through skill
descriptions and failure messages, not the goal text.

### `team-base` (20 October): `team-homestead` with one home

The same as `team-homestead`, except the shelter must be one large two-storey shelter (5×5 inside)
that every member has slept in a bed inside. The owner's call after thome1. That run's agents built
36 huts between them, and the night never passed: it skips only when every player is asleep.
Beds together also move each agent's respawn point home, away from the mobs at world spawn. Made
possible by `build_shelter` going into a nearby shelter, a large size built in parts, `sleep` putting
beds inside, and a sleep failure naming who was awake.

### `team-homestead` (built and first run 20 October, thome1: 0 of 3; see `docs/results/write-ups/05-team-homestead.md`)

> Over three days, keep everyone fed, build a two-storey shelter with a bed for each of you, make an
> iron pickaxe for each of you, and leave 10 cooked meat in a chest at the shelter.

What each part tests:

1. **Hunger.** Only bites over several days: in p5 no agent's food fell below 13 of 20 in a day. Three
   days (72,000 ticks) is enough to starve an agent that never eats. Food has to be found (animals
   are scarce), hunted, cooked (`smelt`) and handed over (`give`): a feeder and the fed.
2. **Iron.** Find ore, mine it with a stone pickaxe, smelt it with fuel, craft. A natural specialist.
3. **Beds, the dependency chain:** iron → shears → sheep → wool → beds. Every member must be in bed
   for a night to be skipped, so night becomes a shared problem.
4. **A shared stockpile.** Lets agents coordinate without meeting, a better test than `give`, which
   needs both in one place.
5. **Specialisation pressure.** Sized so one agent can't do it alone in the time.

Needed first (all done 20 October except the columns marked *not yet*):

- **Animals near spawn** (see below). p5 found no sheep at all; without them beds are impossible,
  and the run measures the world, not the models.
- **`store` / `take` skills** for a chest (Skills, item 2), checked live.
- **Report columns:** each member's lowest food and hits between agents are in. *Not yet:* food handed
  between members, who cooked, who mined and smelted, nights slept versus waited out, deaths by day
  and by night; the behaviour report's step list shows these for now.
- **Cost check before running:** 72,000 ticks is about an hour of real time a run; roughly $2–3 a
  team of three paid models, $7–9 for three runs. To be confirmed on a first run.

### Animals: why there are so few, and what to do

The start area is dark oak forest. Farm animals (cow, sheep, pig, chicken) mostly appear when chunks
are first generated; afterwards they spawn only rarely, on grass with light level 9 or more, under a
cap per player. A dark oak canopy keeps the ground dark, so the forest holds few, and few return.
The world is reset before each batch, so what generation placed is all there is. On a fresh copy,
the loaded area held 1 cow, 6 pigs, 1 chicken and no sheep. Turning mob spawning on does not help
(`survival` already has it on).

Options, best first:

1. **Place animals at the start, as a world setting.** The scenario setup already runs commands
   (`difficulty`, `gamerule`); it could also summon a fixed set (say 6 sheep, 4 cows, 4 pigs, 4
   chickens) at fixed spots 40–100 blocks from spawn. Same seed, so p5 and later stay comparable on
   everything else; reproducible run to run; and the number becomes a dial (plenty versus scarce)
   that is itself worth measuring. Allowed by scenario parity, since it is a world setting, as long
   as both scenarios get the same animals. Downside: hand-placed animals in a forest look artificial,
   and they still wander off or get killed by mobs at night.
2. **A different seed,** with plains or meadow (sheep, cows, horses) and some forest and stone near
   spawn. More natural, and animals would be spread out as in a real world. Downside: every result so
   far is on the current seed, so all baselines (scripted, qwen, p5, p6) would have to be re-run to
   compare; finding a good seed takes a survey of a few candidates.
3. **Other food, as skills:** `farm` (wheat from grass seeds, then bread; Skills, item 3) and
   breeding (two of an animal plus its food make a third), both renewable; apples from oak and dark
   oak leaves are rare. Good for long runs whatever the animals, but do not give wool.

The proposal: option 1 now, for `team-homestead` and as a setting in both scenarios; a sheep survey
of the current seed first, to say exactly what is there and where; option 3 later, for runs of more
than a few days. A new seed only if hand-placed animals turn out not to work.

## The prompt

### Are the skill descriptions earning their length? (the owner's question, 27 October)

**What we know.** A decision's prompt is about 5,700 tokens (bpoc9, Luna; Claude about 8,200 with
history): the 25 skill descriptions are about 3,400 of it (60%), the rest of the system prompt about
900, the observation about 1,400. That is small against the paid models' windows, and caching reads
75-78% of it at a tenth of the price, so length is not a cost problem. On the local 4B model it was a
problem: full memory filled its 8,192-token window and five of six runs gave up early
(`docs/limitations.md`).

**What we don't.** Whether the detail in the descriptions helps the paid models or buries the rules.
Each tool fix tends to add a sentence (`flee` is the longest, about 390 tokens), and agents have
missed things a description says: nobody stored a pickaxe after `store` said a chest keeps items
through a death, and la kept digging with 7 uses left. That could be the length or their judgement;
it hasn't been measured.

**The test (no game, under a dollar on Luna).** Every decision's prompt is logged, so:
1. Pick about 50 logged decisions where the choice mattered: a monster close, at night, low health,
   a goal item in hand.
2. Re-ask the same model with today's descriptions and with trimmed ones (each skill cut to what it
   does, its arguments and its main failure).
3. Compare the decisions. If they agree, trim and keep the saving; if the trimmed prompt chooses
   worse, the detail is earning its place, and the next question is which parts.

Do it before descriptions grow much further, or before comparing a model with a smaller window.
