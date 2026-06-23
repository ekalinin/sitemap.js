import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { xmlLint } from '../dist/lib/xmllint.js';
import { execFileSync } from 'node:child_process';
import { readFileSync, createReadStream } from 'node:fs';

let hasXMLLint = true;
try {
  execFileSync('which', ['xmllint']);
} catch {
  hasXMLLint = false;
}

describe('xmllint', () => {
  it('returns a promise', { timeout: 10000 }, async () => {
    if (hasXMLLint) {
      const xmlContent = readFileSync(
        './tests/mocks/cli-urls.json.xml',
        'utf8'
      );
      const p = xmlLint(xmlContent);
      assert.ok(p instanceof Promise);
      await p.catch(() => {});
    } else {
      // skip
    }
  });

  it(
    'resolves when complete with string content',
    { timeout: 60000 },
    async () => {
      if (hasXMLLint) {
        const xmlContent = readFileSync(
          './tests/mocks/cli-urls.json.xml',
          'utf8'
        );
        const result = await xmlLint(xmlContent);
        assert.ok(typeof result === 'undefined');
      } else {
        // skip
      }
    }
  );

  it(
    'resolves when complete with stream content',
    { timeout: 60000 },
    async () => {
      if (hasXMLLint) {
        const xmlStream = createReadStream('./tests/mocks/cli-urls.json.xml');
        const result = await xmlLint(xmlStream);
        assert.ok(typeof result === 'undefined');
      } else {
        // skip
      }
    }
  );

  it('rejects when invalid', { timeout: 60000 }, async () => {
    if (hasXMLLint) {
      const xmlContent = readFileSync(
        './tests/mocks/cli-urls.json.bad.xml',
        'utf8'
      );
      await assert.rejects(() => xmlLint(xmlContent));
    } else {
      // skip
    }
  });
});
