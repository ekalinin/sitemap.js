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
      'unhandled cdata for tag:'
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
