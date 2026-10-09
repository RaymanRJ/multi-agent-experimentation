import { readFileSync, existsSync } from "node:fs";

/** Minimal .env loader — avoids a dependency and keeps secrets out of code. */
export function loadEnv(path = ".env"): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

export function env(key: string, fallback: string): string {
  const value = process.env[key];
  return value === undefined || value === "" ? fallback : value;
}
