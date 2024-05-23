import { existsSync } from 'fs';
import { Readable } from 'stream';
import { resolve } from 'path';
import { execFile } from 'child_process';
import { XMLLintUnavailable } from './errors';

/**
 * Finds the `schema` directory since we may be located in
 * `lib` or `dist/lib` when this is called.
 *
 * @throws {Error} if the schema directory is not found
 * @returns {string} the path to the schema directory
 */
function findSchemaDir(): string {
  const paths = ['.', '..', '../..'];
  for (const p of paths) {
    const schemaPath = resolve(p, 'schema');
    if (existsSync(schemaPath)) {
      return schemaPath;
    }
  }
  throw new Error('Schema directory not found');
}

/**
 * Verify the passed in xml is valid. Requires xmllib be installed
 * @param xml what you want validated
 * @return {Promise<void>} resolves on valid rejects [error stderr]
 */
export function xmlLint(xml: string | Readable): Promise<void> {
  const args = [
    '--schema',
    resolve(findSchemaDir(), 'all.xsd'),
    '--noout',
    '-',
  ];
  if (typeof xml === 'string') {
    args[args.length - 1] = xml;
  }
  return new Promise((resolve, reject): void => {
    execFile('which', ['xmllint'], (error, stdout, stderr): void => {
      if (error) {
        reject([new XMLLintUnavailable()]);
        return;
      }
      const xmllint = execFile(
        'xmllint',
        args,
        (error, stdout, stderr): void => {
          if (error) {
            reject([error, stderr]);
          }
          resolve();
        }
      );
      if (xmllint.stdout) {
        xmllint.stdout.unpipe();
        if (typeof xml !== 'string' && xml && xmllint.stdin) {
          xml.pipe(xmllint.stdin);
        }
      }
    });
  });
}
