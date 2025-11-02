import { createReadStream } from 'node:fs';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { pipeline as pipe, Writable, Readable, Transform } from 'node:stream';
import {
  parseSitemap,
  XMLToSitemapItemStream,
  ObjectStreamToJSON,
} from '../lib/sitemap-parser.js';
import { SitemapStreamOptions } from '../lib/sitemap-stream.js';
import { ErrorLevel, SitemapItem } from '../lib/types.js';
const pipeline = promisify(pipe);
import normalizedSample from './mocks/sampleconfig.normalized.json';

describe('parseSitemap', () => {
  it('parses xml into sitemap-items', async () => {
    const urls = await parseSitemap(
      createReadStream(resolve(__dirname, './mocks/alltags.xml'), {
        encoding: 'utf8',
      })
    );
    expect(urls).toEqual(normalizedSample.urls);
  });

  it('rejects malformed file', async () => {
    await expect(async () =>
      parseSitemap(
        createReadStream(resolve(__dirname, './mocks/unescaped-lt.xml'), {
          encoding: 'utf8',
        })
      )
    ).rejects.toThrow();
  });
});

describe('XMLToSitemapItemStream', () => {
  it('stream parses XML', async () => {
    const sitemap: SitemapItem[] = [];
    await pipeline(
      createReadStream(resolve(__dirname, './mocks/alltags.xml'), {
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
    expect(sitemap).toEqual(normalizedSample.urls);
  });

  it('stream parses bad XML', async () => {
    const sitemap: SitemapStreamOptions[] = [];
    const logger = jest.fn();
    await pipeline(
      createReadStream(resolve(__dirname, './mocks/bad-tag-sitemap.xml'), {
        encoding: 'utf8',
      }),
      new XMLToSitemapItemStream({ logger }),
      new Writable({
        objectMode: true,
        write(chunk, a, cb): void {
          sitemap.push(chunk);
          cb();
        },
      })
    );
    expect(sitemap).toEqual(normalizedSample.urls);
    expect(logger.mock.calls.length).toBe(2);
    expect(logger.mock.calls[0][1]).toBe('unhandled tag');
    expect(logger.mock.calls[0][2]).toBe('foo');
  });

  it('stream parses bad XML - silently', async () => {
    const sitemap: SitemapStreamOptions[] = [];
    const logger = jest.fn();
    await pipeline(
      createReadStream(resolve(__dirname, './mocks/bad-tag-sitemap.xml'), {
        encoding: 'utf8',
      }),
      new XMLToSitemapItemStream({ logger, level: ErrorLevel.SILENT }),
      new Writable({
        objectMode: true,
        write(chunk, a, cb): void {
          sitemap.push(chunk);
          cb();
        },
      })
    );
    expect(sitemap).toEqual(normalizedSample.urls);
    expect(logger.mock.calls.length).toBe(0);
  });

  it('stream parses good XML - at a noisy setting without throwing', async () => {
    const sitemap: SitemapStreamOptions[] = [];
    await pipeline(
      createReadStream(resolve(__dirname, './mocks/alltags.xml'), {
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
    expect(sitemap).toEqual(normalizedSample.urls);
  });

  it('stream parses bad XML - noisily', async () => {
    const sitemap: SitemapStreamOptions[] = [];
    expect(() =>
      pipeline(
        createReadStream(resolve(__dirname, './mocks/bad-tag-sitemap.xml'), {
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
      )
    ).rejects.toThrow();
  });

  it('stream parses XML with cdata', async () => {
    const sitemap: SitemapStreamOptions[] = [];
    await pipeline(
      createReadStream(resolve(__dirname, './mocks/alltags.cdata.xml'), {
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
    expect(sitemap).toEqual(normalizedSample.urls);
  });

  it('parses CDATA in <loc> tags (issue #445)', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc><![CDATA[https://example.com/page1]]></loc>
  </url>
</urlset>`;
    const results = await parseSitemap(Readable.from(xml));
    expect(results).toHaveLength(1);
    expect(results[0].url).toBe('https://example.com/page1');
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
    expect(results).toHaveLength(1);
    expect(results[0].url).toBe('https://example.com/page');
    expect(results[0].img).toHaveLength(1);
    expect(results[0].img[0].url).toBe('https://example.com/image.jpg');
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
    await expect(promise).rejects.toThrow(
      'URL must start with http:// or https://'
    );
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
    expect(sitemap).toBe(JSON.stringify(items));
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
      createReadStream(resolve(__dirname, './mocks/alltags.xml'), {
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
    expect(sitemap.length).toBeGreaterThan(0);
    sitemap.forEach((item) => {
      expect(item.url).toContain('roosterteeth.com');
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
      createReadStream(resolve(__dirname, './mocks/alltags.xml'), {
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
    expect(sitemap.length).toBeGreaterThan(0);
    sitemap.forEach((item) => {
      expect(item.url).not.toContain('roosterteeth');
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
      createReadStream(resolve(__dirname, './mocks/alltags.xml'), {
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
      expect(item.priority).toBeDefined();
      expect(item.priority).toBeGreaterThanOrEqual(0.5);
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
      createReadStream(resolve(__dirname, './mocks/alltags.xml'), {
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
    expect(keptCount + droppedCount).toBe(normalizedSample.urls.length);
    expect(keptCount).toBe(sitemap.length);
    expect(sitemap.length).toBeGreaterThan(0);
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
      createReadStream(resolve(__dirname, './mocks/alltags.xml'), {
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
      expect(item.priority).toBeDefined();
      expect(item.changefreq).toBeDefined();
    });
  });
});
