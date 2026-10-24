// The timeline: every change (a commit) and every test (a batch or team run) in the order they
// happened. Commits are read from `git log` when the site is built (vite.config.ts); this file has
// no Vite or Node imports, so the build and the page share it.

/** What a commit changed, judged by the files it touched. */
export type ChangeKind = 'agents' | 'docs' | 'site';

export interface Change {
  sha: string;
  /** In UTC, ISO 8601. */
  at: string;
  subject: string;
  kind: ChangeKind;
  /** Batches or team runs the message names, e.g. "tlunap1" in "as tlunap1's flee reported…". */
  runs: string[];
}

/**
 * Agent code beats docs beats the site: a commit that fixes a skill and writes it up is a change to
 * the agents. Before 21 October the agents lived at the repository's root, so anything that isn't
 * docs or the site's own code counts as theirs.
 */
export function changeKind(files: string[]): ChangeKind {
  const isDocs = (f: string) => f.startsWith('docs/') || /^[^/]+\.md$/.test(f) || f.startsWith('.claude/');
  const isSite = (f: string) => f.startsWith('src/site/') || f.startsWith('src/terraform/') || f.startsWith('.github/') || f === '.gitignore';
  if (files.some((f) => !isDocs(f) && !isSite(f))) return 'agents';
  if (files.some(isDocs)) return 'docs';
  return 'site';
}

/** The batch names a message mentions, as whole words: "b1" in "batch b1," but not in "b12". */
export function runsNamed(subject: string, names: string[]): string[] {
  return names.filter((name) => new RegExp(`(^|[^\\w-])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`).test(subject));
}

/** Record and field separators, as `git log --format` is asked to write them. */
export const GIT_LOG_FORMAT = '%x1e%H%x1f%aI%x1f%s';

/** `git log --no-merges --name-only --format=GIT_LOG_FORMAT` -> changes, newest first. */
export function parseGitLog(out: string, batchNames: string[]): Change[] {
  return out
    .split('\x1e')
    .filter((record) => record.trim())
    .map((record) => {
      const [head = '', ...rest] = record.split('\n');
      const [sha = '', date = '', subject = ''] = head.split('\x1f');
      const files = rest.map((f) => f.trim()).filter(Boolean);
      return {
        sha,
        at: new Date(date).toISOString(),
        subject,
        kind: changeKind(files),
        runs: runsNamed(subject, batchNames),
      };
    });
}
