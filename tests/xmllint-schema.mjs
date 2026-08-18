// Validates generated sitemap XML against the bundled XSD schema.
//
// This runs as a Node script rather than a shell one-liner so it works on
// Windows as well as POSIX: the previous `if which xmllint; then ...; fi` form
// is bash syntax and `which` is not a command on Windows, so it failed outright
// on the Windows CI runners.
//
// Pass --skip-if-missing to exit 0 when xmllint is not installed.
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const skipIfMissing = process.argv.includes('--skip-if-missing');
const testsDir = import.meta.dirname;
const schema = resolve(testsDir, '..', 'schema', 'all.xsd');

const generated = spawnSync(
  process.execPath,
  [resolve(testsDir, 'alltags.mjs')],
  {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 64,
  }
);

if (generated.status !== 0) {
  process.stderr.write(generated.stderr ?? '');
  process.exit(generated.status ?? 1);
}

const lint = spawnSync('xmllint', ['--schema', schema, '--noout', '-'], {
  input: generated.stdout,
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 64,
});

if (lint.error?.code === 'ENOENT') {
  const message = 'xmllint is not installed';
  if (skipIfMissing) {
    process.stdout.write(`skipping xml schema validation: ${message}\n`);
    process.exit(0);
  }
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

process.stderr.write(lint.stderr ?? '');
process.exit(lint.status ?? 1);
