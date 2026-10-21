# Skills

A **skill** is one thing an agent can decide to do, like "gather 10 logs" or "build a shelter".
The model picks a skill and its arguments. Our code (in `src/skills/`) carries it out: it finds
things, walks there, retries, gives up, and reports what happened in plain words. The model never
steers the character directly, so it never chooses a direction or presses a button.

The list below is the agent's whole vocabulary. If something isn't here, the agent can't do it.

## How a decision works

1. **The agent looks around.** The code builds a short summary called an *observation*:
   - what the agent is holding;
   - what useful blocks are within 24 blocks, as counts only (for example "14 dark oak logs", with no positions);
   - health, hunger, and time of day;
   - nearby mobs and other agents;
   - the result of its last skill;
   - which tools it could craft right now;
   - by day, how long until night;
   - with `--progress on`, what the preset goal still lacks ("no shelter has been built yet").
2. **The model chooses** one skill and its arguments, for example `craft(stone_pickaxe, 1)`.
   It also gives a short reason, a plan, and optionally a chat message.
3. **The skill runs** until it finishes, fails or is interrupted. A skill call can take many
   seconds of game time, while a model call takes a few seconds of real time, so the model
   decides only between skills, never during one.
4. **The skill reports back**: `success`, `failed` or `aborted`, plus a reason written for the
   model to act on, such as "need 2 more oak_planks… gather_wood first". That report goes into
   the next observation.

Every skill also stops when the run ends. Skills that move around also stop when a hostile mob
comes close, when the agent takes damage, at dusk (about a minute before night) and at nightfall,
so the model can decide what to do about the dark. `build_shelter` is the exception for dusk and
nightfall: getting under cover is the answer to them. One reflex runs before any skill: if the agent's head is under water, the code first
moves it to the nearest dry spot, since drowning damage would otherwise stop every skill at once.

**No seeing through walls.** The bot's code knows every block around it, including ore sealed
inside solid rock. Observations and `mine_ore` count only ore a player could see, touching air or
water, so finding iron and diamonds takes real searching (`descend`, `tunnel`, `explore`). Wood
and stone are still counted whether or not they're visible, which keeps earlier batches
comparable.

## The skills

| Skill | What the model asks for | What the code does | Typical failure it reports |
|---|---|---|---|
| `gather_wood(count)` | Hold this many logs **in total**, all kinds added together | Any kind of tree: every kind of log makes the same planks, sticks, tools and shelters, and `craft` uses whichever wood is held, so there is no type to choose. Finds the nearest tree it can actually reach: on the ground, not buried, and not one it already failed on. It looks out to 32, then 64, then 128 blocks. It walks there, cuts the trunk from the bottom up, picks up the logs, and repeats. If it already holds enough logs, it fails and says that `count` is a total. Trees beside another agent come last. | "no reachable trees within 128 blocks — explore to find some" |
| `explore(distance)` | Walk 16–96 blocks somewhere new | Remembers where this agent has been and picks the heading that leads farthest from all of it. On arrival it reports what's nearby (logs, ores, water…). | "the way was blocked repeatedly (water, cliffs or walls)" |
| `craft(item, count)` | Make this many of an item | Works out the recipe and makes the in-between items (logs to planks to sticks). Asking for `oak_planks` while holding other wood makes that wood's planks instead, and says so. It finds, walks to, places or crafts a crafting table if one is needed, then checks that the item really arrived. | "need 3 more cobblestone to craft 1 stone_pickaxe" |
| `mine_stone(count)` | Gain this many cobblestone | Uses the best pickaxe it holds. It mines the nearest stone open to the air (never stone touching water or lava, and skipping stone more than 6 blocks below where the call started, down in caves), or digs straight down to the stone underground if none is exposed. It stops before water or lava. Stone beside another agent comes last, so two agents don't dig one pit. | "need a wooden_pickaxe — craft one first" |
| `build_shelter(storeys, size)` | Get into a shelter, building one if none is near | If a shelter the agent or a teammate built stands within 32 blocks, walks into it (digging in), fills the gaps it can and closes the doorway. Otherwise it clears a space and builds walls, a roof and a doorway from planks, stone or dirt, then closes the doorway behind it (walking out digs through). Small (default): a 3×3 interior, about 45 blocks one storey, 89 two. `size: "large"`: 5×5, room for four beds, about 85 blocks one storey, 170 two; with too few blocks it places what it has and says what is left, and the next `build_shelter` near it, by anyone, carries on. Turns held logs into planks, and won't clear a space with lava or water in or beside it. | "placed 64 blocks of the large shelter at 110,120,110; it still needs 103 building blocks" |
| `mine_ore(ore, count)` | Gain this many drops of an ore (coal, iron, diamond…) | Finds ore **a player could see**, on a cave wall or a tunnel side, within 48 blocks. It walks there, mines it with a good enough pickaxe and picks up the drop (`raw_iron`, `diamond`…). It skips ore touching lava or water. | "no iron ore in sight within 48 blocks — explore, descend or dig a tunnel" |
| `smelt(item, count)` | Make ingots, stone, glass or cooked food | Takes the product (`iron_ingot`) or the raw item (`raw_iron`). Uses a furnace within 32 blocks, or places one it holds, or crafts one from 8 cobblestone. Burns the best fuel it carries (coal, then planks, logs, sticks) and waits about 10 seconds per item. | "not enough fuel to smelt 3 raw_iron" |
| `descend(y)` | Dig down to height `y` | Digs a staircase, which can be walked back up. It checks every block before breaking it and turns away from lava, water and drops into caves. It stops if every way down is unsafe, and reports the ore now in sight. | "stopped at y=12: every way down is unsafe (north: lava behind the stone; …)" |
| `tunnel(length, direction)` | Dig a 2-high tunnel up to 32 long | Strip-mining: the walls uncover ore hidden in rock, which `mine_ore` can then see. It keeps the same heading between calls and stops before lava, water or a drop. | "cannot tunnel north: water — try another direction" |
| `climb_out()` | Get back up to open sky | Digs a staircase up, with the same checks as `descend`. Where there is no rock to cut steps into, as in an open cave, it builds up instead, standing on blocks it carries (dirt or cobblestone first, logs last). If the agent is in water it first moves to dry ground nearby. When the agent is under the ground, its observation says how deep as `underground` (blocks of solid ground overhead, shown from 3, so a shelter roof doesn't count). | "stopped at y=49, under 13 blocks of ground: every way up is unsafe (…; straight up: nothing to stand on …)" |
| `hunt(target, count)` | Kill a creature or a player | `target` is a kind of animal or mob (cow, sheep, zombie…) or another agent's name; `count` up to 5. Chases the nearest within 32 blocks with the best sword or axe held (bare hands otherwise), hitting as fast as the weapon recovers, then picks up the drops (meat, wool, string). It isn't stopped by being hit or by mobs close by, unlike other skills, but it stops at health 6 or when the target gets away for 30 seconds. | "no cow within 32 blocks — explore to find one" |
| `shear(count)` | Wool from sheep, without hurting them | Needs shears (2 iron ingots). Walks to the nearest unsheared adult sheep, shears it (1–3 wool each) and picks the wool up. Observations list animals nearby as `animals`. | "every sheep within 32 blocks is already sheared or a lamb — wool grows back after a sheep eats grass" |
| `eat()` | Eat | Eats the best safe food it holds. | "no food in inventory" |
| `flee(distance)` | Get away from mobs | Runs directly away from the hostile mobs nearby. With no way out (a pit, a cave), it walls the agent in with dirt, cobblestone or planks it carries; any later move digs back out. | "could not find a path away … and could not wall yourself in (no dirt, cobblestone or planks to place)" |
| `sleep()` | Sleep through the night | Finds a bed within 32 blocks, or places one it holds, then walks to it and sleeps. Beds work only from about tick 12,541 to 23,459, as in the game. A bed takes 3 wool (from `shear` or `hunt`) and 3 planks. If another agent is in the nearest bed it uses a free one, or puts down its own. Inside a shelter it puts its bed down inside; outside, with a shelter near, it goes into the shelter (closing it) and puts it down there, so a team's beds end up together. If the night does not pass, it says how many the game counted asleep and who it can see awake. | "too early to sleep: beds can be used from about 12541 (18 seconds from now) until 23459" |
| `place_bed()` | Put a bed down without sleeping | Puts one bed it carries down inside the shelter it is in, or, outside with a shelter within 32 blocks, goes into the largest such one and puts it there; otherwise next to itself. Says how many beds are then down nearby. Added after tbase3, where an agent meant to "place beds" for the team and could only do it by sleeping. | "you carry no bed — a bed is crafted from 3 wool and 3 planks…" |
| `wait(seconds)` | Do nothing for 1–60 s | Stands still, but stops early if interrupted. Three waits in a row in daylight with no mob in sight are reported as a loop. | (none) |
| `give(to, item, count)` | Hand items to another agent | Says in chat that it is coming (which pauses them), walks up beside them, drops the items at its feet and steps back. Succeeds when they pick the items up; otherwise tells them the items are on the ground. | "qwen is not in sight; ask where they are, or go to them first" |
| `pick_up(item)` | Collect dropped items within 8 blocks | Walks over each one (all, or only `item`). Dropped items near an agent are listed in its observation as `itemsOnGround`. | "there is no dropped stone_sword within 8 blocks" |
| `store(item, count)` | Put items in a chest | Uses the nearest chest within 32 blocks, or puts one down (crafting it from 8 planks). Without `item`, stores everything but tools, weapons and food. Moves whole stacks, one shift-click per server reply, and reports what the chest now holds. | "the chest at 20,70,39 is full (…)" |
| `take(item, count)` | Take items from a chest | Looks in the nearest chests within 32 blocks for `item`, takes as many as `count` asks for (whole stacks by shift-click, the rest of a stack one click at a time), and reports what each chest it opened holds. | "no diamond in the chest nearby: the chest at 20,70,39 holds 40 cobblestone, …" |
| `look_in_chest()` | See inside the chests nearby | Opens up to 4 chests within 32 blocks, nearest first, and reports what each holds, moving nothing. Added after tbase2, where an agent took meat out of the team's store to find out what was in it. | "no chest within 32 blocks" |
| `go_to(to)` or `go_to(x, z)`, optionally with `y` | Walk to an agent in sight, or to coordinates | Walks in legs of 32 blocks, up to 512, following an agent that moves. With `y` it also climbs or descends to that height (up a hill, say); without it, height doesn't count. It only walks: from under the ground, `climb_out` is the way up. | "qwen is not in sight; ask them where they are, then go_to with x and z" |
| `tell_agent(to, skill, args)` | Ask another agent to run one of its skills | Checks the agent exists, the skill exists and every arg it needs is given, then sends the request in chat. Doesn't wait: whether they do it is up to them, and the log records whether they did. Not offered with comms off. | "give needs item, count in args (it takes {…})" |
| `ask_agent(to, question)` | Ask another agent a question | Sends it by name and waits up to 30 seconds for their answer addressed to it, which it returns. Not offered with comms off. | "qwen did not answer within 30 s; an answer may still come later in messages" |

**Talking isn't a skill.** Any decision can include a chat message to another agent or to everyone,
and it's sent alongside the skill at no extra cost. Comms can be switched off per run (`--comms off`).
See [communication.md](communication.md).

## Design rules

- **Ask for outcomes, not movements.** `gather_wood(10)`, not "walk north 5 blocks".
- **Failures must say what to do next.** A model can recover from "need 2 more planks — gather
  wood first", but not from "error". Wording that sends the model the wrong way is a bug in the
  skill.
- **Counts are totals where that prevents loops.** For example, `gather_wood(5)` while holding 5
  logs does nothing and says so.
- **Fix it in a skill before fixing it in the prompt.** If a model keeps tripping over something
  the game requires, the skill should handle it. One example: `build_shelter` turns logs into
  planks itself because models kept getting wood types wrong.

## Known gaps

- There's no fighting, farming or chest storage yet.

To add a skill, write it in `src/skills/` and add it to the list in `src/skills/index.ts`. Its
`description` text is exactly what the model reads, so write it for the model.
