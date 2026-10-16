import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import {
  simpleSitemapAndIndex,
  SitemapStream,
  SitemapIndexStream,
  streamToPromise,
  ErrorLevel,
  type SitemapItemLoose,
} from '../dist/index.js';

// changefreq is deliberately invalid, so cast past the type check
const invalidItem = {
  url: 'https://example.com/',
  changefreq: 'sometimes',
} as unknown as SitemapItemLoose;

describe('logger option', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it('SitemapStream sends validation warnings to the logger, not the console', async () => {
    const consoleWarn = mock.method(console, 'warn', () => undefined);
    const logger = mock.fn();
    const sms = new SitemapStream({ logger });
    sms.write(invalidItem);
    sms.end();
    await streamToPromise(sms);

    assert.strictEqual(logger.mock.callCount(), 1);
    assert.strictEqual(logger.mock.calls[0].arguments[0], 'warn');
    assert.strictEqual(
      logger.mock.calls[0].arguments[1],
      'ChangeFreqInvalidError'
    );
    assert.strictEqual(consoleWarn.mock.callCount(), 0);
  });

  it('SitemapStream routes invalid news attributes through the logger', async () => {
    const logger = mock.fn();
    const sms = new SitemapStream({ logger });
    sms.write({
      url: 'https://example.com/',
      news: {
        publication: { name: 'Example', language: 'en' },
        publication_date: '2024-01-01',
        title: 'Title',
        access: 'Registration',
        genres: 'NotAGenre',
      },
    });
    sms.end();
    await streamToPromise(sms);

    const attrWarning = logger.mock.calls.find(
      (c) => c.arguments[1] === 'InvalidAttrValue'
    );
    assert.ok(attrWarning);
    assert.match(attrWarning.arguments[2], /^https:\/\/example\.com\/: /);
  });

  it('SitemapStream uses a logger assigned after construction', async () => {
    const consoleWarn = mock.method(console, 'warn', () => undefined);
    const logger = mock.fn();
    const sms = new SitemapStream();
    sms.logger = logger;
    sms.write(invalidItem);
    sms.end();
    await streamToPromise(sms);

    assert.strictEqual(logger.mock.callCount(), 1);
    assert.strictEqual(consoleWarn.mock.callCount(), 0);
  });

  it('SitemapStream logs nothing when logger is false', async () => {
    const consoleWarn = mock.method(console, 'warn', () => undefined);
    const sms = new SitemapStream({ logger: false });
    sms.write(invalidItem);
    sms.end();
    await streamToPromise(sms);

    assert.strictEqual(consoleWarn.mock.callCount(), 0);
  });

  it('SitemapStream still throws at ErrorLevel.THROW with a logger', async () => {
    const logger = mock.fn();
    const sms = new SitemapStream({ logger, level: ErrorLevel.THROW });
    assert.throws(
      () => sms._transform(invalidItem, 'utf8', () => undefined),
      /changefreq/
    );
    assert.strictEqual(logger.mock.callCount(), 0);
  });

  it('SitemapStream prefers an explicit errorHandler over the logger', async () => {
    const logger = mock.fn();
    const errorHandler = mock.fn();
    const sms = new SitemapStream({ logger, errorHandler });
    sms.write(invalidItem);
    sms.end();
    await streamToPromise(sms);

    assert.strictEqual(errorHandler.mock.callCount(), 1);
    assert.strictEqual(logger.mock.callCount(), 0);
  });

  it('SitemapIndexStream sends invalid-item warnings to the logger', async () => {
    const consoleWarn = mock.method(console, 'warn', () => undefined);
    const logger = mock.fn();
    const smis = new SitemapIndexStream({ logger });
    smis.write('javascript:alert(1)');
    smis.write('https://example.com/sitemap.xml');
    smis.end();
    const xml = (await streamToPromise(smis)).toString();

    assert.ok(xml.includes('https://example.com/sitemap.xml'));
    assert.strictEqual(logger.mock.callCount(), 1);
    assert.strictEqual(logger.mock.calls[0].arguments[0], 'warn');
    assert.match(
      String(logger.mock.calls[0].arguments[1]),
      /Invalid URL in sitemap index/
    );
    assert.strictEqual(consoleWarn.mock.callCount(), 0);
  });

  it('SitemapStream honors a level changed after construction', async () => {
    const logger = mock.fn();
    const sms = new SitemapStream({ logger, level: ErrorLevel.SILENT });
    sms.level = ErrorLevel.WARN;
    sms.write(invalidItem);
    sms.end();
    await streamToPromise(sms);

    assert.strictEqual(logger.mock.callCount(), 1);
  });

  it('SitemapStream stays silent when level is changed to SILENT', async () => {
    const logger = mock.fn();
    const sms = new SitemapStream({ logger });
    sms.level = ErrorLevel.SILENT;
    sms.write(invalidItem);
    sms.end();
    await streamToPromise(sms);

    assert.strictEqual(logger.mock.callCount(), 0);
  });

  it('SitemapIndexStream honors a level changed after construction', async () => {
    const logger = mock.fn();
    const smis = new SitemapIndexStream({ logger });
    smis.level = ErrorLevel.SILENT;
    smis.write('javascript:alert(1)');
    smis.level = ErrorLevel.WARN;
    smis.write('javascript:alert(2)');
    smis.end();
    await streamToPromise(smis);

    assert.strictEqual(logger.mock.callCount(), 1);
  });

  it('SitemapIndexStream logs nothing at ErrorLevel.SILENT', async () => {
    const logger = mock.fn();
    const smis = new SitemapIndexStream({ logger, level: ErrorLevel.SILENT });
    smis.write('javascript:alert(1)');
    smis.end();
    await streamToPromise(smis);

    assert.strictEqual(logger.mock.callCount(), 0);
  });
});

describe('logger option, more paths', () => {
  it('simpleSitemapAndIndex forwards logger to the sitemap and index streams', async () => {
    const dir = mkdtempSync('logger-test-');
    const logger = mock.fn();
    try {
      await simpleSitemapAndIndex({
        hostname: 'https://example.com',
        destinationDir: dir,
        sourceData: [invalidItem],
        gzip: false,
        logger,
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    assert.ok(
      logger.mock.calls.some((c) => c.arguments[1] === 'ChangeFreqInvalidError')
    );
  });

  it('SitemapStream routes invalid video attributes through the logger', async () => {
    const logger = mock.fn();
    const sms = new SitemapStream({ logger });
    sms.write({
      url: 'https://example.com/',
      video: [
        {
          title: 't',
          description: 'd',
          thumbnail_loc: 'https://example.com/t.jpg',
          content_loc: 'https://example.com/v.mp4',
          restriction: 'us',
          'restriction:relationship': 'allow',
        },
      ],
    } as unknown as SitemapItemLoose);
    sms.end();
    await streamToPromise(sms);
    assert.ok(logger.mock.callCount() >= 1);
  });

  it('THROW passes invalid news attributes to a custom errorHandler, like other validation errors', () => {
    const errorHandler = mock.fn();
    const sms = new SitemapStream({ level: ErrorLevel.THROW, errorHandler });
    assert.doesNotThrow(() =>
      sms._transform(
        {
          url: 'https://example.com/',
          news: {
            publication: { name: 'Example', language: 'en' },
            publication_date: '2024-01-01',
            title: 'Title',
            genres: 'NotAGenre',
          },
        },
        'utf8',
        () => undefined
      )
    );
    const call = errorHandler.mock.calls.find(
      (c) => (c.arguments[0] as Error).name === 'InvalidAttrValue'
    );
    assert.ok(call);
    assert.strictEqual(call.arguments[1], ErrorLevel.THROW);
  });

  it('THROW still throws for invalid news attributes with the default errorHandler', () => {
    const sms = new SitemapStream({ level: ErrorLevel.THROW });
    assert.throws(
      () =>
        sms._transform(
          {
            url: 'https://example.com/',
            news: {
              publication: { name: 'Example', language: 'en' },
              publication_date: '2024-01-01',
              title: 'Title',
              genres: 'NotAGenre',
            },
          },
          'utf8',
          () => undefined
        ),
      /not a valid value for attr/
    );
  });
});

describe('SitemapStream xmlns property', () => {
  it('exposes the namespace options as xmlns, matching the option name', () => {
    const xmlns = { news: false, xhtml: true, image: false, video: false };
    const sms = new SitemapStream({ xmlns });
    assert.deepStrictEqual(sms.xmlns, xmlns);
    // deprecated alias still works
    assert.strictEqual(sms.xmlNS, sms.xmlns);
  });
});
