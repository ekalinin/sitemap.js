import { createReadStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { Readable } from 'node:stream';
import { EmptyStream } from '../lib/errors.js';
import {
  SitemapStream,
  closetag,
  streamToPromise,
} from '../lib/sitemap-stream.js';

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

  it('supports xsi:schemaLocation with xmlns:xsi (README example)', async () => {
    const sms = new SitemapStream({
      xmlns: {
        news: false,
        video: false,
        image: false,
        xhtml: false,
        custom: [
          'xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd"',
          'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
        ],
      },
    });
    sms.write(sampleURLs[0]);
    sms.end();
    const result = (await streamToPromise(sms)).toString();
    expect(result).toContain(
      'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'
    );

    expect(result).toContain(
      'xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd"'
    );
  });

  it('supports other namespace-qualified attributes', async () => {
    const sms = new SitemapStream({
      xmlns: {
        news: false,
        video: false,
        image: false,
        xhtml: false,
        custom: [
          'xmlns:custom="http://example.com/custom"',
          'custom:attr="value123"',
        ],
      },
    });
    sms.write(sampleURLs[0]);
    sms.end();
    const result = (await streamToPromise(sms)).toString();
    expect(result).toContain('xmlns:custom="http://example.com/custom"');
    expect(result).toContain('custom:attr="value123"');
  });

  it('rejects invalid XML attributes (security)', () => {
    const sms = new SitemapStream({
      xmlns: {
        news: false,
        video: false,
        image: false,
        xhtml: false,
        custom: [
          'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
          '<script>alert("xss")</script>',
        ],
      },
    });
    expect(() => {
      sms.write(sampleURLs[0]);
    }).toThrow('Custom namespace contains potentially malicious content');
  });

  it('rejects attributes with angle brackets (security)', () => {
    const sms = new SitemapStream({
      xmlns: {
        news: false,
        video: false,
        image: false,
        xhtml: false,
        custom: ['xsi:attr="<script>alert(1)</script>"'],
      },
    });
    expect(() => {
      sms.write(sampleURLs[0]);
    }).toThrow('Custom namespace contains potentially malicious content');
  });

  it('rejects attributes without colons (security)', () => {
    const sms = new SitemapStream({
      xmlns: {
        news: false,
        video: false,
        image: false,
        xhtml: false,
        custom: ['invalidattr="value"'],
      },
    });
    expect(() => {
      sms.write(sampleURLs[0]);
    }).toThrow('Invalid namespace format');
  });

  it('rejects script tags in custom attributes (security)', () => {
    const sms = new SitemapStream({
      xmlns: {
        news: false,
        video: false,
        image: false,
        xhtml: false,
        custom: ['foo:bar="test<script>alert(1)"'],
      },
    });
    expect(() => {
      sms.write(sampleURLs[0]);
    }).toThrow('Custom namespace contains potentially malicious content');
  });

  it('rejects javascript: URLs in custom attributes (security)', () => {
    const sms = new SitemapStream({
      xmlns: {
        news: false,
        video: false,
        image: false,
        xhtml: false,
        custom: ['xmlns:foo="javascript:alert(1)"'],
      },
    });
    expect(() => {
      sms.write(sampleURLs[0]);
    }).toThrow('Custom namespace contains potentially malicious content');
  });

  it('rejects data:text/html in custom attributes (security)', () => {
    const sms = new SitemapStream({
      xmlns: {
        news: false,
        video: false,
        image: false,
        xhtml: false,
        custom: ['xmlns:foo="data:text/html,<script>alert(1)</script>"'],
      },
    });
    expect(() => {
      sms.write(sampleURLs[0]);
    }).toThrow('Custom namespace contains potentially malicious content');
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

  it('streamToPromise throws EmptyStream error on empty stream', async () => {
    const emptyStream = new Readable();
    emptyStream.push(null); // This makes the stream "empty"

    await expect(streamToPromise(emptyStream)).rejects.toThrow(EmptyStream);
  });

  it('streamToPromise returns concatenated data', async () => {
    const stream = new Readable();
    stream.push('Hello');
    stream.push(' ');
    stream.push('World');
    stream.push('!');
    stream.push(null); // Close the stream

    await expect(streamToPromise(stream)).resolves.toEqual(
      Buffer.from('Hello World!', 'utf-8')
    );
  });
});
