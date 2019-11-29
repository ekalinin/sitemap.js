import { Readable } from 'stream';
import { resolve } from 'path';
import { execFile } from 'child_process';
import { XMLLintUnavailable } from './errors';
/**
 * Verify the passed in xml is valid. Requires xmllib be installed
 * @param xml what you want validated
 * @return {Promise<null>} resolves on valid rejects [error stderr]
 */
export function xmlLint(xml: string | Readable): Promise<null> {
  const args = [
    '--schema',
    resolve(__dirname, '..', '..', 'schema', 'all.xsd'),
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
