import { createReadStream } from 'fs';
import { resolve } from 'path';
import { promisify } from 'util';
import { pipeline as pipe, Writable, Readable } from 'stream';
import {
  parseSitemap,
  XMLToSitemapItemStream,
  ObjectStreamToJSON,
} from '../lib/sitemap-parser';
import { SitemapStreamOptions } from '../dist';
import { ErrorLevel, SitemapItem } from '../lib/types';
const pipeline = promisify(pipe);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const normalizedSample = require('./mocks/sampleconfig.normalized.json');
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
