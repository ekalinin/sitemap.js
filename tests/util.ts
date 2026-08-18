import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';

export const CACHE_FILE = path.join(import.meta.dirname, `~tempFile.tmp`);

/**
 * Whether the `xmllint` binary is available here. Tests that shell out to it
 * skip when it is missing.
 *
 * Probes by running the binary rather than via `which`, which is not a command
 * on Windows and so reported xmllint as missing on every Windows run.
 */
export const hasXMLLint = ((): boolean => {
  try {
    execFileSync('xmllint', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

export function truncateSync(file: string): fs.Stats {
  const tempFile = fs.openSync(file, 'w');
  fs.closeSync(tempFile);
  const stat = fs.statSync(file);
  return stat;
}

export function createCache(): { cacheFile: string; stat: fs.Stats } {
  const stat = truncateSync(CACHE_FILE);
  return {
    cacheFile: CACHE_FILE,
    stat,
  };
}

export function unlinkCache(): void {
  fs.unlinkSync(CACHE_FILE);
}
