import { Readable } from 'node:stream';
import { execFile } from 'node:child_process';
import { XMLLintUnavailable } from './errors.js';
import { findUp } from './utils.js';

/**
 * Finds `schema/all.xsd`, which ships with this package.
 *
 * Walks up from this module's own directory rather than `process.cwd()`, so
 * the lookup works however the code is run: from source (`lib/xmllint.ts`),
 * from the build (`dist/lib/xmllint.js`), or installed as a dependency
 * (`node_modules/sitemap/dist/lib/xmllint.js`), whatever the caller's working
 * directory is. `cli.ts` finds `package.json` the same way.
 *
 * @throws {Error} if the schema is not found
 * @returns {string} the path to `all.xsd`
 */
function findSchema(): string {
  const schema = findUp('schema/all.xsd', import.meta.dirname);
  if (!schema) {
    throw new Error(
      `Schema not found: no schema/all.xsd in ${import.meta.dirname} or any parent directory`
    );
  }
  return schema;
}

/**
 * Verify the passed in xml is valid. Requires xmllib be installed
 *
 * Security: This function always pipes XML content via stdin to prevent
 * command injection vulnerabilities. Never pass user-controlled strings
 * as file path arguments to xmllint.
 *
 * @param xml what you want validated (string or Readable stream)
 * @return {Promise<void>} resolves on valid. Rejects with [error, stderr] when
 * the xml is invalid, or with [error] alone when validation could not run
 * (xmllint missing or not executable, or the schema not found).
 */
export function xmlLint(xml: string | Readable): Promise<void> {
  return new Promise((resolve, reject): void => {
    // Inside the executor so a missing schema rejects (matching the
    // [error] shape callers expect) instead of throwing synchronously
    let schema: string;
    try {
      schema = findSchema();
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
        const { code, syscall } = error as NodeJS.ErrnoException;
        if (code === 'ENOENT') {
          reject([new XMLLintUnavailable()]);
        } else if (syscall?.startsWith('spawn')) {
          // xmllint could not be started at all (such as EACCES), so there
          // is no validation output: reject without stderr, like a missing
          // schema, so callers don't report the file as invalid
          reject([error]);
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
