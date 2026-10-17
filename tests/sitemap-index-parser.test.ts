import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createReadStream } from 'node:fs';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { pipeline as pipe, Writable, Readable } from 'node:stream';
import {
  parseSitemapIndex,
  XMLToSitemapIndexStream,
  IndexObjectStreamToJSON,
} from '../dist/lib/sitemap-index-parser.js';
import { ErrorLevel } from '../dist/lib/types.js';
import { LIMITS } from '../dist/lib/constants.js';
import type { IndexItem } from '../dist/lib/types.js';
const pipeline = promisify(pipe);
import normalizedSample from './mocks/sampleconfig-index.normalized.json' with { type: 'json' };

describe('parseSitemapIndex', () => {
  it('parses xml into index-items', async () => {
    const urls = await parseSitemapIndex(
      createReadStream(
        resolve(import.meta.dirname!, './mocks/alltags-index.xml'),
        {
          encoding: 'utf8',
        }
      )
    );
    assert.deepStrictEqual(urls, normalizedSample.sitemaps);
  });

  it('rejects malformed file', async () => {
    await assert.rejects(
      parseSitemapIndex(
        createReadStream(
          resolve(import.meta.dirname!, './mocks/index-unescaped-lt.xml'),
          {
            encoding: 'utf8',
          }
        )
      )
    );
  });
});

describe('XMLToSitemapIndexItemStream', () => {
  it('stream parses XML', async () => {
    const sitemap: IndexItem[] = [];
    await pipeline(
      createReadStream(
        resolve(import.meta.dirname!, './mocks/alltags-index.xml'),
        {
          encoding: 'utf8',
        }
      ),
      new XMLToSitemapIndexStream(),
      new Writable({
        objectMode: true,
        write(chunk, a, cb): void {
          sitemap.push(chunk);
          cb();
        },
      })
    );
    assert.deepStrictEqual(sitemap, normalizedSample.sitemaps);
  });

  it('stream parses bad XML', async () => {
    const sitemap: IndexItem[] = [];
    const logger = mock.fn();
    await pipeline(
      createReadStream(
        resolve(import.meta.dirname!, './mocks/bad-tag-index.xml'),
        {
          encoding: 'utf8',
        }
      ),
      new XMLToSitemapIndexStream({ logger }),
      new Writable({
        objectMode: true,
        write(chunk, a, cb): void {
          sitemap.push(chunk);
          cb();
        },
      })
    );
    assert.deepStrictEqual(sitemap, normalizedSample.sitemaps);
    assert.strictEqual(logger.mock.calls.length, 2);
    assert.strictEqual(logger.mock.calls[0].arguments[1], 'unhandled tag');
    assert.strictEqual(logger.mock.calls[0].arguments[2], 'foo');
  });

  it('stream parses bad XML - silently', async () => {
    const sitemap: IndexItem[] = [];
    const logger = mock.fn();
    await pipeline(
      createReadStream(
        resolve(import.meta.dirname!, './mocks/bad-tag-index.xml'),
        {
          encoding: 'utf8',
        }
      ),
      new XMLToSitemapIndexStream({ logger, level: ErrorLevel.SILENT }),
      new Writable({
        objectMode: true,
        write(chunk, a, cb): void {
          sitemap.push(chunk);
          cb();
        },
      })
    );
    assert.deepStrictEqual(sitemap, normalizedSample.sitemaps);
    assert.strictEqual(logger.mock.calls.length, 0);
  });

  it('stream parses XML with cdata', async () => {
    const sitemap: IndexItem[] = [];
    const logger = mock.fn();
    await pipeline(
      createReadStream(
        resolve(import.meta.dirname!, './mocks/alltags-index.cdata.xml'),
        {
          encoding: 'utf8',
        }
      ),
      new XMLToSitemapIndexStream({ logger }),
      new Writable({
        objectMode: true,
        write(chunk, a, cb): void {
          sitemap.push(chunk);
          cb();
        },
      })
    );
    assert.deepStrictEqual(sitemap, normalizedSample.sitemaps);
    assert.strictEqual(logger.mock.calls.length, 2);
    assert.strictEqual(logger.mock.calls[0].arguments[1], 'unhandled tag');
    assert.strictEqual(logger.mock.calls[0].arguments[2], 'foo');
    assert.strictEqual(
      logger.mock.calls[1].arguments[1],
      'unhandled text for tag:'
    );
    assert.strictEqual(logger.mock.calls[1].arguments[2], 'foo');
  });

  it('stream parses XML with cdata - silently', async () => {
    const sitemap: IndexItem[] = [];
    const logger = mock.fn();
    await pipeline(
      createReadStream(
        resolve(import.meta.dirname!, './mocks/alltags-index.cdata.xml'),
        {
          encoding: 'utf8',
        }
      ),
      new XMLToSitemapIndexStream({ logger, level: ErrorLevel.SILENT }),
      new Writable({
        objectMode: true,
        write(chunk, a, cb): void {
          sitemap.push(chunk);
          cb();
        },
      })
    );
    assert.deepStrictEqual(sitemap, normalizedSample.sitemaps);
    assert.strictEqual(logger.mock.calls.length, 0);
  });
});

async function parseIndexChunks(
  chunks: string[],
  opts: ConstructorParameters<typeof XMLToSitemapIndexStream>[0] = {
    logger: false,
  }
): Promise<{ items: IndexItem[]; parser: XMLToSitemapIndexStream }> {
  const items: IndexItem[] = [];
  const parser = new XMLToSitemapIndexStream(opts);
  await pipeline(
    Readable.from(chunks),
    parser,
    new Writable({
      objectMode: true,
      write(chunk, a, cb): void {
        items.push(chunk);
        cb();
      },
    })
  );
  return { items, parser };
}

const indexOpen =
  '<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
const indexClose = '</sitemapindex>';

describe('XMLToSitemapIndexStream character data', () => {
  it('joins text and CDATA in one loc', async () => {
    const { items, parser } = await parseIndexChunks([
      `${indexOpen}<sitemap><loc>https://example.com/<![CDATA[a.xml]]></loc></sitemap>${indexClose}`,
    ]);
    assert.strictEqual(parser.error, null);
    assert.deepStrictEqual(items, [{ url: 'https://example.com/a.xml' }]);
  });

  it('joins text and CDATA in one lastmod', async () => {
    const { items, parser } = await parseIndexChunks([
      `${indexOpen}<sitemap><loc>https://example.com/a.xml</loc><lastmod>2024-01-<![CDATA[02]]></lastmod></sitemap>${indexClose}`,
    ]);
    assert.strictEqual(parser.error, null);
    assert.deepStrictEqual(items, [
      { url: 'https://example.com/a.xml', lastmod: '2024-01-02' },
    ]);
  });

  it('joins a loc split across chunks', async () => {
    const { items, parser } = await parseIndexChunks([
      `${indexOpen}<sitemap><loc><![CDATA[https://exa`,
      `mple.com/a.xml]]></loc></sitemap>${indexClose}`,
    ]);
    assert.strictEqual(parser.error, null);
    assert.deepStrictEqual(items, [{ url: 'https://example.com/a.xml' }]);
  });

  it('trims whitespace around CDATA', async () => {
    const { items, parser } = await parseIndexChunks([
      `${indexOpen}<sitemap><loc> <![CDATA[ https://example.com/a.xml ]]> </loc></sitemap>${indexClose}`,
    ]);
    assert.strictEqual(parser.error, null);
    assert.deepStrictEqual(items, [{ url: 'https://example.com/a.xml' }]);
  });

  it('reports stray text after a closed element against its parent', async () => {
    const { items, parser } = await parseIndexChunks([
      `${indexOpen}<sitemap><loc>https://example.com/a.xml</loc><![CDATA[javascript:alert(1)]]></sitemap>${indexClose}`,
    ]);
    assert.deepStrictEqual(items, [{ url: 'https://example.com/a.xml' }]);
    assert.strictEqual(
      parser.error?.message,
      "unhandled text for tag: sitemap 'javascript:alert(1)'"
    );
  });

  it('drops character data that exceeds the buffer cap', async () => {
    const huge = 'https://example.com/' + 'a'.repeat(200_000);
    const { items, parser } = await parseIndexChunks([
      `${indexOpen}<sitemap><loc>${huge}</loc></sitemap>${indexClose}`,
    ]);
    assert.deepStrictEqual(items, []);
    assert.strictEqual(
      parser.error?.message,
      `character data for loc exceeds max length of ${LIMITS.MAX_PARSER_CHAR_DATA_LENGTH}`
    );
  });
});

describe('XMLToSitemapIndexStream entry cap', () => {
  const overCap = (): string[] => {
    const chunks = [indexOpen];
    for (let i = 0; i <= LIMITS.MAX_SITEMAP_ITEM_LIMIT; i++) {
      chunks.push(`<sitemap><loc>https://e.com/${i}.xml</loc></sitemap>`);
    }
    chunks.push(indexClose);
    return [chunks.join('')];
  };

  it('stops pushing entries past the spec limit', async () => {
    const { items, parser } = await parseIndexChunks(overCap());
    assert.strictEqual(items.length, LIMITS.MAX_SITEMAP_ITEM_LIMIT);
    assert.strictEqual(
      parser.error?.message,
      `Sitemap index exceeds maximum of ${LIMITS.MAX_SITEMAP_ITEM_LIMIT} entries`
    );
  });

  it('errors in THROW mode past the spec limit', async () => {
    await assert.rejects(
      parseIndexChunks(overCap(), { logger: false, level: ErrorLevel.THROW }),
      /exceeds maximum of 50000 entries/
    );
  });

  it('parseSitemapIndex rejects past the spec limit even with a higher maxEntries', async () => {
    await assert.rejects(
      parseSitemapIndex(Readable.from(overCap()), 100_000),
      /exceeds maximum allowed entries \(50000\)/
    );
  });

  it('parseSitemapIndex stops reading as soon as the spec limit is crossed', async () => {
    const total = LIMITS.MAX_SITEMAP_ITEM_LIMIT + 10_000;
    let yielded = 0;
    function* source(): Generator<string> {
      yield indexOpen;
      for (let i = 0; i < total; i++) {
        yielded++;
        yield `<sitemap><loc>https://e.com/${i}.xml</loc></sitemap>`;
      }
      yield indexClose;
    }
    await assert.rejects(
      parseSitemapIndex(Readable.from(source())),
      /exceeds maximum allowed entries \(50000\)/
    );

    assert.ok(
      yielded < total,
      `expected early stop, but all ${total} entries were read`
    );
  });

  it('reports the spec limit once, not per dropped entry', async () => {
    const logger = mock.fn();
    const chunks = overCap();
    chunks[0] = chunks[0].replace(
      indexClose,
      `<sitemap><loc>https://e.com/extra.xml</loc></sitemap>${indexClose}`
    );
    await parseIndexChunks(chunks, { logger });
    const capErrors = logger.mock.calls.filter(
      (c) => c.arguments[0] === 'error'
    );
    assert.strictEqual(capErrors.length, 1);
  });
});

describe('XMLToSitemapIndexStream errors', () => {
  it('collects every error, keeping at most MAX_PARSER_ERRORS', async () => {
    const bad = LIMITS.MAX_PARSER_ERRORS + 5;
    const entries = Array.from(
      { length: bad },
      (_, i) => `<sitemap><loc>ftp://e.com/${i}.xml</loc></sitemap>`
    ).join('');
    const { items, parser } = await parseIndexChunks([
      `${indexOpen}${entries}${indexClose}`,
    ]);
    assert.deepStrictEqual(items, []);
    assert.strictEqual(parser.errorCount, bad);
    assert.strictEqual(parser.errors.length, LIMITS.MAX_PARSER_ERRORS);
    assert.match(parser.errors[1].message, /Invalid URL in sitemap index/);
    assert.strictEqual(parser.error, parser.errors[0]);
  });

  it('does not let error be overwritten', () => {
    const parser = new XMLToSitemapIndexStream({ logger: false });
    assert.throws(() => {
      (parser as unknown as { error: Error }).error = new Error('x');
    }, TypeError);
    assert.strictEqual(parser.error, null);
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
      new IndexObjectStreamToJSON(),
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
