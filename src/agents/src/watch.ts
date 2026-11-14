import { spawn } from "node:child_process";
import { mkdirSync, openSync } from "node:fs";
import net from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Watching runs, on by default: every agent serves its 3D view in a browser and makes sure the minds panel is up,
 * so no run goes unwatched for want of a flag. Both only observe; nothing joins the world.
 */

/** The minds panel's port. Viewers never take it. */
export const MINDS_PORT = 3010;
/** Viewers start here and take the next free port, so agents run side by side on one machine never collide. */
export const VIEW_FROM = 3007;

/** True if something on this machine already holds the port (on any interface, as a viewer or the panel would). */
export function inUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", () => resolve(true));
    probe.once("listening", () => probe.close(() => resolve(false)));
    probe.listen(port);
  });
}

/**
 * The first free port from `from`, never the minds panel's. The viewer library has no handler for a port already in
 * use and takes the agent down with it, so the port is checked before the viewer starts, not left to fail.
 */
export async function freePort(from: number, tries = 50): Promise<number> {
  for (let port = from; port < from + tries; port++) {
    if (port === MINDS_PORT) continue;
    if (!(await inUse(port))) return port;
  }
  throw new Error(`no free port from ${from} to ${from + tries - 1}`);
}

/**
 * Starts the minds panel if nothing holds its port: detached, so it outlives this run and serves the next ones, with
 * its output in runs/.minds.out. "running" if one was already up (another run's, or the panel `start.sh` runs).
 */
export async function ensureMindsPanel(runsDir = "runs"): Promise<"running" | "started"> {
  if (await inUse(MINDS_PORT)) return "running";
  mkdirSync(runsDir, { recursive: true });
  const out = openSync(join(runsDir, ".minds.out"), "a");
  // The same node and loader (tsx) this agent runs under, on the panel's own entry point.
  const entry = join(dirname(fileURLToPath(import.meta.url)), "minds.ts");
  const child = spawn(process.execPath, [...process.execArgv, entry, "--port", String(MINDS_PORT)], {
    detached: true,
    stdio: ["ignore", out, out],
  });
  child.unref();
  return "started";
}
