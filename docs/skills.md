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
   - which tools it could craft right now.
2. **The model chooses** one skill and its arguments, for example `craft(stone_pickaxe, 1)`.
   It also gives a short reason, a plan, and optionally a chat message.
3. **The skill runs** until it finishes, fails or is interrupted. A skill call can take many
   seconds of game time, while a model call takes a few seconds of real time, so the model
   decides only between skills, never during one.
4. **The skill reports back**: `success`, `failed` or `aborted`, plus a reason written for the
   model to act on, such as "need 2 more oak_planks… gather_wood first". That report goes into
   the next observation.

Every skill also stops when the run ends. Skills that move around also stop when a hostile mob
comes close.

## The skills

| Skill | What the model asks for | What the code does | Typical failure it reports |
|---|---|---|---|
| `gather_wood(count)` | Hold this many logs **in total** | Finds the nearest tree it can actually reach: on the ground, not buried, and not one it already failed on. It looks out to 32, then 64, then 128 blocks. It walks there, cuts the trunk from the bottom up, picks up the logs, and repeats. If it already holds enough logs, it says so and does nothing. | "no reachable trees within 128 blocks — explore to find some" |
| `explore(distance)` | Walk 16–96 blocks somewhere new | Remembers where this agent has been and picks the heading that leads farthest from all of it. On arrival it reports what's nearby (logs, ores, water…). | "the way was blocked repeatedly (water, cliffs or walls)" |
| `craft(item, count)` | Make this many of an item | Works out the recipe and makes the in-between items (logs to planks to sticks). Asking for `oak_planks` while holding other wood makes that wood's planks instead, and says so. It finds, walks to, places or crafts a crafting table if one is needed, then checks that the item really arrived. | "need 3 more cobblestone to craft 1 stone_pickaxe" |
| `mine_stone(count)` | Gain this many cobblestone | Uses the best pickaxe it holds. It mines the nearest exposed stone (skipping stone more than 6 blocks below, down in caves), or digs straight down to the stone underground if none is exposed. It stops before water or lava. | "need a wooden_pickaxe — craft one first" |
| `build_shelter()` | A hut where it stands | Clears a 3×3 space and builds walls 2 high, a roof and a doorway, from planks, stone or dirt (about 43 blocks). It turns held logs into planks automatically. | "need 12 more building blocks … gather about 3 more logs" |
| `eat()` | Eat | Eats the best safe food it holds. | "no food in inventory" |
| `flee(distance)` | Get away from mobs | Runs directly away from the hostile mobs nearby. | "could not find a path away — you may be cornered" |
| `sleep()` | Sleep through the night | Finds a bed within 32 blocks, or places one it holds, then walks to it and sleeps. | "it is daytime — can only sleep at night" |
| `wait(seconds)` | Do nothing for 1–60 s | Stands still, but stops early if interrupted. | (none) |

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

- There's no fighting, smelting, farming or chest storage yet.

To add a skill, write it in `src/skills/` and add it to the list in `src/skills/index.ts`. Its
`description` text is exactly what the model reads, so write it for the model.
