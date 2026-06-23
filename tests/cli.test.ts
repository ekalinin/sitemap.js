import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import util from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  exec as execCb,
  execFileSync as execFileSyncCb,
} from 'node:child_process';
import pkg from '../package.json' with { type: 'json' };
import normalizedSample from './mocks/sampleconfig.normalized.json' with { type: 'json' };

const exec = util.promisify(execCb);
const execFileSync = execFileSyncCb;

const isWindows = os.platform() === 'win32';

let hasXMLLint = true;
try {
  const command = isWindows ? 'where' : 'which';
  execFileSync(command, ['xmllint']);
} catch {
  hasXMLLint = false;
}

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
      try {
        fs.accessSync(path.resolve('./sitemap-0.xml'), fs.constants.R_OK);
        fs.accessSync(path.resolve('./sitemap-3.xml'), fs.constants.R_OK);
      } catch {
        assert.fail('expected sitemap files to exist');
      }
      try {
        fs.accessSync(path.resolve('sitemap-4.xml'), fs.constants.R_OK);
        assert.fail('expected sitemap-4.xml to not exist');
      } catch {
        // expected
      }
      fs.unlinkSync(path.resolve('./sitemap-0.xml'));
      fs.unlinkSync(path.resolve('./sitemap-1.xml'));
      fs.unlinkSync(path.resolve('./sitemap-2.xml'));
      fs.unlinkSync(path.resolve('./sitemap-3.xml'));
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

  it('validates xml piped in', { timeout: 60000 }, async () => {
    if (hasXMLLint) {
      const { stdout } = await exec(
        'node ./dist/cli.js --validate < ./tests/mocks/cli-urls.json.xml',
        { encoding: 'utf8' }
      );
      assert.strictEqual(stdout, 'valid\n');
    } else {
      // skip
    }
  });

  it('validates xml specified as file', { timeout: 60000 }, async () => {
    if (hasXMLLint) {
      const { stdout } = await exec(
        'node ./dist/cli.js --validate ./tests/mocks/cli-urls.json.xml',
        { encoding: 'utf8' }
      );
      assert.strictEqual(stdout, 'valid\n');
    } else {
      // skip
    }
  });
});
