import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import util from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { exec as execCb } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import pkg from '../package.json' with { type: 'json' };
import normalizedSample from './mocks/sampleconfig.normalized.json' with { type: 'json' };
import { hasXMLLint } from './util.ts';

const exec = util.promisify(execCb);

const isWindows = os.platform() === 'win32';

const skipWithoutXMLLint = hasXMLLint ? false : 'xmllint is not installed';

const txtxml =
  '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"><url><loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-burnout-paradise-millionaires-club</loc></url><url><loc>https://roosterteeth.com/episode/achievement-hunter-achievement-hunter-endangered-species-walkthrough-</loc></url></urlset>';

const jsonxml = fs.readFileSync(
  path.resolve(import.meta.dirname!, './mocks/cli-urls.json.xml'),
  { encoding: 'utf8' }
);

describe('cli', () => {
  it('prints its version when asked', async () => {
    const { stdout } = await exec('node ./dist/cli.js --version', {
      encoding: 'utf8',
    });
    assert.strictEqual(stdout, pkg.version + '\n');
  });

  it('prints a help doc when asked', async () => {
    const { stdout } = await exec('node ./dist/cli.js --help', {
      encoding: 'utf8',
    });
    assert.ok(stdout.length > 1);
  });

  it('accepts -h as an alias for --help', async () => {
    const { stdout } = await exec('node ./dist/cli.js -h', {
      encoding: 'utf8',
    });
    assert.ok(stdout.includes('--index-base-url'));
  });

  it('exits with code 2 on an unknown option', async () => {
    await assert.rejects(
      exec('node ./dist/cli.js --no-such-flag', { encoding: 'utf8' }),
      (err: { code: number; stderr: string }) => {
        assert.strictEqual(err.code, 2);
        assert.ok(err.stderr.includes('--no-such-flag'));
        return true;
      }
    );
  });

  it('exits with code 2 on a non-integer --limit', async () => {
    await assert.rejects(
      exec(
        'node ./dist/cli.js --index --limit=abc --index-base-url https://example.com/',
        { encoding: 'utf8' }
      ),
      (err: { code: number; stderr: string }) => {
        assert.strictEqual(err.code, 2);
        assert.ok(err.stderr.includes('--limit: Invalid limit "abc"'));
        return true;
      }
    );
  });

  for (const limit of ['0', '50001', '1e3', '0x10', '1.5']) {
    it(`exits with code 2 on an out-of-range --limit of ${limit}`, async () => {
      await assert.rejects(
        exec(
          `node ./dist/cli.js --index --limit=${limit} --index-base-url https://example.com/`,
          { encoding: 'utf8' }
        ),
        (err: { code: number; stderr: string }) => {
          assert.strictEqual(err.code, 2);
          assert.ok(err.stderr.includes('between 1 and 50000'));
          return true;
        }
      );
    });
  }

  it(
    'exits with code 1 without creating a sitemap file when --index-base-url is not http(s)',
    { skip: isWindows },
    async () => {
      const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-cli-'));
      const cli = path.resolve('./dist/cli.js');
      try {
        await assert.rejects(
          exec(
            `echo "https://example.com/a" | node ${cli} --index --index-base-url ftp://example.com/`,
            { encoding: 'utf8', cwd }
          ),
          (err: { code: number; stderr: string }) => {
            assert.strictEqual(err.code, 1);
            assert.ok(err.stderr.includes('--index-base-url'));
            assert.ok(!err.stderr.includes('Unhandled'));
            return true;
          }
        );

        assert.strictEqual(
          fs.existsSync(path.join(cwd, 'sitemap-0.xml')),
          false
        );
      } finally {
        fs.rmSync(cwd, { recursive: true, force: true });
      }
    }
  );

  it('accepts line separated urls', async () => {
    const { stdout } = await exec(
      'node ./dist/cli.js < ./tests/mocks/cli-urls.txt',
      { encoding: 'utf8' }
    );
    assert.strictEqual(stdout, txtxml);
  });

  it('prepends to existing xml', { skip: isWindows }, async () => {
    let threw = false;
    try {
      await exec(
        'echo "https://example.com/asdr32/" | node ./dist/cli.js --prepend ./tests/mocks/cli-urls.json.xml|grep \'https://example.com/asdr32/\''
      );
    } catch {
      threw = true;
    }
    assert.strictEqual(threw, false);
  });

  it(
    'writes every prepended entry before the new urls',
    { timeout: 30000, skip: isWindows },
    async () => {
      // perf-data.xml takes longer to parse than stdin takes to end, which
      // used to end the sitemap after the first url
      const { stdout } = await exec(
        'echo "https://example.com/new/" | node ./dist/cli.js --prepend ./tests/mocks/perf-data.xml',
        { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
      );
      const prepended = fs
        .readFileSync('./tests/mocks/perf-data.xml', 'utf8')
        .split('<url>').length;
      assert.strictEqual(stdout.split('<url>').length, prepended + 1);
      assert.ok(
        stdout.endsWith(
          '<url><loc>https://example.com/new/</loc></url></urlset>'
        )
      );
    }
  );

  it(
    'exits with code 1 when the --prepend file is missing',
    { skip: isWindows },
    async () => {
      await assert.rejects(
        exec(
          'echo "https://example.com/a" | node ./dist/cli.js --prepend ./tests/mocks/no-such-file.xml',
          { encoding: 'utf8' }
        ),
        (err: { code: number; stderr: string }) => {
          assert.strictEqual(err.code, 1);
          assert.ok(err.stderr.includes('ENOENT'));
          assert.ok(!err.stderr.includes('Unhandled'));
          return true;
        }
      );
    }
  );

  it(
    'exits with code 1 when the --prepend file has more than 50,000 urls',
    { timeout: 30000, skip: isWindows },
    async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-cli-'));
      const big = path.join(dir, 'big.xml');
      fs.writeFileSync(
        big,
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
          '<url><loc>https://example.com/</loc></url>'.repeat(50001) +
          '</urlset>'
      );
      try {
        await assert.rejects(
          exec(
            `echo "https://example.com/new/" | node ./dist/cli.js --prepend ${big}`,
            { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
          ),
          (err: { code: number; stderr: string }) => {
            assert.strictEqual(err.code, 1);
            assert.ok(err.stderr.includes('more than 50000 URLs'));
            assert.ok(!err.stderr.includes('Unhandled'));
            return true;
          }
        );
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  );

  it('accepts line separated urls as file', async () => {
    const { stdout } = await exec(
      'node ./dist/cli.js ./tests/mocks/cli-urls.txt',
      { encoding: 'utf8' }
    );
    assert.strictEqual(stdout, txtxml);
  });

  it(
    'streams a index file and writes sitemaps',
    { timeout: 30000, skip: isWindows },
    async () => {
      const { stdout } = await exec(
        'cat ./tests/mocks/short-list.txt | node ./dist/cli.js --index --limit 250 --index-base-url https://example.com/path/',
        { encoding: 'utf8' }
      );
      assert.ok(stdout.includes('https://example.com/path/sitemap-0.xml'));
      assert.ok(stdout.includes('https://example.com/path/sitemap-1.xml'));
      assert.ok(stdout.includes('https://example.com/path/sitemap-2.xml'));
      assert.ok(stdout.includes('https://example.com/path/sitemap-3.xml'));
      assert.ok(!stdout.includes('https://example.com/path/sitemap-4.xml'));
      assert.strictEqual(
        fs.existsSync(path.resolve('./sitemap-0.xml')),
        true,
        'expected sitemap-0.xml to exist'
      );

      assert.strictEqual(
        fs.existsSync(path.resolve('./sitemap-3.xml')),
        true,
        'expected sitemap-3.xml to exist'
      );

      assert.strictEqual(
        fs.existsSync(path.resolve('./sitemap-4.xml')),
        false,
        'expected sitemap-4.xml to not exist'
      );
      fs.unlinkSync(path.resolve('./sitemap-0.xml'));
      fs.unlinkSync(path.resolve('./sitemap-1.xml'));
      fs.unlinkSync(path.resolve('./sitemap-2.xml'));
      fs.unlinkSync(path.resolve('./sitemap-3.xml'));
    }
  );

  it(
    'names gzipped sitemaps .xml.gz in the files and the index',
    { timeout: 30000, skip: isWindows },
    async () => {
      const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-cli-'));
      const cli = path.resolve('./dist/cli.js');
      try {
        const { stdout } = await exec(
          `echo "https://example.com/a" | node ${cli} --index --gzip --index-base-url https://example.com/path/`,
          { encoding: 'buffer', cwd }
        );
        const index = gunzipSync(stdout).toString();
        assert.ok(index.includes('https://example.com/path/sitemap-0.xml.gz'));
        assert.deepStrictEqual(fs.readdirSync(cwd), ['sitemap-0.xml.gz']);
        const sitemap = gunzipSync(
          fs.readFileSync(path.join(cwd, 'sitemap-0.xml.gz'))
        ).toString();
        assert.ok(sitemap.includes('<loc>https://example.com/a</loc>'));
      } finally {
        fs.rmSync(cwd, { recursive: true, force: true });
      }
    }
  );

  it('accepts json line separated urls', async () => {
    const { stdout } = await exec(
      'node ./dist/cli.js < ./tests/mocks/cli-urls.json.txt',
      { encoding: 'utf8' }
    );
    assert.strictEqual(stdout + '\n', jsonxml);
  });

  it('parses xml piped in', async () => {
    let json;
    let threw = false;
    try {
      const { stdout } = await exec(
        'node ./dist/cli.js --parse --single-line-json < ./tests/mocks/alltags.xml',
        { encoding: 'utf8' }
      );
      json = JSON.parse(stdout);
    } catch {
      threw = true;
    }
    assert.strictEqual(threw, false);
    assert.deepStrictEqual(json, normalizedSample.urls);
  });

  it('parses xml specified as a file', async () => {
    let threw = false;
    let json;
    try {
      const { stdout } = await exec(
        'node ./dist/cli.js --parse --single-line-json ./tests/mocks/alltags.xml',
        { encoding: 'utf8' }
      );
      json = JSON.parse(stdout);
    } catch {
      threw = true;
    }
    assert.strictEqual(threw, false);
    assert.deepStrictEqual(json, normalizedSample.urls);
  });

  it('exits with an error while parsing a bad xml file', async () => {
    let threw = false;
    let json;
    try {
      const { stdout } = await exec(
        'node ./dist/cli.js --parse --single-line-json ./tests/mocks/bad-tag-sitemap.xml',
        { encoding: 'utf8' }
      );
      json = JSON.parse(stdout);
    } catch {
      threw = true;
    }
    assert.strictEqual(threw, true);
    assert.strictEqual(json, undefined);
  });

  it(
    'exits quietly when the reader closes stdout early',
    { skip: isWindows },
    async () => {
      const { stderr } = await exec(
        'set -o pipefail; node ./dist/cli.js --parse ./tests/mocks/perf-data.xml | head -c 10 > /dev/null',
        { encoding: 'utf8', shell: '/bin/bash' }
      );
      assert.strictEqual(stderr, '');
    }
  );

  it(
    'reports EPIPE in --index mode, where sitemap files are left incomplete',
    { timeout: 30000, skip: isWindows },
    async () => {
      const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-cli-'));
      const cli = path.resolve('./dist/cli.js');
      const urls = path.resolve('./tests/mocks/short-list.txt');
      try {
        await assert.rejects(
          exec(
            `set -o pipefail; node ${cli} --index --limit 1 --index-base-url https://example.com/ ${urls} | head -c 10 > /dev/null`,
            { encoding: 'utf8', shell: '/bin/bash', cwd }
          ),
          (err: { code: number; stderr: string }) => {
            assert.strictEqual(err.code, 1);
            assert.ok(err.stderr.includes('EPIPE'));
            return true;
          }
        );
      } finally {
        fs.rmSync(cwd, { recursive: true, force: true });
      }
    }
  );

  it('reports a parse error without an unhandled error', async () => {
    await assert.rejects(
      exec('node ./dist/cli.js --parse ./tests/mocks/bad-tag-sitemap.xml', {
        encoding: 'utf8',
      }),
      (err: { code: number; stderr: string }) => {
        assert.strictEqual(err.code, 1);
        assert.ok(err.stderr.includes('unhandled tag: foo'));
        assert.ok(!err.stderr.includes('Unhandled'));
        return true;
      }
    );
  });

  it(
    'validates xml piped in',
    { timeout: 60000, skip: skipWithoutXMLLint },
    async () => {
      const { stdout } = await exec(
        'node ./dist/cli.js --validate < ./tests/mocks/cli-urls.json.xml',
        { encoding: 'utf8' }
      );
      assert.strictEqual(stdout, 'valid\n');
    }
  );

  it(
    'exits with code 1 when the xml is invalid',
    { timeout: 60000, skip: skipWithoutXMLLint },
    async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-cli-'));
      const bad = path.join(dir, 'bad.xml');
      fs.writeFileSync(
        bad,
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><bogus/></urlset>'
      );
      try {
        await assert.rejects(
          exec(`node ./dist/cli.js --validate ${bad}`, { encoding: 'utf8' }),
          (err: { code: number }) => {
            assert.strictEqual(err.code, 1);
            return true;
          }
        );
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  );

  it(
    'validates xml specified as file',
    { timeout: 60000, skip: skipWithoutXMLLint },
    async () => {
      const { stdout } = await exec(
        'node ./dist/cli.js --validate ./tests/mocks/cli-urls.json.xml',
        { encoding: 'utf8' }
      );
      assert.strictEqual(stdout, 'valid\n');
    }
  );
});
