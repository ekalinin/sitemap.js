import { tmpdir } from 'os';
import {
  SitemapStream,
  closetag,
  streamToPromise,
} from '../lib/sitemap-stream';
import { createReadStream } from 'fs';
import { resolve } from 'path';

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
    expect((await streamToPromise(sms)).toString()).toBe(
      preamble +
        `<url><loc>${sampleURLs[0]}/</loc></url>` +
        `<url><loc>${sampleURLs[1]}</loc></url>` +
        closetag
    );
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
    expect((await streamToPromise(sms)).toString()).toBe(
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

  it('streamToPromise propagates error on read stream', async () => {
    await expect(
      streamToPromise(
        createReadStream(resolve(tmpdir(), `./does-not-exist-sitemap.xml`))
      )
    ).rejects.toThrow('ENOENT');
  });
});
