import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import type { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { watchAttacks } from "./attacks.js";

const at = (x: number) => new Vec3(x, 64, 0);
const self = { type: "player", username: "qa", position: at(0) };
const other = (name: string, x = 3) => ({ type: "player", username: name, position: at(x) });
const zombie = { type: "hostile", name: "zombie", position: at(2) };
const cow = { type: "animal", name: "cow", position: at(2) };

function setup() {
  const bot = Object.assign(new EventEmitter(), { entity: self }) as unknown as Bot & EventEmitter;
  const lines: string[] = [];
  let clock = 0;
  watchAttacks(bot, (line, replaceLast) => (replaceLast ? (lines[lines.length - 1] = line) : lines.push(line)), () => clock);
  return { bot, lines, tick: (ms: number) => (clock += ms) };
}

test("watchAttacks - the victim learns who hit it, the attacker who it hit, and an onlooker sees it", () => {
  const { bot, lines } = setup();
  bot.emit("entityHurt", self, other("qb"));
  bot.emit("entityHurt", self, zombie);
  bot.emit("entityHurt", other("qb"), self);
  bot.emit("entityHurt", other("qb"), other("qc"));
  assert.deepEqual(lines, ["you were hit by qb (another agent)", "you were hit by a zombie", "you hit qb", "qc hit qb"]);
});

test("watchAttacks - repeats fold into one line; hunting an animal, harm with no source and fights out of sight say nothing", () => {
  const { bot, lines, tick } = setup();
  bot.emit("entityHurt", self, zombie);
  tick(600);
  bot.emit("entityHurt", self, zombie);
  tick(600);
  bot.emit("entityHurt", self, zombie);
  assert.deepEqual(lines, ["you were hit by a zombie (x3)"]);
  bot.emit("entityHurt", cow, self);
  bot.emit("entityHurt", self, undefined);
  bot.emit("entityHurt", other("qb", 100), other("qc", 100));
  assert.equal(lines.length, 1);
  tick(20_000);
  bot.emit("entityHurt", self, zombie);
  assert.deepEqual(lines, ["you were hit by a zombie (x3)", "you were hit by a zombie"], "a later fight starts a new line");
});
