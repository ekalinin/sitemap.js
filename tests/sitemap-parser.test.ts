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
const pipeline = promisify(pipe);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const normalizedSample = require('./mocks/sampleconfig.normalized.json');
describe('parseSitemap', () => {
  it('parses xml into sitemap-items', async () => {
    const config = await parseSitemap(
      createReadStream(resolve(__dirname, './mocks/alltags.xml'), {
        encoding: 'utf8',
      })
    );
    expect(config.urls).toEqual(normalizedSample.urls);
  });
});

describe('XMLToISitemapOptions', () => {
  it('stream parses XML', async () => {
    const sitemap: SitemapStreamOptions[] = [];
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
