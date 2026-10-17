import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { xmlLint } from '../dist/lib/xmllint.js';
import {
  readFileSync,
  createReadStream,
  mkdtempSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { XMLLintUnavailable } from '../dist/lib/errors.js';
import { platform, tmpdir } from 'node:os';
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

  describe('when xmllint cannot run', { skip: platform() === 'win32' }, () => {
    // Runs xmlLint with PATH pointing at a temp dir that holds only `files`
    const withPath = async (
      files: Record<string, number>,
      check: (rejection: unknown[]) => void
    ): Promise<void> => {
      const dir = mkdtempSync(join(tmpdir(), 'sitemap-xmllint-'));
      const path = process.env.PATH;
      try {
        for (const [name, mode] of Object.entries(files)) {
          writeFileSync(join(dir, name), '#!/bin/sh\n', { mode });
        }
        process.env.PATH = dir;
        await assert.rejects(xmlLint('<urlset/>'), (rejection: unknown[]) => {
          check(rejection);
          return true;
        });
      } finally {
        process.env.PATH = path;
        rmSync(dir, { recursive: true, force: true });
      }
    };

    it('rejects with XMLLintUnavailable when xmllint is missing', async () => {
      await withPath({}, ([error]) => {
        assert.ok(error instanceof XMLLintUnavailable);
      });
    });

    it('rejects without stderr when xmllint is not executable', async () => {
      await withPath({ xmllint: 0o644 }, (rejection) => {
        // No stderr element: the xml was never validated, so callers must
        // not report it as invalid
        assert.strictEqual(rejection.length, 1);
        assert.match((rejection[0] as Error).message, /EACCES/);
      });
    });
  });
});
