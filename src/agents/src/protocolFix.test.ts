import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fixDeclareRecipesProtocol } from "./protocolFix.js";

const require = createRequire(import.meta.url);

test("declare_recipes type ids no longer include the removed banner recipe", () => {
  const data = require("minecraft-data")("1.21.1");
  const mappings = data.protocol.play.toClient.types.packet_declare_recipes[1][0].type[1].type[1].find(
    (member: { name: string }) => member.name === "type",
  ).type[1].mappings as Record<string, string>;
  const names = Object.values(mappings);
  assert.ok(!names.includes("minecraft:crafting_special_banneraddpattern"));
  // Verified against a real Paper 1.21.1 packet: suspicious stew is 13, smelting 15, stonecutting 19.
  assert.equal(mappings["13"], "minecraft:crafting_special_suspiciousstew");
  assert.equal(mappings["15"], "minecraft:smelting");
  assert.equal(mappings["19"], "minecraft:stonecutting");
});

test("applying the fix twice changes nothing the second time", () => {
  assert.equal(fixDeclareRecipesProtocol(), false);
});
