import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  simpleSitemapAndIndex,
  streamToPromise,
  DEFAULT_SITEMAP_ITEM_LIMIT,
} from '../dist/index.js';
import {
  existsSync,
  createReadStream,
  mkdirSync,
  mkdtempSync,
  rmSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { Readable } from 'node:stream';
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

  it('defaults to DEFAULT_SITEMAP_ITEM_LIMIT URLs per sitemap', async () => {
    await simpleSitemapAndIndex({
      hostname: 'https://example.com/',
      sourceData: Array.from(
        { length: DEFAULT_SITEMAP_ITEM_LIMIT + 1 },
        (_, i) => `https://example.com/${i}`
      ),
      destinationDir: targetFolder,
      gzip: false,
    });

    assert.ok(existsSync(resolve(targetFolder, './sitemap-1.xml')));
    assert.ok(!existsSync(resolve(targetFolder, './sitemap-2.xml')));
  });

  it('rejects without creating a sitemap file when the sitemap URL is invalid', async () => {
    await assert.rejects(
      simpleSitemapAndIndex({
        hostname: 'https://example.com/',
        sourceData: ['https://example.com/a'],
        destinationDir: targetFolder,
        publicBasePath: '/' + 'a'.repeat(2100) + '/',
        gzip: false,
      }),
      /sitemap URL/
    );
    assert.ok(!existsSync(resolve(targetFolder, './sitemap-0.xml')));
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

  for (const gzip of [true, false]) {
    it(
      `rejects when a sitemap file cannot be written (gzip: ${gzip})`,
      { timeout: 2000 },
      async () => {
        // A directory where the first sitemap file should go makes its
        // write stream fail.
        mkdirSync(resolve(targetFolder, `sitemap-0.xml${gzip ? '.gz' : ''}`));

        // Never end the source, so the error can only arrive while the
        // sitemap is still open; if it is not reported then, this times out.
        const sourceData = new Readable({ objectMode: true, read() {} });
        sourceData.push('https://example.com/a');

        await assert.rejects(
          simpleSitemapAndIndex({
            hostname: 'https://example.com/',
            sourceData,
            destinationDir: targetFolder,
            gzip,
          }),
          /EISDIR/
        );
      }
    );
  }

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
