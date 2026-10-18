import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createReadStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { ErrorLevel, parseSitemap, type LinkItem } from '../dist/index.js';
import { EmptyStream } from '../dist/lib/errors.js';
import {
  SitemapStream,
  closetag,
  streamToPromise,
} from '../dist/lib/sitemap-stream.js';

const minimumns =
  '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
const news = ' xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"';
const xhtml = ' xmlns:xhtml="http://www.w3.org/1999/xhtml"';
const image = ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"';
const video = ' xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"';
const preamble = minimumns + news + xhtml + image + video + '>';
// Passes validation at SILENT, but its numeric attribute can't be written
const unserializableVideo = {
  thumbnail_loc: 'https://example.com/t.jpg',
  title: 'Title',
  description: 'Description',
  player_loc: 'https://example.com/player',
  'player_loc:autoplay': 5 as unknown as string,
};

describe('sitemap stream', () => {
  const sampleURLs = ['http://example.com', 'http://example.com/path'];

  it('pops out the preamble and closetag', async () => {
    const sms = new SitemapStream();
    sms.write(sampleURLs[0]);
    sms.write(sampleURLs[1]);
    sms.end();
    assert.strictEqual(
      (await streamToPromise(sms)).toString(),
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
    assert.strictEqual(
      (await streamToPromise(sms)).toString(),
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
    assert.ok(
      result.includes('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"')
    );

    assert.ok(
      result.includes(
        'xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd"'
      )
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
    assert.ok(result.includes('xmlns:custom="http://example.com/custom"'));
    assert.ok(result.includes('custom:attr="value123"'));
  });

  it('rejects invalid XML attributes (security)', () => {
    const create = (): SitemapStream =>
      new SitemapStream({
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
    assert.throws(
      () => {
        create();
      },
      { message: /Custom namespace contains potentially malicious content/ }
    );
  });

  it('rejects attributes with angle brackets (security)', () => {
    const create = (): SitemapStream =>
      new SitemapStream({
        xmlns: {
          news: false,
          video: false,
          image: false,
          xhtml: false,
          custom: ['xsi:attr="<script>alert(1)</script>"'],
        },
      });
    assert.throws(
      () => {
        create();
      },
      { message: /Custom namespace contains potentially malicious content/ }
    );
  });

  it('rejects attributes without colons (security)', () => {
    const create = (): SitemapStream =>
      new SitemapStream({
        xmlns: {
          news: false,
          video: false,
          image: false,
          xhtml: false,
          custom: ['invalidattr="value"'],
        },
      });
    assert.throws(
      () => {
        create();
      },
      { message: /Invalid namespace format/ }
    );
  });

  it('rejects script tags in custom attributes (security)', () => {
    const create = (): SitemapStream =>
      new SitemapStream({
        xmlns: {
          news: false,
          video: false,
          image: false,
          xhtml: false,
          custom: ['foo:bar="test<script>alert(1)"'],
        },
      });
    assert.throws(
      () => {
        create();
      },
      { message: /Custom namespace contains potentially malicious content/ }
    );
  });

  it('rejects javascript: URLs in custom attributes (security)', () => {
    const create = (): SitemapStream =>
      new SitemapStream({
        xmlns: {
          news: false,
          video: false,
          image: false,
          xhtml: false,
          custom: ['xmlns:foo="javascript:alert(1)"'],
        },
      });
    assert.throws(
      () => {
        create();
      },
      { message: /Custom namespace contains potentially malicious content/ }
    );
  });

  it('rejects data:text/html in custom attributes (security)', () => {
    const create = (): SitemapStream =>
      new SitemapStream({
        xmlns: {
          news: false,
          video: false,
          image: false,
          xhtml: false,
          custom: ['xmlns:foo="data:text/html,<script>alert(1)</script>"'],
        },
      });
    assert.throws(
      () => {
        create();
      },
      { message: /Custom namespace contains potentially malicious content/ }
    );
  });

  it('normalizes passed in urls', async () => {
    const source = ['/', '/path'];
    const sms = new SitemapStream({ hostname: 'https://example.com/' });
    sms.write(source[0]);
    sms.write(source[1]);
    sms.end();
    assert.strictEqual(
      (await streamToPromise(sms)).toString(),
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
    const errorHandlerMock = mock.fn();
    const sms = new SitemapStream({
      hostname: 'https://example.com/',
      errorHandler: errorHandlerMock,
    });
    sms.write(source[0]);
    sms.write(source[1]);
    sms.end();
    await new Promise((resolve) => sms.on('finish', resolve));
    assert.strictEqual(errorHandlerMock.mock.callCount(), 1);
    assert.strictEqual(
      (await streamToPromise(sms)).toString(),
      preamble +
        `<url><loc>https://example.com/</loc><changefreq>daily</changefreq></url>` +
        `<url><loc>https://example.com/path</loc><changefreq>invalid</changefreq></url>` +
        closetag
    );
  });

  it('streamToPromise propagates error on read stream', async () => {
    await assert.rejects(
      streamToPromise(
        createReadStream(resolve(tmpdir(), `./does-not-exist-sitemap.xml`))
      ),
      { message: /ENOENT/ }
    );
  });

  it('emits an empty urlset when ended without items', async () => {
    const sms = new SitemapStream({ xslUrl: 'https://example.com/style.xsl' });
    sms.end();
    const xml = (await streamToPromise(sms)).toString();
    assert.ok(xml.startsWith('<?xml'));
    assert.ok(xml.includes('<?xml-stylesheet'));
    assert.ok(xml.includes('<urlset'));
    assert.ok(xml.endsWith('</urlset>'));
    assert.ok(!xml.includes('<url>'));
  });

  it('streamToPromise throws EmptyStream error on empty stream', async () => {
    const emptyStream = new Readable();
    emptyStream.push(null); // This makes the stream "empty"

    await assert.rejects(streamToPromise(emptyStream), EmptyStream);
  });

  it('streamToPromise returns concatenated data', async () => {
    const stream = new Readable();
    stream.push('Hello');
    stream.push(' ');
    stream.push('World');
    stream.push('!');
    stream.push(null); // Close the stream

    assert.deepStrictEqual(
      await streamToPromise(stream),
      Buffer.from('Hello World!', 'utf-8')
    );
  });

  it('rejects an invalid custom namespace at construction', () => {
    assert.throws(
      () =>
        new SitemapStream({
          xmlns: {
            news: false,
            video: false,
            image: false,
            xhtml: false,
            custom: ['<script>'],
          },
        }),
      { message: /Custom namespace contains potentially malicious content/ }
    );
  });

  it('emits an invalid item at ErrorLevel.THROW as a stream error', async () => {
    const sms = new SitemapStream({
      hostname: 'https://example.com',
      level: ErrorLevel.THROW,
    });
    // write() must not throw; the error arrives through the stream
    sms.write({ url: '/a', priority: 2 });
    sms.end();
    await assert.rejects(streamToPromise(sms), {
      name: 'PriorityInvalidError',
    });
  });

  it('emits an item that cannot be serialized as a stream error', async () => {
    const sms = new SitemapStream({
      hostname: 'https://example.com',
      level: ErrorLevel.SILENT,
    });
    sms.write({ url: '/a', video: [unserializableVideo] });
    sms.end();
    await assert.rejects(streamToPromise(sms), {
      message: /attribute "autoplay" value must be a string/,
    });
  });

  describe('alternate link with no lang or hreflang', () => {
    const noLang = { url: '/b' } as unknown as LinkItem;
    const hasLink = (xml: string): boolean => xml.includes('example.com/b');

    it('fails with InvalidLinkHreflang at THROW', async () => {
      const sms = new SitemapStream({
        hostname: 'https://example.com',
        level: ErrorLevel.THROW,
      });
      sms.write({ url: '/a', links: [noLang] });
      sms.end();
      await assert.rejects(streamToPromise(sms), {
        name: 'InvalidLinkHreflang',
      });
    });

    it('warns and drops the link at WARN', async () => {
      const logger = mock.fn();
      const sms = new SitemapStream({
        hostname: 'https://example.com',
        logger,
      });
      sms.write({ url: '/a', links: [noLang] });
      sms.end();
      assert.ok(!hasLink((await streamToPromise(sms)).toString()));
      assert.strictEqual(logger.mock.callCount(), 1);
      assert.match(
        String(logger.mock.calls[0].arguments.join(' ')),
        /needs a lang or hreflang/
      );
    });

    it('drops the link at SILENT', async () => {
      const sms = new SitemapStream({
        hostname: 'https://example.com',
        level: ErrorLevel.SILENT,
      });
      sms.write({ url: '/a', links: [noLang] });
      sms.end();
      assert.ok(!hasLink((await streamToPromise(sms)).toString()));
    });

    it('keeps androidLink intact when parsed back', async () => {
      const sms = new SitemapStream({
        hostname: 'https://example.com',
        logger: false,
      });
      sms.write({
        url: '/a',
        androidLink: 'android-app://com.example/x',
        links: [noLang],
      });
      sms.end();
      const [item] = await parseSitemap(
        Readable.from([(await streamToPromise(sms)).toString()])
      );
      assert.strictEqual(item.androidLink, 'android-app://com.example/x');
      assert.deepStrictEqual(item.links, []);
    });

    it('accepts hreflang in place of lang', async () => {
      const sms = new SitemapStream({
        hostname: 'https://example.com',
        level: ErrorLevel.THROW,
      });
      sms.write({
        url: '/a',
        links: [{ url: '/b', hreflang: 'en-us' } as unknown as LinkItem],
      });
      sms.end();
      assert.match((await streamToPromise(sms)).toString(), /hreflang="en-us"/);
    });
  });

  it('emits an item normalizeURL rejects as a stream error', async () => {
    const sms = new SitemapStream({ hostname: 'https://example.com' });
    sms.write({ url: '/a', lastmod: 'not a date' });
    sms.end();
    await assert.rejects(streamToPromise(sms), {
      message: /Invalid lastmod "not a date"/,
    });
  });

  it('fails a pipeline instead of crashing on an unserializable item', async () => {
    const sms = new SitemapStream({
      hostname: 'https://example.com',
      level: ErrorLevel.SILENT,
    });
    const source = Readable.from([
      { url: '/a' },
      { url: '/b', video: [unserializableVideo] },
    ]);
    await assert.rejects(
      pipeline(source, sms, async function* (chunks) {
        for await (const chunk of chunks) yield chunk;
      }),
      { message: /attribute "autoplay" value must be a string/ }
    );
  });

  describe('priority', () => {
    const write = async (
      priority: unknown,
      opts: { level?: ErrorLevel; fullPrecisionPriority?: boolean } = {}
    ): Promise<string> => {
      const sms = new SitemapStream({
        hostname: 'https://example.com',
        level: opts.level,
        logger: false,
      });
      sms.write({
        url: '/a',
        priority: priority as number,
        fullPrecisionPriority: opts.fullPrecisionPriority,
      });
      sms.end();
      return (await streamToPromise(sms)).toString();
    };

    it('converts a numeric string', async () => {
      assert.match(await write('0.5'), /<priority>0\.5<\/priority>/);
      assert.match(await write(' 1 '), /<priority>1\.0<\/priority>/);
      assert.match(
        await write('0.55', { fullPrecisionPriority: true }),
        /<priority>0\.55<\/priority>/
      );
    });

    it('writes a non-numeric value as given at WARN and SILENT', async () => {
      for (const level of [ErrorLevel.WARN, ErrorLevel.SILENT]) {
        assert.match(
          await write('high', { level }),
          /<priority>high<\/priority>/
        );
      }
    });

    it('warns about a non-numeric value at WARN', async () => {
      const logger = mock.fn();
      const sms = new SitemapStream({
        hostname: 'https://example.com',
        logger,
      });
      sms.write({ url: '/a', priority: 'high' });
      sms.end();
      await streamToPromise(sms);
      assert.strictEqual(logger.mock.callCount(), 1);
      assert.match(
        String(logger.mock.calls[0].arguments.join(' ')),
        /priority "high" must be a number/
      );
    });

    it('accepts plain decimal strings only', async () => {
      for (const [priority, out] of [
        ['1.', '1.0'],
        ['.5', '0.5'],
        ['0', '0.0'],
      ]) {
        assert.match(
          await write(priority, { level: ErrorLevel.THROW }),
          new RegExp(`<priority>${out.replace('.', '\\.')}</priority>`)
        );
      }
    });

    it('rejects a non-numeric or empty value at THROW', async () => {
      for (const priority of [
        'high',
        '',
        ' ',
        'NaN',
        '0.5abc',
        '0x1',
        '0b1',
        '1e-1',
        '-0.5',
        NaN,
      ]) {
        await assert.rejects(write(priority, { level: ErrorLevel.THROW }), {
          name: 'PriorityInvalidError',
        });
      }
    });

    it('still accepts 0', async () => {
      assert.match(
        await write(0, { level: ErrorLevel.THROW }),
        /<priority>0\.0<\/priority>/
      );
    });
  });
});
