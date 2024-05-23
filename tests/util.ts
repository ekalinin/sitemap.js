import * as fs from 'fs';
import * as path from 'path';

export const CACHE_FILE = path.join(__dirname, `~tempFile.tmp`);

export function truncateSync(file: string): fs.Stats {
  const tempFile = fs.openSync(file, 'w');
  fs.closeSync(tempFile);
  const stat = fs.statSync(file);
  return stat;
}

export function createCache(): { cacheFile: string, stat: fs.Stats } {
  const stat = truncateSync(CACHE_FILE);
  return {
    cacheFile: CACHE_FILE,
    stat,
  };
}

export function unlinkCache(): void {
  fs.unlinkSync(CACHE_FILE);
}