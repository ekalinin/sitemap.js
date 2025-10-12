import { createReadStream } from 'node:fs';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { pipeline as pipe, Writable, Readable } from 'node:stream';
import {
  parseSitemapIndex,
  XMLToSitemapIndexStream,
  IndexObjectStreamToJSON,
} from '../lib/sitemap-index-parser.js';
import { ErrorLevel, IndexItem } from '../lib/types.js';
const pipeline = promisify(pipe);
import normalizedSample from './mocks/sampleconfig-index.normalized.json';

describe('parseSitemapIndex', () => {
  it('parses xml into index-items', async () => {
    const urls = await parseSitemapIndex(
      createReadStream(resolve(__dirname, './mocks/alltags-index.xml'), {
        encoding: 'utf8',
      })
    );
    expect(urls).toEqual(normalizedSample.sitemaps);
  });

  it('rejects malformed file', async () => {
    await expect(async () =>
      parseSitemapIndex(
        createReadStream(resolve(__dirname, './mocks/index-unescaped-lt.xml'), {
          encoding: 'utf8',
        })
      )
    ).rejects.toThrow();
  });
});

describe('XMLToSitemapIndexItemStream', () => {
  it('stream parses XML', async () => {
    const sitemap: IndexItem[] = [];
    await pipeline(
      createReadStream(resolve(__dirname, './mocks/alltags-index.xml'), {
        encoding: 'utf8',
      }),
      new XMLToSitemapIndexStream(),
      new Writable({
        objectMode: true,
        write(chunk, a, cb): void {
          sitemap.push(chunk);
          cb();
        },
      })
    );
    expect(sitemap).toEqual(normalizedSample.sitemaps);
  });

  it('stream parses bad XML', async () => {
    const sitemap: IndexItem[] = [];
    const logger = jest.fn();
    await pipeline(
      createReadStream(resolve(__dirname, './mocks/bad-tag-index.xml'), {
        encoding: 'utf8',
      }),
      new XMLToSitemapIndexStream({ logger }),
      new Writable({
        objectMode: true,
        write(chunk, a, cb): void {
          sitemap.push(chunk);
          cb();
        },
      })
    );
    expect(sitemap).toEqual(normalizedSample.sitemaps);
    expect(logger.mock.calls.length).toBe(2);
    expect(logger.mock.calls[0][1]).toBe('unhandled tag');
    expect(logger.mock.calls[0][2]).toBe('foo');
  });

  it('stream parses bad XML - silently', async () => {
    const sitemap: IndexItem[] = [];
    const logger = jest.fn();
    await pipeline(
      createReadStream(resolve(__dirname, './mocks/bad-tag-index.xml'), {
        encoding: 'utf8',
      }),
      new XMLToSitemapIndexStream({ logger, level: ErrorLevel.SILENT }),
      new Writable({
        objectMode: true,
        write(chunk, a, cb): void {
          sitemap.push(chunk);
          cb();
        },
      })
    );
    expect(sitemap).toEqual(normalizedSample.sitemaps);
    expect(logger.mock.calls.length).toBe(0);
  });

  it('stream parses XML with cdata', async () => {
    const sitemap: IndexItem[] = [];
    const logger = jest.fn();
    await pipeline(
      createReadStream(resolve(__dirname, './mocks/alltags-index.cdata.xml'), {
        encoding: 'utf8',
      }),
      new XMLToSitemapIndexStream({ logger }),
      new Writable({
        objectMode: true,
        write(chunk, a, cb): void {
          sitemap.push(chunk);
          cb();
        },
      })
    );
    expect(sitemap).toEqual(normalizedSample.sitemaps);
    expect(logger.mock.calls.length).toBe(2);
    expect(logger.mock.calls[0][1]).toBe('unhandled tag');
    expect(logger.mock.calls[0][2]).toBe('foo');
    expect(logger.mock.calls[1][1]).toBe('unhandled cdata for tag:');
    expect(logger.mock.calls[1][2]).toBe('foo');
  });

  it('stream parses XML with cdata - silently', async () => {
    const sitemap: IndexItem[] = [];
    const logger = jest.fn();
    await pipeline(
      createReadStream(resolve(__dirname, './mocks/alltags-index.cdata.xml'), {
        encoding: 'utf8',
      }),
      new XMLToSitemapIndexStream({ logger, level: ErrorLevel.SILENT }),
      new Writable({
        objectMode: true,
        write(chunk, a, cb): void {
          sitemap.push(chunk);
          cb();
        },
      })
    );
    expect(sitemap).toEqual(normalizedSample.sitemaps);
    expect(logger.mock.calls.length).toBe(0);
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
    expect(sitemap).toBe(JSON.stringify(items));
  });
});
