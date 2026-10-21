import { appendFileSync, mkdirSync } from "node:fs";
import type { LoggedStep } from "./types.js";

/**
 * Every (observation -> decision) pair is persisted. This gives episode replay
 * without re-burning API calls, and it is the source of the cost numbers — any
 * claim about cost or capability should trace back to one of these files.
 */
export class RunLog {
  private readonly path: string;

  constructor(runId: string, agentName: string) {
    mkdirSync("runs", { recursive: true });
    this.path = `runs/${runId}-${agentName}.jsonl`;
  }

  get file(): string {
    return this.path;
  }

  write(step: LoggedStep): void {
    appendFileSync(this.path, JSON.stringify(step) + "\n");
  }
}
