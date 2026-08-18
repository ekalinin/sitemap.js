import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { simpleSitemapAndIndex, streamToPromise } from '../dist/index.js';
import { existsSync, createReadStream, mkdtempSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { createGunzip } from 'node:zlib';

describe('simpleSitemapAndIndex', () => {
  let targetFolder: string;

  beforeEach(() => {
    // Create unique temp directory for each test to avoid conflicts
    targetFolder = mkdtempSync('sitemap-test-');
  });

  afterEach(() => {
    // Clean up the entire temp directory
    if (targetFolder && existsSync(targetFolder)) {
      rmSync(targetFolder, { recursive: true, force: true });
    }
  });

  it('writes both a sitemap and index', async () => {
    const baseURL = 'https://example.com/sub/';

    await simpleSitemapAndIndex({
      hostname: baseURL,
      sourceData: [
        'https://1.example.com/a',
        'https://2.example.com/a',
        'https://3.example.com/a',
        'https://4.example.com/a',
      ],
      destinationDir: targetFolder,
      limit: 1,
    });

    const index = (
      await streamToPromise(
        createReadStream(resolve(targetFolder, `./sitemap-index.xml.gz`)).pipe(
          createGunzip()
        )
      )
    ).toString();
    assert.ok(index.includes(`${baseURL}sitemap-0`));
    assert.ok(index.includes(`${baseURL}sitemap-1`));
    assert.ok(index.includes(`${baseURL}sitemap-2`));
    assert.ok(index.includes(`${baseURL}sitemap-3`));
    assert.ok(!index.includes(`${baseURL}sitemap-4`));
    assert.strictEqual(
      existsSync(resolve(targetFolder, `./sitemap-0.xml.gz`)),
      true
    );

    assert.strictEqual(
      existsSync(resolve(targetFolder, `./sitemap-1.xml.gz`)),
      true
    );

    assert.strictEqual(
      existsSync(resolve(targetFolder, `./sitemap-2.xml.gz`)),
      true
    );

    assert.strictEqual(
      existsSync(resolve(targetFolder, `./sitemap-3.xml.gz`)),
      true
    );

    assert.strictEqual(
      existsSync(resolve(targetFolder, `./sitemap-4.xml.gz`)),
      false
    );
    const xml = await streamToPromise(
      createReadStream(resolve(targetFolder, `./sitemap-0.xml.gz`)).pipe(
        createGunzip()
      )
    );
    assert.ok(xml.toString().includes('https://1.example.com/a'));
  });

  it('accepts sitemapItemLoose as a type', async () => {
    const baseURL = 'https://example.com/sub/';

    await simpleSitemapAndIndex({
      hostname: baseURL,
      sourceData: [
        { url: 'https://1.example.com/a' },
        { url: 'https://2.example.com/a' },
        { url: 'https://3.example.com/a' },
        { url: 'https://4.example.com/a' },
      ],
      destinationDir: targetFolder,
    });

    const index = (
      await streamToPromise(
        createReadStream(resolve(targetFolder, './sitemap-index.xml.gz')).pipe(
          createGunzip()
        )
      )
    ).toString();
    assert.ok(index.includes(`${baseURL}sitemap-0`));
    assert.strictEqual(
      existsSync(resolve(targetFolder, './sitemap-0.xml.gz')),
      true
    );
    const xml = await streamToPromise(
      createReadStream(resolve(targetFolder, './sitemap-0.xml.gz')).pipe(
        createGunzip()
      )
    );
    assert.ok(xml.toString().includes('https://1.example.com/a'));
  });

  it('accepts a filepath', async () => {
    const baseURL = 'http://example.com';
    await simpleSitemapAndIndex({
      hostname: baseURL,
      sourceData: './tests/mocks/cli-urls.txt',
      destinationDir: targetFolder,
    });
    const index = (
      await streamToPromise(
        createReadStream(resolve(targetFolder, `./sitemap-index.xml.gz`)).pipe(
          createGunzip()
        )
      )
    ).toString();
    assert.ok(index.includes(`${baseURL}/sitemap-0`));
    assert.strictEqual(
      existsSync(resolve(targetFolder, `./sitemap-0.xml.gz`)),
      true
    );
    const xml = await streamToPromise(
      createReadStream(resolve(targetFolder, `./sitemap-0.xml.gz`)).pipe(
        createGunzip()
      )
    );
    assert.ok(xml.toString().includes('achievement'));
  });

  it("creates the dest dir if it doesn't exist", async () => {
    const baseURL = 'http://example.com';
    const destinationDir = `${targetFolder}/non-existent/`;
    await simpleSitemapAndIndex({
      hostname: baseURL,
      sourceData: [
        'https://1.example.com/a',
        'https://2.example.com/a',
        'https://3.example.com/a',
        'https://4.example.com/a',
      ],
      destinationDir,
    });

    assert.strictEqual(
      existsSync(resolve(destinationDir, `./sitemap-0.xml.gz`)),
      true
    );
    const index = (
      await streamToPromise(
        createReadStream(
          resolve(destinationDir, `./sitemap-index.xml.gz`)
        ).pipe(createGunzip())
      )
    ).toString();
    assert.ok(index.includes(`${baseURL}/sitemap-0.xml.gz`));
    assert.strictEqual(
      existsSync(resolve(destinationDir, `./sitemap-0.xml.gz`)),
      true
    );
  });

  it('supports not gzipping', async () => {
    const baseURL = 'http://example.com';
    const destinationDir = `${targetFolder}/non-existent/`;
    await simpleSitemapAndIndex({
      hostname: baseURL,
      sourceData: [
        'https://1.example.com/a',
        'https://2.example.com/a',
        'https://3.example.com/a',
        'https://4.example.com/a',
      ],
      destinationDir,
      gzip: false,
    });

    assert.strictEqual(
      existsSync(resolve(destinationDir, `./sitemap-0.xml`)),
      true
    );
    const index = (
      await streamToPromise(
        createReadStream(resolve(destinationDir, `./sitemap-index.xml`))
      )
    ).toString();
    assert.ok(index.includes(`${baseURL}/sitemap-0`));
    assert.strictEqual(
      existsSync(resolve(destinationDir, `./sitemap-0.xml`)),
      true
    );
    const xml = await streamToPromise(
      createReadStream(resolve(destinationDir, `./sitemap-0.xml`))
    );
    assert.ok(xml.toString().includes('1.example.com'));
  });

  it('throws on bad data', async () => {
    const baseURL = 'http://example.com';
    const destinationDir = `${targetFolder}/non-existent/`;
    await assert.rejects(
      simpleSitemapAndIndex({
        hostname: baseURL,
        sourceData: {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          src: [
            'https://1.example.com/a',
            'https://2.example.com/a',
            'https://3.example.com/a',
            'https://4.example.com/a',
          ],
        },
        destinationDir,
        gzip: false,
      })
    );
  });

  it('supports non-root-based sitemap urls', async () => {
    const baseURL = 'http://example.com';
    const destinationDir = `${targetFolder}/non-existent/`;
    await simpleSitemapAndIndex({
      hostname: baseURL,
      sourceData: [
        'https://1.example.com/a',
        'https://2.example.com/a',
        'https://3.example.com/a',
        'https://4.example.com/a',
      ],
      destinationDir,
      publicBasePath: '/foo/bar/',
      gzip: false,
    });

    assert.strictEqual(
      existsSync(resolve(destinationDir, `./sitemap-0.xml`)),
      true
    );
    const index = (
      await streamToPromise(
        createReadStream(resolve(destinationDir, `./sitemap-index.xml`))
      )
    ).toString();
    assert.ok(index.includes(`${baseURL}/foo/bar/sitemap-0`));
    assert.strictEqual(
      existsSync(resolve(destinationDir, `./sitemap-0.xml`)),
      true
    );
    const xml = await streamToPromise(
      createReadStream(resolve(destinationDir, `./sitemap-0.xml`))
    );
    assert.ok(xml.toString().includes('1.example.com'));
  });

  it('supports non-root-based sitemap urls not ending in a /', async () => {
    const baseURL = 'http://example.com';
    const destinationDir = `${targetFolder}/non-existent/`;
    await simpleSitemapAndIndex({
      hostname: baseURL,
      sourceData: [
        'https://1.example.com/a',
        'https://2.example.com/a',
        'https://3.example.com/a',
        'https://4.example.com/a',
      ],
      destinationDir,
      publicBasePath: '/foo/bar',
      gzip: false,
    });

    assert.strictEqual(
      existsSync(resolve(destinationDir, `./sitemap-0.xml`)),
      true
    );
    const index = (
      await streamToPromise(
        createReadStream(resolve(destinationDir, `./sitemap-index.xml`))
      )
    ).toString();
    assert.ok(index.includes(`${baseURL}/foo/bar/sitemap-0`));
    assert.strictEqual(
      existsSync(resolve(destinationDir, `./sitemap-0.xml`)),
      true
    );
    const xml = await streamToPromise(
      createReadStream(resolve(destinationDir, `./sitemap-0.xml`))
    );
    assert.ok(xml.toString().includes('1.example.com'));
  });

  it('supports relative non-root-based sitemap urls', async () => {
    const baseURL = 'http://example.com/buzz/';
    const destinationDir = `${targetFolder}/non-existent/`;
    await simpleSitemapAndIndex({
      hostname: baseURL,
      sourceData: [
        'https://1.example.com/a',
        'https://2.example.com/a',
        'https://3.example.com/a',
        'https://4.example.com/a',
      ],
      destinationDir,
      publicBasePath: '/foo/bar/',
      gzip: false,
    });

    assert.strictEqual(
      existsSync(resolve(destinationDir, `./sitemap-0.xml`)),
      true
    );
    const index = (
      await streamToPromise(
        createReadStream(resolve(destinationDir, `./sitemap-index.xml`))
      )
    ).toString();
    assert.ok(index.includes(`http://example.com/foo/bar/sitemap-0`));
    assert.strictEqual(
      existsSync(resolve(destinationDir, `./sitemap-0.xml`)),
      true
    );
    const xml = await streamToPromise(
      createReadStream(resolve(destinationDir, `./sitemap-0.xml`))
    );
    assert.ok(xml.toString().includes('1.example.com'));
  });
});
