---
name: live-check
description: Check a skill, observation or scenario change in the real game on a throwaway Minecraft server, with a scratch script, then clean up. Use whenever in-game behaviour changes, before saying a fix works, or to reproduce a failure seen in a log.
---

# Check it in the real game

The fake bot in the unit tests has no physics, no server and no timing. A `give` that passed every
test overshot in four of five live tries; a craft fix only showed its worth against a real
crafting table. **A change to how an agent acts is not done until it has run in the game.**

## 1. A throwaway server

```bash
scripts/test-server.sh up <name> 25620       # same image, version and seed as the main world; RCON on 25630
```

- Not 25590/25600 (a running batch's server) or 25565/25575 (`mae-mc`). If the port is taken,
  `docker rm` the half-made container and pick another.
- It starts peaceful in daylight. Set what the test needs over RCON:
  `docker exec mae-test-<name> rcon-cli "difficulty normal"`, `"time set 14000"`,
  `"gamerule doMobSpawning false"` (then summon exactly what you want), `"give <bot> stone_pickaxe[damage=127] 1"`
  (a nearly worn tool), `"tp <bot> x y z"`, `"setblock …"`, `"fill …"`.
- Same seed means the same terrain: a spot from a run's log can be visited (`tp`) and the
  failure tried where it happened.

## 2. A scratch script

Scripts that import project code go in `runs/.scratch/` (gitignored), not the repo:

```ts
// runs/.scratch/check.ts — run with: MC_PORT=25620 npx tsx runs/.scratch/check.ts
import mineflayer from "mineflayer";
import "../../src/protocolFix.js";            // before any bot is created
import pathfinderPkg from "mineflayer-pathfinder";
import { execSync } from "node:child_process";
import { movementsFor } from "../../src/skills/util.js";
import { buildShelter } from "../../src/skills/buildShelter.js";   // the skill under test
const rcon = (c: string) => execSync(`docker exec mae-test-<name> rcon-cli ${JSON.stringify(c)}`).toString().trim();
const bot = mineflayer.createBot({ host: "localhost", port: 25620, username: "checker", auth: "offline" });
bot.loadPlugin(pathfinderPkg.pathfinder);
bot.once("spawn", async () => {
  bot.pathfinder.setMovements(movementsFor(bot));
  await bot.waitForChunksToLoad();
  rcon("clear checker"); rcon("give checker dark_oak_log 12"); await bot.waitForTicks(20);
  const ctx = { bot, log: (m: string) => console.log("  log:", m), shouldStop: () => false } as any;
  console.log(JSON.stringify(await buildShelter.run(ctx, {})));
  bot.quit(); setTimeout(() => process.exit(0), 500);
});
```

- **Code in a worktree:** import it by absolute path (`/…/.claude/worktrees/<wt>/src/…`), since
  `runs` there is a symlink and `../../src` would resolve to `main`'s code.
- **Make it fail on purpose too**: drop a click, take the blocks away, put a mob in the doorway.
  The failure path is usually where the bug is.
- Print what the server did (packets, block names, entity counts), not just the skill's result.
- `src/try.ts` runs one skill with no setup: `MC_PORT=25620 npm run try -- --skill <name> --args '{}'`.
- **Changes to `src/agent.ts`, observations or scenario setup also need the real agent**, which a
  scratch script does not load: `MC_PORT=25620 RCON_PORT=25630 npm run agent -- --brain scripted …`.

## 3. Clean up, every time

```bash
rm -f runs/.scratch/<script>.ts
rm -f runs/*-<test agent name>.*      # an agent run against a test server still writes to runs/
scripts/test-server.sh down <name>
```

Then say what was checked and what was seen, with numbers ("4 zombies 3 blocks away for 30 s on
hard, health stayed 20"), including what was not checked.
