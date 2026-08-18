import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createReadStream } from 'node:fs';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { pipeline as pipe, Writable, Readable, Transform } from 'node:stream';
import {
  parseSitemap,
  XMLToSitemapItemStream,
  ObjectStreamToJSON,
} from '../dist/lib/sitemap-parser.js';
import type { SitemapStreamOptions } from '../dist/lib/sitemap-stream.js';
import { ErrorLevel } from '../dist/lib/types.js';
import type { SitemapItem } from '../dist/lib/types.js';
const pipeline = promisify(pipe);
import normalizedSample from './mocks/sampleconfig.normalized.json' with { type: 'json' };

describe('parseSitemap', () => {
  it('parses xml into sitemap-items', async () => {
    const urls = await parseSitemap(
      createReadStream(resolve(import.meta.dirname, './mocks/alltags.xml'), {
        encoding: 'utf8',
      })
    );
    assert.deepStrictEqual(urls, normalizedSample.urls);
  });

  it('rejects malformed file', async () => {
    await assert.rejects(async () =>
      parseSitemap(
        createReadStream(
          resolve(import.meta.dirname, './mocks/unescaped-lt.xml'),
          {
            encoding: 'utf8',
          }
        )
      )
    );
  });
});

describe('XMLToSitemapItemStream', () => {
  it('stream parses XML', async () => {
    const sitemap: SitemapItem[] = [];
    await pipeline(
      createReadStream(resolve(import.meta.dirname, './mocks/alltags.xml'), {
        encoding: 'utf8',
      }),
      new XMLToSitemapItemStream(),
      new Writable({
        objectMode: true,
        write(chunk, a, cb): void {
          sitemap.push(chunk);
          cb();
        },
      })
    );
    assert.deepStrictEqual(sitemap, normalizedSample.urls);
  });

  it('stream parses bad XML', async () => {
    const sitemap: SitemapStreamOptions[] = [];
    const logger = mock.fn();
    await pipeline(
      createReadStream(
        resolve(import.meta.dirname, './mocks/bad-tag-sitemap.xml'),
        {
          encoding: 'utf8',
        }
      ),
      new XMLToSitemapItemStream({ logger }),
      new Writable({
        objectMode: true,
        write(chunk, a, cb): void {
          sitemap.push(chunk);
          cb();
        },
      })
    );
    assert.deepStrictEqual(sitemap, normalizedSample.urls);
    assert.strictEqual(logger.mock.callCount(), 2);
    assert.strictEqual(logger.mock.calls[0].arguments[1], 'unhandled tag');
    assert.strictEqual(logger.mock.calls[0].arguments[2], 'foo');
  });

  it('stream parses bad XML - silently', async () => {
    const sitemap: SitemapStreamOptions[] = [];
    const logger = mock.fn();
    await pipeline(
      createReadStream(
        resolve(import.meta.dirname, './mocks/bad-tag-sitemap.xml'),
        {
          encoding: 'utf8',
        }
      ),
      new XMLToSitemapItemStream({ logger, level: ErrorLevel.SILENT }),
      new Writable({
        objectMode: true,
        write(chunk, a, cb): void {
          sitemap.push(chunk);
          cb();
        },
      })
    );
    assert.deepStrictEqual(sitemap, normalizedSample.urls);
    assert.strictEqual(logger.mock.callCount(), 0);
  });

  it('stream parses good XML - at a noisy setting without throwing', async () => {
    const sitemap: SitemapStreamOptions[] = [];
    await pipeline(
      createReadStream(resolve(import.meta.dirname, './mocks/alltags.xml'), {
        encoding: 'utf8',
      }),
      new XMLToSitemapItemStream({ level: ErrorLevel.THROW }),
      new Writable({
        objectMode: true,
        write(chunk, a, cb): void {
          sitemap.push(chunk);
          cb();
        },
      })
    );
    assert.deepStrictEqual(sitemap, normalizedSample.urls);
  });

  it('stream parses bad XML - noisily', async () => {
    const sitemap: SitemapStreamOptions[] = [];
    await assert.rejects(() =>
      pipeline(
        createReadStream(
          resolve(import.meta.dirname, './mocks/bad-tag-sitemap.xml'),
          {
            encoding: 'utf8',
          }
        ),
        new XMLToSitemapItemStream({ level: ErrorLevel.THROW }),
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      )
    );
  });

  it('stream parses XML with cdata', async () => {
    const sitemap: SitemapStreamOptions[] = [];
    await pipeline(
      createReadStream(
        resolve(import.meta.dirname, './mocks/alltags.cdata.xml'),
        {
          encoding: 'utf8',
        }
      ),
      new XMLToSitemapItemStream(),
      new Writable({
        objectMode: true,
        write(chunk, a, cb): void {
          sitemap.push(chunk);
          cb();
        },
      })
    );
    assert.deepStrictEqual(sitemap, normalizedSample.urls);
  });

  it('parses CDATA in <loc> tags (issue #445)', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc><![CDATA[https://example.com/page1]]></loc>
  </url>
</urlset>`;
    const results = await parseSitemap(Readable.from(xml));
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].url, 'https://example.com/page1');
  });

  it('parses CDATA in <image:loc> tags (issue #445)', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://example.com/page</loc>
    <image:image>
      <image:loc><![CDATA[https://example.com/image.jpg]]></image:loc>
    </image:image>
  </url>
</urlset>`;
    const results = await parseSitemap(Readable.from(xml));
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].url, 'https://example.com/page');
    assert.strictEqual(results[0].img.length, 1);
    assert.strictEqual(results[0].img[0].url, 'https://example.com/image.jpg');
  });

  it('validates URLs in CDATA sections', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc><![CDATA[invalid-url]]></loc>
  </url>
</urlset>`;
    // With THROW error level, invalid URLs should cause errors
    const stream = new XMLToSitemapItemStream({ level: ErrorLevel.THROW });
    const promise = pipeline(
      Readable.from(xml),
      stream,
      new Writable({
        objectMode: true,
        write(chunk, a, cb): void {
          cb();
        },
      })
    );
    await assert.rejects(promise, {
      message: 'URL must start with http:// or https://: invalid-url',
    });
  });
});

describe('ObjectStreamToJSON', () => {
  it('turns a stream of sitemapItems to string', async () => {
    let sitemap = '';
    const items = [{ foo: 'bar' }, { fizz: 'buzz' }];
    const itemsSource = [...items];
    const readable = new Readable({
      objectMode: true,
      read(size): void {
        this.push(itemsSource.shift());
        if (!itemsSource.length) {
          this.push(null);
        }
      },
    });
    await pipeline(
      readable,
      new ObjectStreamToJSON(),
      new Writable({
        objectMode: true,
        write(chunk, a, cb): void {
          sitemap += chunk;
          cb();
        },
      })
    );
    assert.strictEqual(sitemap, JSON.stringify(items));
  });
});

describe('XMLToSitemapItemStream filtering', () => {
  it('filters items during parsing using Transform stream', async () => {
    const sitemap: SitemapItem[] = [];

    // Create a filter that only keeps URLs containing 'roosterteeth.com'
    const filterStream = new Transform({
      objectMode: true,
      transform(chunk: SitemapItem, encoding, callback): void {
        if (chunk.url.includes('roosterteeth.com')) {
          callback(undefined, chunk);
        } else {
          callback(); // Skip this item
        }
      },
    });

    await pipeline(
      createReadStream(resolve(import.meta.dirname, './mocks/alltags.xml'), {
        encoding: 'utf8',
      }),
      new XMLToSitemapItemStream(),
      filterStream,
      new Writable({
        objectMode: true,
        write(chunk, a, cb): void {
          sitemap.push(chunk);
          cb();
        },
      })
    );

    // Should only have items with 'roosterteeth.com' in the URL
    assert.ok(sitemap.length > 0);
    sitemap.forEach((item) => {
      assert.ok(item.url.includes('roosterteeth.com'));
    });
  });

  it('deletes items matching exclusion criteria', async () => {
    const sitemap: SitemapItem[] = [];

    // Create a filter that excludes URLs containing 'roosterteeth'
    const excludeFilter = new Transform({
      objectMode: true,
      transform(chunk: SitemapItem, encoding, callback): void {
        if (chunk.url.includes('roosterteeth')) {
          callback(); // Drop this item
        } else {
          callback(undefined, chunk); // Keep all others
        }
      },
    });

    await pipeline(
      createReadStream(resolve(import.meta.dirname, './mocks/alltags.xml'), {
        encoding: 'utf8',
      }),
      new XMLToSitemapItemStream(),
      excludeFilter,
      new Writable({
        objectMode: true,
        write(chunk, a, cb): void {
          sitemap.push(chunk);
          cb();
        },
      })
    );

    // Should not have any items with 'roosterteeth' in the URL
    assert.ok(sitemap.length > 0);
    sitemap.forEach((item) => {
      assert.ok(!item.url.includes('roosterteeth'));
    });
  });

  it('filters items based on priority', async () => {
    const sitemap: SitemapItem[] = [];

    // Filter to only keep high-priority items
    const priorityFilter = new Transform({
      objectMode: true,
      transform(chunk: SitemapItem, encoding, callback): void {
        if (chunk.priority !== undefined && chunk.priority >= 0.5) {
          callback(undefined, chunk);
        } else {
          callback();
        }
      },
    });

    await pipeline(
      createReadStream(resolve(import.meta.dirname, './mocks/alltags.xml'), {
        encoding: 'utf8',
      }),
      new XMLToSitemapItemStream(),
      priorityFilter,
      new Writable({
        objectMode: true,
        write(chunk, a, cb): void {
          sitemap.push(chunk);
          cb();
        },
      })
    );

    // All items should have priority >= 0.5
    sitemap.forEach((item) => {
      assert.notStrictEqual(item.priority, undefined);
      assert.ok(item.priority! >= 0.5);
    });
  });

  it('counts filtered and dropped items', async () => {
    let keptCount = 0;
    let droppedCount = 0;
    const sitemap: SitemapItem[] = [];

    const countingFilter = new Transform({
      objectMode: true,
      transform(chunk: SitemapItem, encoding, callback): void {
        // Keep items with changefreq defined
        if (chunk.changefreq) {
          keptCount++;
          callback(undefined, chunk);
        } else {
          droppedCount++;
          callback();
        }
      },
    });

    await pipeline(
      createReadStream(resolve(import.meta.dirname, './mocks/alltags.xml'), {
        encoding: 'utf8',
      }),
      new XMLToSitemapItemStream(),
      countingFilter,
      new Writable({
        objectMode: true,
        write(chunk, a, cb): void {
          sitemap.push(chunk);
          cb();
        },
      })
    );

    // Should have processed all items from normalized sample
    assert.strictEqual(keptCount + droppedCount, normalizedSample.urls.length);
    assert.strictEqual(keptCount, sitemap.length);
    assert.ok(sitemap.length > 0);
  });

  it('chains multiple filters together', async () => {
    const sitemap: SitemapItem[] = [];

    // First filter: only keep items with priority defined
    const priorityFilter = new Transform({
      objectMode: true,
      transform(chunk: SitemapItem, encoding, callback): void {
        if (chunk.priority !== undefined) {
          callback(undefined, chunk);
        } else {
          callback();
        }
      },
    });

    // Second filter: only keep items with changefreq
    const changefreqFilter = new Transform({
      objectMode: true,
      transform(chunk: SitemapItem, encoding, callback): void {
        if (chunk.changefreq) {
          callback(undefined, chunk);
        } else {
          callback();
        }
      },
    });

    await pipeline(
      createReadStream(resolve(import.meta.dirname, './mocks/alltags.xml'), {
        encoding: 'utf8',
      }),
      new XMLToSitemapItemStream(),
      priorityFilter,
      changefreqFilter,
      new Writable({
        objectMode: true,
        write(chunk, a, cb): void {
          sitemap.push(chunk);
          cb();
        },
      })
    );

    // All items should have both priority and changefreq
    sitemap.forEach((item) => {
      assert.notStrictEqual(item.priority, undefined);
      assert.ok(item.changefreq);
    });
  });
});
