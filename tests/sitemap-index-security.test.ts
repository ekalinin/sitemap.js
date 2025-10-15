import { Readable, Writable } from 'node:stream';
import { promisify } from 'node:util';
import { pipeline as pipe } from 'node:stream';
import {
  parseSitemapIndex,
  XMLToSitemapIndexStream,
} from '../lib/sitemap-index-parser.js';
import { SitemapIndexStream } from '../lib/sitemap-index-stream.js';
import { ErrorLevel, IndexItem } from '../lib/types.js';

const pipeline = promisify(pipe);

/**
 * Security tests for sitemap index parser and stream
 * These tests validate protection against common attacks:
 * - Protocol injection (javascript:, data:, file:)
 * - URL length limits
 * - Invalid date formats
 * - Memory exhaustion attacks
 */
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

      // Invalid URL should be filtered out, only valid URL remains
      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('https://example.com/sitemap.xml');
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
      const parsePromise = pipeline(
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

      await expect(parsePromise).rejects.toThrow();
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

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('https://example.com/sitemap.xml');
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

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('https://example.com/sitemap.xml');
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

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('https://example.com/sitemap.xml');
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

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('https://example.com/sitemap.xml');
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

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('http://example.com/sitemap.xml');
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

      await expect(writePromise).rejects.toThrow(/Invalid URL/);
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

      await expect(writePromise).rejects.toThrow(/Invalid URL/);
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

      // Long URL should be filtered out
      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('https://example.com/valid.xml');
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

      await expect(writePromise).rejects.toThrow(/Invalid URL/);
    });

    it('accepts URLs at the limit (2048 characters)', async () => {
      // Create a URL that's exactly 2048 characters
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

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe(validUrl);
      expect(result[0].url.length).toBe(2048);
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

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('https://example.com/sitemap.xml');
      // Invalid lastmod should not be included
      expect(result[0].lastmod).toBeUndefined();
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
      const parsePromise = pipeline(
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

      await expect(parsePromise).rejects.toThrow();
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

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('https://example.com/sitemap.xml');
      expect(result[0].lastmod).toBe('2023-12-25T10:30:00Z');
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

      expect(result).toHaveLength(1);
      expect(result[0].lastmod).toBe('2023-12-25');
    });
  });

  describe('Memory Exhaustion Protection', () => {
    it('rejects sitemap index with too many entries (default limit)', async () => {
      // Generate XML with 50,001 entries (exceeds default limit of 50,000)
      const header = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
      const footer = '</sitemapindex>';
      const entryCount = 50001;

      // Create a readable stream that generates entries on-the-fly
      interface StreamState {
        headerSent?: boolean;
        footerSent?: boolean;
        entryIndex?: number;
      }

      const state: StreamState = {};

      const readable = new Readable({
        read() {
          // Start with header
          if (!state.headerSent) {
            state.headerSent = true;
            state.entryIndex = 0;
            this.push(header);
            return;
          }

          // Generate entries in batches
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

          // End with footer and signal end of stream
          if (!state.footerSent) {
            state.footerSent = true;
            this.push(footer);
          }

          this.push(null);
        },
      });

      await expect(async () => {
        await parseSitemapIndex(readable);
      }).rejects.toThrow(/exceeds maximum allowed entries/);
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

      expect(result).toHaveLength(2);
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

      // Set limit to 2 entries
      await expect(async () => {
        await parseSitemapIndex(readable, 2);
      }).rejects.toThrow(/exceeds maximum allowed entries \(2\)/);
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

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('https://example.com/sitemap.xml');
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

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('https://example.com/sitemap.xml');
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

      // Should only get valid URL, invalid one silently skipped
      expect(items).toHaveLength(1);
      expect(items[0].url).toBe('https://example.com/sitemap.xml');
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

      // Empty URL should be filtered
      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('https://example.com/sitemap.xml');
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

      // Malformed URL should be filtered
      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('https://example.com/sitemap.xml');
    });
  });
});
