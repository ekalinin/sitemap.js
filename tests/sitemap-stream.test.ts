import { promisify } from 'util';
import { finished, pipeline, Writable } from 'stream';

import {
  SitemapStream,
  closetag,
  streamToPromise,
} from '../lib/sitemap-stream';

const finishedAsync = promisify(finished);

const minimumns =
  '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
const news = ' xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"';
const xhtml = ' xmlns:xhtml="http://www.w3.org/1999/xhtml"';
const image = ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"';
const video = ' xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"';
const preamble = minimumns + news + xhtml + image + video + '>';
describe('sitemap stream', () => {
  const sampleURLs = ['http://example.com', 'http://example.com/path'];

  it('pops out the preamble and closetag', async () => {
    const sms = new SitemapStream();
    sms.write(sampleURLs[0]);
    sms.write(sampleURLs[1]);
    sms.end();
    expect(sms.itemCount).toBe(2);
    const outputStr = (await streamToPromise(sms)).toString();
    expect(sms.byteCount).toBe(outputStr.length);
    expect(outputStr).toBe(
      preamble +
        `<url><loc>${sampleURLs[0]}/</loc></url>` +
        `<url><loc>${sampleURLs[1]}</loc></url>` +
        closetag
    );
  });

  it('emits error on item count would be exceeded', async () => {
    const sms = new SitemapStream({ countLimit: 1 });
    const drain = [];
    const sink = new Writable({
      write(chunk, enc, next): void {
        drain.push(chunk);
        next();
      },
    });

    const pipelineCallback = jest.fn();

    pipeline(sms, sink, pipelineCallback);

    const writeAsync = (
      chunk: any,
      encoding?: BufferEncoding
    ): Promise<boolean> => {
      return new Promise<boolean>((resolve, reject) => {
        const writeReturned = sms.write(chunk, encoding, (error) => {
          if (error !== undefined) {
            reject(error);
          } else {
            resolve(writeReturned);
          }
        });
      });
    };

    // This write will succeed
    await writeAsync(sampleURLs[0]);
    expect(sms.itemCount).toBe(1);
    expect(sms.wroteCloseTag).toBe(false);

    // This write will fail
    await expect(() => writeAsync(sampleURLs[1])).rejects.toThrow(
      'Item count limit would be exceeded, not writing, stream will close'
    );

    // Node 12 hangs on this await, Node 14 fixes it
    if (process.version.split('.')[0] !== 'v12') {
      // This is the signal that the file was closed correctly
      expect(sms.wroteCloseTag).toBe(true);
      expect(sms.destroyed).toBe(true);

      await finishedAsync(sms);
    }

    // Note: we cannot use streamToPromise here because
    // it just hangs in this case - That's probably a problem to fix.
    // const outputStr = (await streamToPromise(sms)).toString();

    // Closing should generate a valid file with contents
    // from before the exception
    const outputStr = Buffer.concat(drain).toString();

    expect(outputStr).toBe(
      preamble + `<url><loc>${sampleURLs[0]}/</loc></url>` + closetag
    );
    expect(sms.byteCount).toBe(outputStr.length);

    expect(pipelineCallback).toBeCalledTimes(1);
  });

  it('throws on byte count would be exceeded', async () => {
    const drain = [];
    const sink = new Writable({
      write(chunk, enc, next): void {
        drain.push(chunk);
        next();
      },
    });

    const pipelineCallback = jest.fn();

    const sms = new SitemapStream({ byteLimit: 400 });

    pipeline(sms, sink, pipelineCallback);

    const writeAsync = (
      chunk: any,
      encoding?: BufferEncoding
    ): Promise<boolean> => {
      return new Promise<boolean>((resolve, reject) => {
        const writeReturned = sms.write(chunk, encoding, (error) => {
          if (error !== undefined) {
            reject(error);
          } else {
            resolve(writeReturned);
          }
        });
      });
    };

    // This write will succeed
    await writeAsync(sampleURLs[0]);
    expect(sms.itemCount).toBe(1);
    expect(sms.byteCount).toBe(375);
    expect(sms.wroteCloseTag).toBe(false);

    await expect(() => writeAsync(sampleURLs[1])).rejects.toThrow(
      'Byte count limit would be exceeded, not writing, stream will close'
    );

    expect(sms.wroteCloseTag).toBe(true);
    expect(sms.destroyed).toBe(true);

    // Node 12 hangs on this await, Node 14 fixes it
    if (process.version.split('.')[0] !== 'v12') {
      await finishedAsync(sms);
    }

    // Closing should generate a valid file after the exception
    const outputStr = Buffer.concat(drain).toString();

    expect(sms.byteCount).toBe(outputStr.length);
    expect(outputStr).toBe(
      preamble + `<url><loc>${sampleURLs[0]}/</loc></url>` + closetag
    );

    expect(pipelineCallback).toBeCalledTimes(1);
  });

  it('pops out custom xmlns', async () => {
    const sms = new SitemapStream({
      xmlns: {
        news: false,
        video: true,
        image: true,
        xhtml: true,
        custom: [
          'xmlns:custom="http://example.com"',
          'xmlns:example="http://o.example.com"',
        ],
      },
    });
    sms.write(sampleURLs[0]);
    sms.write(sampleURLs[1]);
    sms.end();
    await expect((await streamToPromise(sms)).toString()).toBe(
      minimumns +
        xhtml +
        image +
        video +
        ' xmlns:custom="http://example.com" xmlns:example="http://o.example.com"' +
        '>' +
        `<url><loc>${sampleURLs[0]}/</loc></url>` +
        `<url><loc>${sampleURLs[1]}</loc></url>` +
        closetag
    );
  });

  it('normalizes passed in urls', async () => {
    const source = ['/', '/path'];
    const sms = new SitemapStream({ hostname: 'https://example.com/' });
    sms.write(source[0]);
    sms.write(source[1]);
    sms.end();
    expect((await streamToPromise(sms)).toString()).toBe(
      preamble +
        `<url><loc>https://example.com/</loc></url>` +
        `<url><loc>https://example.com/path</loc></url>` +
        closetag
    );
  });

  it('invokes custom errorHandler', async () => {
    const source = [
      { url: '/', changefreq: 'daily' },
      { url: '/path', changefreq: 'invalid' },
    ];
    const errorHandlerMock = jest.fn();
    const sms = new SitemapStream({
      hostname: 'https://example.com/',
      errorHandler: errorHandlerMock,
    });
    sms.write(source[0]);
    sms.write(source[1]);
    sms.end();
    await new Promise((resolve) => sms.on('finish', resolve));
    expect(errorHandlerMock.mock.calls.length).toBe(1);
    expect((await streamToPromise(sms)).toString()).toBe(
      preamble +
        `<url><loc>https://example.com/</loc><changefreq>daily</changefreq></url>` +
        `<url><loc>https://example.com/path</loc><changefreq>invalid</changefreq></url>` +
        closetag
    );
  });
});
