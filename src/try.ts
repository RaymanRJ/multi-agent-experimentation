/**
 * Run one skill once, with no policy and no scenario change. For developing and
 * testing skills against the live server:
 *
 *   npm run try -- --name dev_bot --skill gather_wood --args '{"count":3}'
 *
 * Does not apply a scenario — the server is shared, so leave world settings alone.
 */
import minimist from "minimist";
import mineflayer from "mineflayer";
import pathfinderPkg from "mineflayer-pathfinder";

import { env, loadEnv } from "./env.js";
import { observe } from "./observe.js";
import { findSkill, SKILLS } from "./skills/index.js";
import type { SkillContext } from "./types.js";

const { pathfinder, Movements } = pathfinderPkg;

loadEnv();

const argv = minimist(process.argv.slice(2), {
  string: ["name", "skill", "args"],
  default: { name: "try_bot", args: "{}" },
});

const skill = findSkill(String(argv["skill"]));
if (!skill) {
  console.error(`unknown skill "${argv["skill"]}" — known: ${SKILLS.map((s) => s.name).join(", ")}`);
  process.exit(1);
}

const bot = mineflayer.createBot({
  host: env("MC_HOST", "localhost"),
  port: Number(env("MC_PORT", "25565")),
  username: String(argv["name"]),
  auth: "offline",
});
bot.loadPlugin(pathfinder);
bot.on("kicked", (reason) => console.error(`kicked: ${reason}`));
bot.on("error", (error) => console.error(`error: ${error.message}`));

bot.once("spawn", async () => {
  bot.pathfinder.setMovements(new Movements(bot));
  await bot.waitForChunksToLoad();

  const events: string[] = [];
  const ctx: SkillContext = {
    bot,
    log: (message) => {
      events.push(message);
      console.log(`  ${message}`);
    },
    shouldStop: () => false,
  };
  const before = observe(bot, { step: 0, scenario: "sandbox", goal: "", recentEvents: [] });
  console.log(`before: pos=${JSON.stringify(before.position)} inventory=${JSON.stringify(before.inventory)}`);

  const result = await skill.run(ctx, JSON.parse(String(argv["args"])));
  const after = observe(bot, { step: 1, scenario: "sandbox", goal: "", recentEvents: events });
  console.log(`result: ${JSON.stringify(result)}`);
  console.log(`after:  pos=${JSON.stringify(after.position)} inventory=${JSON.stringify(after.inventory)}`);

  bot.quit();
  setTimeout(() => process.exit(result.status === "success" ? 0 : 2), 500);
});
