import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { xmlLint } from '../dist/lib/xmllint.js';
import { readFileSync, createReadStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { hasXMLLint } from './util.ts';

const skip = hasXMLLint ? false : 'xmllint is not installed';

describe('xmllint', () => {
  it('returns a promise', { timeout: 10000, skip }, async () => {
    const xmlContent = readFileSync('./tests/mocks/cli-urls.json.xml', 'utf8');
    const p = xmlLint(xmlContent);
    assert.ok(p instanceof Promise);
    await p.catch(() => {});
  });

  it(
    'resolves when complete with string content',
    { timeout: 60000, skip },
    async () => {
      const xmlContent = readFileSync(
        './tests/mocks/cli-urls.json.xml',
        'utf8'
      );
      const result = await xmlLint(xmlContent);
      assert.ok(typeof result === 'undefined');
    }
  );

  it(
    'resolves when complete with stream content',
    { timeout: 60000, skip },
    async () => {
      const xmlStream = createReadStream('./tests/mocks/cli-urls.json.xml');
      const result = await xmlLint(xmlStream);
      assert.ok(typeof result === 'undefined');
    }
  );

  it(
    'finds the bundled schema whatever the working directory is',
    { timeout: 60000, skip },
    async () => {
      const xmlContent = readFileSync(
        './tests/mocks/cli-urls.json.xml',
        'utf8'
      );
      const cwd = process.cwd();
      process.chdir(tmpdir());
      try {
        // Previously the schema was searched for relative to process.cwd(),
        // so this threw "Schema directory not found" outside the repo
        await xmlLint(xmlContent);
      } finally {
        process.chdir(cwd);
      }
    }
  );

  it('rejects when invalid', { timeout: 60000, skip }, async () => {
    const xmlContent = readFileSync(
      './tests/mocks/cli-urls.json.bad.xml',
      'utf8'
    );
    await assert.rejects(() => xmlLint(xmlContent));
  });
});
