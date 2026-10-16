import { existsSync } from 'node:fs';
import { Readable } from 'node:stream';
import { dirname, resolve as resolvePath } from 'node:path';
import { execFile } from 'node:child_process';
import { XMLLintUnavailable } from './errors.js';

/**
 * Finds the `schema` directory that ships with this package.
 *
 * Walks up from this module's own directory rather than `process.cwd()`, so
 * the lookup works however the code is run: from source (`lib/xmllint.ts`),
 * from the build (`dist/lib/xmllint.js`), or installed as a dependency
 * (`node_modules/sitemap/dist/lib/xmllint.js`), whatever the caller's working
 * directory is. `cli.ts` finds `package.json` the same way.
 *
 * @throws {Error} if the schema directory is not found
 * @returns {string} the path to the schema directory
 */
function findSchemaDir(): string {
  const searched: string[] = [];
  let dir = import.meta.dirname;
  for (;;) {
    const candidate = resolvePath(dir, 'schema');
    searched.push(candidate);
    if (existsSync(resolvePath(candidate, 'all.xsd'))) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(
        `Schema directory not found. Searched paths: ${searched.join(', ')}`
      );
    }
    dir = parent;
  }
}

/**
 * Verify the passed in xml is valid. Requires xmllib be installed
 *
 * Security: This function always pipes XML content via stdin to prevent
 * command injection vulnerabilities. Never pass user-controlled strings
 * as file path arguments to xmllint.
 *
 * @param xml what you want validated (string or Readable stream)
 * @return {Promise<void>} resolves on valid rejects [error stderr]
 */
export function xmlLint(xml: string | Readable): Promise<void> {
  return new Promise((resolve, reject): void => {
    // Inside the executor so a missing schema rejects (matching the
    // [error] shape callers expect) instead of throwing synchronously
    let schema: string;
    try {
      schema = resolvePath(findSchemaDir(), 'all.xsd');
    } catch (err) {
      reject([err]);
      return;
    }
    const args = [
      '--schema',
      schema,
      '--noout',
      '-', // Always read from stdin for security
    ];

    // Spawn xmllint directly rather than probing with `which` first: `which`
    // is not a command on Windows, so probing there reported xmllint as
    // unavailable even when it was installed. A missing binary surfaces as
    // ENOENT from the spawn itself on every platform, and this saves a process.
    const xmllint = execFile('xmllint', args, (error, stdout, stderr): void => {
      // If xmllint exited (or never started) before reading all of a stream
      // input, stop the source so it doesn't sit paused holding a file
      // descriptor open after the promise settles.
      if (typeof xml !== 'string' && xml && !xml.readableEnded) {
        if (xmllint.stdin) {
          xml.unpipe(xmllint.stdin);
        }
        xml.destroy();
      }
      if (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          reject([new XMLLintUnavailable()]);
        } else {
          reject([error, stderr]);
        }
        return;
      }
      resolve();
    });

    // Always pipe XML content via stdin for security
    if (xmllint.stdin) {
      // When the binary is missing the stdin socket is torn down immediately,
      // so writing to it emits EPIPE. The execFile callback above reports the
      // real failure; don't let that stray error go unhandled and crash.
      xmllint.stdin.on('error', (): void => undefined);

      if (typeof xml === 'string') {
        // Convert string to stream and pipe to stdin
        xmllint.stdin.write(xml);
        xmllint.stdin.end();
      } else if (xml) {
        // Pipe readable stream to stdin
        xml.pipe(xmllint.stdin);
      }
    }

    if (xmllint.stdout) {
      xmllint.stdout.unpipe();
    }
  });
}
