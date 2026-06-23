import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import { promisify } from 'node:util';
import { pipeline as pipe } from 'node:stream';
import {
  parseSitemapIndex,
  XMLToSitemapIndexStream,
} from '../dist/lib/sitemap-index-parser.js';
import { SitemapIndexStream } from '../dist/lib/sitemap-index-stream.js';
import { streamToPromise } from '../dist/lib/sitemap-stream.js';
import { ErrorLevel } from '../dist/lib/types.js';
import type { IndexItem } from '../dist/lib/types.js';
import { InvalidXSLUrlError } from '../dist/lib/errors.js';

const pipeline = promisify(pipe);

describe('Sitemap Index Security', () => {
  describe('Protocol Injection Protection - Parser', () => {
    it('filters javascript: protocol URLs (WARN mode)', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>javascript:alert('XSS')</loc>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap.xml</loc>
  </sitemap>
</sitemapindex>`;

      const readable = Readable.from([xml]);
      const result = await parseSitemapIndex(readable);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].url, 'https://example.com/sitemap.xml');
    });

    it('rejects javascript: protocol in THROW mode', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>javascript:alert('XSS')</loc>
  </sitemap>
</sitemapindex>`;

      const readable = Readable.from([xml]);
      const stream = new XMLToSitemapIndexStream({ level: ErrorLevel.THROW });

      const items: IndexItem[] = [];
      await assert.rejects(
        pipeline(
          readable,
          stream,
          new Writable({
            objectMode: true,
            write(chunk, encoding, callback) {
              items.push(chunk);
              callback();
            },
          })
        )
      );
    });

    it('filters data: protocol URLs', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>data:text/html,&lt;script&gt;alert('XSS')&lt;/script&gt;</loc>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap.xml</loc>
  </sitemap>
</sitemapindex>`;

      const readable = Readable.from([xml]);
      const result = await parseSitemapIndex(readable);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].url, 'https://example.com/sitemap.xml');
    });

    it('filters file: protocol URLs', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>file:///etc/passwd</loc>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap.xml</loc>
  </sitemap>
</sitemapindex>`;

      const readable = Readable.from([xml]);
      const result = await parseSitemapIndex(readable);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].url, 'https://example.com/sitemap.xml');
    });

    it('filters ftp: protocol URLs', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>ftp://example.com/sitemap.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap.xml</loc>
  </sitemap>
</sitemapindex>`;

      const readable = Readable.from([xml]);
      const result = await parseSitemapIndex(readable);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].url, 'https://example.com/sitemap.xml');
    });

    it('accepts valid https: URLs', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap.xml</loc>
  </sitemap>
</sitemapindex>`;

      const readable = Readable.from([xml]);
      const result = await parseSitemapIndex(readable);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].url, 'https://example.com/sitemap.xml');
    });

    it('accepts valid http: URLs', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>http://example.com/sitemap.xml</loc>
  </sitemap>
</sitemapindex>`;

      const readable = Readable.from([xml]);
      const result = await parseSitemapIndex(readable);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].url, 'http://example.com/sitemap.xml');
    });
  });

  describe('Protocol Injection Protection - Stream', () => {
    it('rejects javascript: protocol in SitemapIndexStream', async () => {
      const stream = new SitemapIndexStream({ level: ErrorLevel.THROW });
      const chunks: string[] = [];

      const writable = new Writable({
        write(chunk, encoding, callback) {
          chunks.push(chunk.toString());
          callback();
        },
      });

      stream.pipe(writable);

      const writePromise = new Promise((resolve, reject) => {
        stream.on('error', reject);
        writable.on('error', reject);
        writable.on('finish', resolve);
      });

      stream.write({ url: 'javascript:alert("XSS")' });
      stream.end();

      await assert.rejects(writePromise, /Invalid URL/);
    });

    it('rejects data: protocol in SitemapIndexStream', async () => {
      const stream = new SitemapIndexStream({ level: ErrorLevel.THROW });
      const chunks: string[] = [];

      const writable = new Writable({
        write(chunk, encoding, callback) {
          chunks.push(chunk.toString());
          callback();
        },
      });

      stream.pipe(writable);

      const writePromise = new Promise((resolve, reject) => {
        stream.on('error', reject);
        writable.on('error', reject);
        writable.on('finish', resolve);
      });

      stream.write({ url: 'data:text/html,<script>alert("XSS")</script>' });
      stream.end();

      await assert.rejects(writePromise, /Invalid URL/);
    });
  });

  describe('URL Length Limits', () => {
    it('filters URLs exceeding 2048 characters in parser', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2100);
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${longUrl}</loc>
  </sitemap>
  <sitemap>
    <loc>https://example.com/valid.xml</loc>
  </sitemap>
</sitemapindex>`;

      const readable = Readable.from([xml]);
      const result = await parseSitemapIndex(readable);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].url, 'https://example.com/valid.xml');
    });

    it('rejects URLs exceeding 2048 characters in SitemapIndexStream', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2100);
      const stream = new SitemapIndexStream({ level: ErrorLevel.THROW });
      const chunks: string[] = [];

      const writable = new Writable({
        write(chunk, encoding, callback) {
          chunks.push(chunk.toString());
          callback();
        },
      });

      stream.pipe(writable);

      const writePromise = new Promise((resolve, reject) => {
        stream.on('error', reject);
        writable.on('error', reject);
        writable.on('finish', resolve);
      });

      stream.write({ url: longUrl });
      stream.end();

      await assert.rejects(writePromise, /Invalid URL/);
    });

    it('accepts URLs at the limit (2048 characters)', async () => {
      const pathLength = 2048 - 'https://example.com/'.length;
      const validUrl = 'https://example.com/' + 'a'.repeat(pathLength);
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${validUrl}</loc>
  </sitemap>
</sitemapindex>`;

      const readable = Readable.from([xml]);
      const result = await parseSitemapIndex(readable);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].url, validUrl);
      assert.strictEqual(result[0].url.length, 2048);
    });
  });

  describe('Date Format Validation', () => {
    it('filters invalid date format in parser (WARN mode)', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap.xml</loc>
    <lastmod>not-a-date</lastmod>
  </sitemap>
</sitemapindex>`;

      const readable = Readable.from([xml]);
      const result = await parseSitemapIndex(readable);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].url, 'https://example.com/sitemap.xml');
      assert.strictEqual(result[0].lastmod, undefined);
    });

    it('rejects invalid date format in parser (THROW mode)', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap.xml</loc>
    <lastmod>not-a-date</lastmod>
  </sitemap>
</sitemapindex>`;

      const readable = Readable.from([xml]);
      const stream = new XMLToSitemapIndexStream({ level: ErrorLevel.THROW });

      const items: IndexItem[] = [];
      await assert.rejects(
        pipeline(
          readable,
          stream,
          new Writable({
            objectMode: true,
            write(chunk, encoding, callback) {
              items.push(chunk);
              callback();
            },
          })
        )
      );
    });

    it('accepts valid ISO 8601 dates', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap.xml</loc>
    <lastmod>2023-12-25T10:30:00Z</lastmod>
  </sitemap>
</sitemapindex>`;

      const readable = Readable.from([xml]);
      const result = await parseSitemapIndex(readable);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].url, 'https://example.com/sitemap.xml');
      assert.strictEqual(result[0].lastmod, '2023-12-25T10:30:00Z');
    });

    it('accepts date-only format (YYYY-MM-DD)', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap.xml</loc>
    <lastmod>2023-12-25</lastmod>
  </sitemap>
</sitemapindex>`;

      const readable = Readable.from([xml]);
      const result = await parseSitemapIndex(readable);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].lastmod, '2023-12-25');
    });
  });

  describe('Memory Exhaustion Protection', () => {
    it('rejects sitemap index with too many entries (default limit)', async () => {
      const header = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
      const footer = '</sitemapindex>';
      const entryCount = 50001;

      interface StreamState {
        headerSent?: boolean;
        footerSent?: boolean;
        entryIndex?: number;
      }

      const state: StreamState = {};

      const readable = new Readable({
        read() {
          if (!state.headerSent) {
            state.headerSent = true;
            state.entryIndex = 0;
            this.push(header);
            return;
          }

          if (state.entryIndex! < entryCount) {
            let batch = '';
            const batchSize = 100;
            const end = Math.min(state.entryIndex! + batchSize, entryCount);

            for (let i = state.entryIndex!; i < end; i++) {
              batch += `
  <sitemap>
    <loc>https://example.com/sitemap-${i}.xml</loc>
  </sitemap>`;
            }

            state.entryIndex = end;
            this.push(batch);
            return;
          }

          if (!state.footerSent) {
            state.footerSent = true;
            this.push(footer);
          }

          this.push(null);
        },
      });

      await assert.rejects(
        () => parseSitemapIndex(readable),
        /exceeds maximum allowed entries/
      );
    });

    it('accepts sitemap index within limit', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap-1.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-2.xml</loc>
  </sitemap>
</sitemapindex>`;

      const readable = Readable.from([xml]);
      const result = await parseSitemapIndex(readable);

      assert.strictEqual(result.length, 2);
    });

    it('respects custom maxEntries limit', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap-1.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-2.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-3.xml</loc>
  </sitemap>
</sitemapindex>`;

      const readable = Readable.from([xml]);

      await assert.rejects(
        () => parseSitemapIndex(readable, 2),
        /exceeds maximum allowed entries \(2\)/
      );
    });

    it('immediately destroys streams when maxEntries is exceeded (BB-05)', async () => {
      let i = 0;
      const max = 100000;
      const src = new Readable({
        read() {
          if (i === 0) {
            this.push(
              '<?xml version="1.0"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
            );
            i++;
            return;
          }
          if (i <= max) {
            this.push(`<sitemap><loc>https://e.com/${i}.xml</loc></sitemap>`);
            i++;
            return;
          }
          if (i === max + 1) {
            this.push('</sitemapindex>');
            i++;
            return;
          }
          this.push(null);
        },
      });

      await assert.rejects(
        () => parseSitemapIndex(src, 1),
        /exceeds maximum allowed entries/
      );

      assert.ok(src.destroyed);
      assert.ok(i < max / 2);
    });
  });

  describe('CDATA Handling', () => {
    it('filters invalid URLs in CDATA sections', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc><![CDATA[javascript:alert('XSS')]]></loc>
  </sitemap>
  <sitemap>
    <loc><![CDATA[https://example.com/sitemap.xml]]></loc>
  </sitemap>
</sitemapindex>`;

      const readable = Readable.from([xml]);
      const result = await parseSitemapIndex(readable);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].url, 'https://example.com/sitemap.xml');
    });

    it('accepts valid URLs in CDATA sections', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc><![CDATA[https://example.com/sitemap.xml]]></loc>
  </sitemap>
</sitemapindex>`;

      const readable = Readable.from([xml]);
      const result = await parseSitemapIndex(readable);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].url, 'https://example.com/sitemap.xml');
    });
  });

  describe('Silent Mode', () => {
    it('silently skips invalid URLs in SILENT mode', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>javascript:alert('XSS')</loc>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap.xml</loc>
  </sitemap>
</sitemapindex>`;

      const readable = Readable.from([xml]);
      const stream = new XMLToSitemapIndexStream({ level: ErrorLevel.SILENT });

      const items: IndexItem[] = [];
      await pipeline(
        readable,
        stream,
        new Writable({
          objectMode: true,
          write(chunk, encoding, callback) {
            items.push(chunk);
            callback();
          },
        })
      );

      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0].url, 'https://example.com/sitemap.xml');
    });
  });

  describe('xslUrl validation in SitemapIndexStream', () => {
    it('should accept valid https xslUrl', () => {
      assert.doesNotThrow(
        () =>
          new SitemapIndexStream({ xslUrl: 'https://example.com/style.xsl' })
      );
    });

    it('should accept valid http xslUrl', () => {
      assert.doesNotThrow(
        () => new SitemapIndexStream({ xslUrl: 'http://example.com/style.xsl' })
      );
    });

    it('should reject quote-breakout XML injection payload', () => {
      assert.throws(
        () =>
          new SitemapIndexStream({
            xslUrl: 'https://attacker.test/x.xsl"?><evil>pwned</evil><!--',
          }),
        InvalidXSLUrlError
      );
    });

    it('should reject ftp: protocol in xslUrl', () => {
      assert.throws(
        () => new SitemapIndexStream({ xslUrl: 'ftp://example.com/style.xsl' }),
        InvalidXSLUrlError
      );
    });

    it('should reject javascript: protocol in xslUrl', () => {
      assert.throws(
        () => new SitemapIndexStream({ xslUrl: 'javascript:alert(1)' }),
        InvalidXSLUrlError
      );
    });

    it('should reject data: protocol in xslUrl', () => {
      assert.throws(
        () =>
          new SitemapIndexStream({
            xslUrl: 'data:text/html,<script>alert(1)</script>',
          }),
        InvalidXSLUrlError
      );
    });

    it('should reject file: protocol in xslUrl', () => {
      assert.throws(
        () => new SitemapIndexStream({ xslUrl: 'file:///etc/passwd' }),
        InvalidXSLUrlError
      );
    });

    it('should reject empty xslUrl', () => {
      assert.throws(
        () => new SitemapIndexStream({ xslUrl: '' }),
        InvalidXSLUrlError
      );
    });

    it('should reject xslUrl exceeding max length', () => {
      const longUrl = 'https://' + 'a'.repeat(2048) + '.com/style.xsl';
      assert.throws(
        () => new SitemapIndexStream({ xslUrl: longUrl }),
        InvalidXSLUrlError
      );
    });

    it('should include xslUrl in output when valid', async () => {
      const stream = new SitemapIndexStream({
        xslUrl: 'https://example.com/style.xsl',
      });
      stream.write('https://example.com/sitemap.xml');
      stream.end();
      const result = (await streamToPromise(stream)).toString();
      assert.ok(
        result.includes(
          '<?xml-stylesheet type="text/xsl" href="https://example.com/style.xsl"?>'
        )
      );
    });
  });

  describe('Empty/Malformed URLs', () => {
    it('filters empty URLs', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc></loc>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap.xml</loc>
  </sitemap>
</sitemapindex>`;

      const readable = Readable.from([xml]);
      const result = await parseSitemapIndex(readable);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].url, 'https://example.com/sitemap.xml');
    });

    it('filters malformed URLs', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>not-a-valid-url</loc>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap.xml</loc>
  </sitemap>
</sitemapindex>`;

      const readable = Readable.from([xml]);
      const result = await parseSitemapIndex(readable);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].url, 'https://example.com/sitemap.xml');
    });
  });
});
