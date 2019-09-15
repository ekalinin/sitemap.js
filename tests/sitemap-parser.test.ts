import 'babel-polyfill';
import { createReadStream } from 'fs'
import { resolve } from 'path'
import { promisify } from 'util';
import { pipeline as pipe, Writable, Readable } from 'stream'
import { parseSitemap, XMLToISitemapOptions, ObjectStreamToJSON } from '../lib/sitemap-parser'
import { ISitemapOptions } from '../dist';
const pipeline = promisify(pipe)
const normalizedSample = require('./mocks/sampleconfig.normalized.json')
describe('parseSitemap', () => {
  it('parses xml into sitemap-item-options', async () => {
    const config = await parseSitemap(
      createReadStream(resolve(__dirname, "./mocks/alltags.xml"), {
        encoding: "utf8"
      })
    );
    expect(config.urls).toEqual(normalizedSample.urls);
  })
})

describe('XMLToISitemapOptions', () => {
  it('stream parses XML', async () => {
    let sitemap: ISitemapOptions[] = [];
    await pipeline(
      createReadStream(resolve(__dirname, "./mocks/alltags.xml"), {
        encoding: "utf8"
      }),
      new XMLToISitemapOptions(),
      new Writable({
        objectMode: true,
        write(chunk, a, cb) {
          sitemap.push(chunk);
          cb();
        }
      })
    );
    expect(sitemap).toEqual(normalizedSample.urls);
  })
})

describe('ObjectStreamToJSON', () => {
  it('turns a stream of sitemapItems to string', async () => {
    let sitemap = ''
    const items = [{foo: 'bar'}, {fizz: 'buzz'}]
    let itemsSource = [...items]
    let readable = new Readable({
      objectMode: true,
      read(size) {
        this.push(itemsSource.shift());
        if (!itemsSource.length) {
          this.push(null)
        }
      }
    });
    await pipeline(
      readable,
      new ObjectStreamToJSON(),
      new Writable({
        objectMode: true,
        write(chunk, a, cb) {
          sitemap += chunk;
          cb();
        }
      })
    )
    expect(sitemap).toBe(JSON.stringify(items))
  })
})
