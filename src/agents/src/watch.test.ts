import { test } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { freePort, inUse, MINDS_PORT } from "./watch.js";

const hold = (port: number) =>
  new Promise<net.Server>((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(port, () => resolve(server));
  });

test("freePort - a port in use is passed over for the next free one, as two runs side by side would need", async () => {
  const first = await freePort(39_007);
  const held = await hold(first);
  try {
    assert.equal(await inUse(first), true);
    const next = await freePort(first);
    assert.ok(next > first, "moved past the held port");
    assert.equal(await inUse(next), false);
  } finally {
    held.close();
  }
});

test("freePort - never hands out the minds panel's port", async () => {
  assert.notEqual(await freePort(MINDS_PORT), MINDS_PORT);
});
