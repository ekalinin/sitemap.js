import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import { promisify } from 'node:util';
import { pipeline as pipe } from 'node:stream';
import { XMLToSitemapItemStream } from '../dist/lib/sitemap-parser.js';
import type { SitemapItem } from '../dist/lib/types.js';
import { LIMITS } from '../dist/lib/constants.js';

const pipeline = promisify(pipe);

describe('sitemap-parser security tests', () => {
  describe('URL validation', () => {
    it('should reject URLs exceeding max length', async () => {
      const longUrl = 'http://example.com/' + 'a'.repeat(3000);
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${longUrl}</loc>
  </url>
</urlset>`;

      const sitemap: SitemapItem[] = [];
      const logger = mock.fn();

      await pipeline(
        Readable.from([xml]),
        new XMLToSitemapItemStream({ logger }),
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      assert.strictEqual(logger.mock.calls.length, 1);
      assert.strictEqual(logger.mock.calls[0].arguments[0], 'warn');
      assert.ok(
        (logger.mock.calls[0].arguments[1] as string).includes(
          'URL exceeds max length'
        )
      );
    });

    it('should reject non-http/https URLs', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>javascript:alert(1)</loc>
  </url>
  <url>
    <loc>file:///etc/passwd</loc>
  </url>
</urlset>`;

      const sitemap: SitemapItem[] = [];
      const logger = mock.fn();

      await pipeline(
        Readable.from([xml]),
        new XMLToSitemapItemStream({ logger }),
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      const warnCalls = logger.mock.calls.filter(
        (c: { arguments: unknown[] }) => c.arguments[0] === 'warn'
      );
      assert.ok(
        warnCalls.some((c: { arguments: unknown[] }) =>
          (c.arguments[1] as string).includes('must start with http://')
        )
      );
      assert.notStrictEqual(sitemap[0].url, 'javascript:alert(1)');
      assert.notStrictEqual(sitemap[1].url, 'file:///etc/passwd');
    });
  });

  describe('resource limits', () => {
    it('should limit number of images per URL', async () => {
      const images = Array(1100)
        .fill(
          '<image:image><image:loc>http://example.com/img.jpg</image:loc></image:image>'
        )
        .join('');
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>http://example.com</loc>
    ${images}
  </url>
</urlset>`;

      const sitemap: SitemapItem[] = [];
      const logger = mock.fn();

      await pipeline(
        Readable.from([xml]),
        new XMLToSitemapItemStream({ logger }),
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      const imgWarnCalls = logger.mock.calls.filter(
        (c: { arguments: unknown[] }) => c.arguments[0] === 'warn'
      );
      assert.ok(
        imgWarnCalls.some((c: { arguments: unknown[] }) =>
          (c.arguments[1] as string).includes('too many images')
        )
      );
      assert.ok(sitemap[0].img!.length <= 1000);
    });

    it('should limit number of videos per URL', async () => {
      const videos = Array(150)
        .fill(
          `
        <video:video>
          <video:thumbnail_loc>http://example.com/thumb.jpg</video:thumbnail_loc>
          <video:title>Test</video:title>
          <video:description>Test video</video:description>
        </video:video>
      `
        )
        .join('');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  <url>
    <loc>http://example.com</loc>
    ${videos}
  </url>
</urlset>`;

      const sitemap: SitemapItem[] = [];
      const logger = mock.fn();

      await pipeline(
        Readable.from([xml]),
        new XMLToSitemapItemStream({ logger }),
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      const vidWarnCalls = logger.mock.calls.filter(
        (c: { arguments: unknown[] }) => c.arguments[0] === 'warn'
      );
      assert.ok(
        vidWarnCalls.some((c: { arguments: unknown[] }) =>
          (c.arguments[1] as string).includes('too many videos')
        )
      );
      assert.ok(sitemap[0].video!.length <= 100);
    });

    it('should limit number of tags per video', async () => {
      const tags = Array(50).fill('<video:tag>tag</video:tag>').join('');
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  <url>
    <loc>http://example.com</loc>
    <video:video>
      <video:thumbnail_loc>http://example.com/thumb.jpg</video:thumbnail_loc>
      <video:title>Test</video:title>
      <video:description>Test video</video:description>
      ${tags}
    </video:video>
  </url>
</urlset>`;

      const sitemap: SitemapItem[] = [];
      const logger = mock.fn();

      await pipeline(
        Readable.from([xml]),
        new XMLToSitemapItemStream({ logger }),
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      const tagWarnCalls = logger.mock.calls.filter(
        (c: { arguments: unknown[] }) => c.arguments[0] === 'warn'
      );
      assert.ok(
        tagWarnCalls.some((c: { arguments: unknown[] }) =>
          (c.arguments[1] as string).includes('too many tags')
        )
      );
      assert.ok(sitemap[0].video![0].tag!.length <= 32);
    });
  });

  describe('string length limits', () => {
    it('should limit video title length', async () => {
      const longTitle = 'A'.repeat(200);
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  <url>
    <loc>http://example.com</loc>
    <video:video>
      <video:thumbnail_loc>http://example.com/thumb.jpg</video:thumbnail_loc>
      <video:title>${longTitle}</video:title>
      <video:description>Test</video:description>
    </video:video>
  </url>
</urlset>`;

      const sitemap: SitemapItem[] = [];
      const logger = mock.fn();

      await pipeline(
        Readable.from([xml]),
        new XMLToSitemapItemStream({ logger }),
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      assert.strictEqual(logger.mock.calls.length, 1);
      assert.strictEqual(logger.mock.calls[0].arguments[0], 'warn');
      assert.ok(
        (logger.mock.calls[0].arguments[1] as string).includes(
          'video title exceeds max length'
        )
      );
    });

    it('should limit video description length', async () => {
      const longDesc = 'A'.repeat(3000);
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  <url>
    <loc>http://example.com</loc>
    <video:video>
      <video:thumbnail_loc>http://example.com/thumb.jpg</video:thumbnail_loc>
      <video:title>Test</video:title>
      <video:description>${longDesc}</video:description>
    </video:video>
  </url>
</urlset>`;

      const sitemap: SitemapItem[] = [];
      const logger = mock.fn();

      await pipeline(
        Readable.from([xml]),
        new XMLToSitemapItemStream({ logger }),
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      assert.strictEqual(logger.mock.calls.length, 1);
      assert.strictEqual(logger.mock.calls[0].arguments[0], 'warn');
      assert.ok(
        (logger.mock.calls[0].arguments[1] as string).includes(
          'video description exceeds max length'
        )
      );
    });
  });

  describe('numeric validation', () => {
    it('should reject NaN priority', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>http://example.com</loc>
    <priority>not-a-number</priority>
  </url>
</urlset>`;

      const sitemap: SitemapItem[] = [];
      const logger = mock.fn();

      await pipeline(
        Readable.from([xml]),
        new XMLToSitemapItemStream({ logger }),
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      assert.strictEqual(logger.mock.calls.length, 1);
      assert.strictEqual(logger.mock.calls[0].arguments[0], 'warn');
      assert.ok(
        (logger.mock.calls[0].arguments[1] as string).includes(
          'Invalid priority'
        )
      );
      assert.strictEqual(sitemap[0].priority, undefined);
    });

    it('should reject out-of-range priority', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>http://example.com</loc>
    <priority>5.0</priority>
  </url>
</urlset>`;

      const sitemap: SitemapItem[] = [];
      const logger = mock.fn();

      await pipeline(
        Readable.from([xml]),
        new XMLToSitemapItemStream({ logger }),
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      assert.strictEqual(logger.mock.calls.length, 1);
      assert.strictEqual(logger.mock.calls[0].arguments[0], 'warn');
      assert.ok(
        (logger.mock.calls[0].arguments[1] as string).includes(
          'Invalid priority'
        )
      );
      assert.strictEqual(sitemap[0].priority, undefined);
    });

    it('should reject invalid video duration', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  <url>
    <loc>http://example.com</loc>
    <video:video>
      <video:thumbnail_loc>http://example.com/thumb.jpg</video:thumbnail_loc>
      <video:title>Test</video:title>
      <video:description>Test</video:description>
      <video:duration>-100</video:duration>
    </video:video>
  </url>
</urlset>`;

      const sitemap: SitemapItem[] = [];
      const logger = mock.fn();

      await pipeline(
        Readable.from([xml]),
        new XMLToSitemapItemStream({ logger }),
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      assert.strictEqual(logger.mock.calls.length, 1);
      assert.strictEqual(logger.mock.calls[0].arguments[0], 'warn');
      assert.ok(
        (logger.mock.calls[0].arguments[1] as string).includes(
          'Invalid video duration'
        )
      );
    });

    it('should reject invalid video rating', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  <url>
    <loc>http://example.com</loc>
    <video:video>
      <video:thumbnail_loc>http://example.com/thumb.jpg</video:thumbnail_loc>
      <video:title>Test</video:title>
      <video:description>Test</video:description>
      <video:rating>10.5</video:rating>
    </video:video>
  </url>
</urlset>`;

      const sitemap: SitemapItem[] = [];
      const logger = mock.fn();

      await pipeline(
        Readable.from([xml]),
        new XMLToSitemapItemStream({ logger }),
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      assert.strictEqual(logger.mock.calls.length, 1);
      assert.strictEqual(logger.mock.calls[0].arguments[0], 'warn');
      assert.ok(
        (logger.mock.calls[0].arguments[1] as string).includes(
          'Invalid video rating'
        )
      );
    });
  });

  describe('date validation', () => {
    it('should reject invalid date formats', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>http://example.com</loc>
    <lastmod>not-a-date</lastmod>
  </url>
</urlset>`;

      const sitemap: SitemapItem[] = [];
      const logger = mock.fn();

      await pipeline(
        Readable.from([xml]),
        new XMLToSitemapItemStream({ logger }),
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      assert.strictEqual(logger.mock.calls.length, 1);
      assert.strictEqual(logger.mock.calls[0].arguments[0], 'warn');
      assert.ok(
        (logger.mock.calls[0].arguments[1] as string).includes(
          'Invalid lastmod date format'
        )
      );
    });

    it('should accept valid ISO 8601 dates', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>http://example.com</loc>
    <lastmod>2024-01-15T10:30:00Z</lastmod>
  </url>
</urlset>`;

      const sitemap: SitemapItem[] = [];
      const logger = mock.fn();

      await pipeline(
        Readable.from([xml]),
        new XMLToSitemapItemStream({ logger }),
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      assert.strictEqual(sitemap[0].lastmod, '2024-01-15T10:30:00Z');
    });
  });

  describe('enum validation', () => {
    it('should reject invalid news:access values', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>http://example.com</loc>
    <news:news>
      <news:publication>
        <news:name>Test</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>2024-01-15</news:publication_date>
      <news:title>Test</news:title>
      <news:access>InvalidValue</news:access>
    </news:news>
  </url>
</urlset>`;

      const sitemap: SitemapItem[] = [];
      const logger = mock.fn();

      await pipeline(
        Readable.from([xml]),
        new XMLToSitemapItemStream({ logger }),
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      assert.strictEqual(logger.mock.calls.length, 1);
      assert.strictEqual(logger.mock.calls[0].arguments[0], 'warn');
      assert.ok(
        (logger.mock.calls[0].arguments[1] as string).includes(
          'Invalid news:access value'
        )
      );
    });
  });

  describe('sitemap entry limit', () => {
    // Longer timeout for this test
    it(
      'should warn when exceeding 50k URL entries',
      { timeout: 60000 },
      async () => {
        // Generate a sitemap with more than 50k URLs (just test a few over limit)
        const urls = Array(50010)
          .fill('<url><loc>http://example.com</loc></url>')
          .join('');
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls}
</urlset>`;

        const sitemap: SitemapItem[] = [];
        const logger = mock.fn();

        await pipeline(
          Readable.from([xml]),
          new XMLToSitemapItemStream({ logger }),
          new Writable({
            objectMode: true,
            write(chunk, a, cb): void {
              sitemap.push(chunk);
              cb();
            },
          })
        );

        const errorCalls = logger.mock.calls.filter(
          (c: { arguments: unknown[] }) => c.arguments[0] === 'error'
        );
        assert.ok(
          errorCalls.some((c: { arguments: unknown[] }) =>
            (c.arguments[1] as string).includes('exceeds maximum of 50000 URLs')
          )
        );
        assert.ok(sitemap.length <= LIMITS.MAX_URL_ENTRIES);
      }
    );
  });

  describe('dontpushCurrentLink bug fix', () => {
    it('should correctly handle multiple xhtml:link elements', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>http://example.com</loc>
    <xhtml:link rel="alternate" hreflang="es" href="http://example.com/es"/>
    <xhtml:link rel="amphtml" href="http://example.com/amp"/>
    <xhtml:link rel="alternate" hreflang="fr" href="http://example.com/fr"/>
  </url>
</urlset>`;

      const sitemap: SitemapItem[] = [];

      await pipeline(
        Readable.from([xml]),
        new XMLToSitemapItemStream(),
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      assert.strictEqual(sitemap[0].links!.length, 2);
      assert.strictEqual(sitemap[0].links![0].lang, 'es');
      assert.strictEqual(sitemap[0].links![1].lang, 'fr');
      assert.strictEqual(sitemap[0].ampLink, 'http://example.com/amp');
    });
  });

  describe('error collection', () => {
    it('should collect all errors, not just the first one', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>javascript:alert(1)</loc>
    <priority>99</priority>
    <lastmod>invalid-date</lastmod>
  </url>
</urlset>`;

      const parser = new XMLToSitemapItemStream({ logger: false });
      const sitemap: SitemapItem[] = [];

      await pipeline(
        Readable.from([xml]),
        parser,
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      assert.ok(parser.errors.length > 1);
      assert.ok(
        parser.errors.some((e: Error) =>
          e.message.includes('URL must start with http')
        )
      );

      assert.ok(
        parser.errors.some((e: Error) => e.message.includes('Invalid priority'))
      );

      assert.ok(
        parser.errors.some((e: Error) =>
          e.message.includes('Invalid lastmod date')
        )
      );
    });
  });

  describe('additional edge cases', () => {
    it('should handle valid changefreq values', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>http://example.com</loc>
    <changefreq>daily</changefreq>
  </url>
</urlset>`;

      const sitemap: SitemapItem[] = [];
      await pipeline(
        Readable.from([xml]),
        new XMLToSitemapItemStream(),
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      assert.strictEqual(sitemap[0].changefreq, 'daily');
    });

    it('should handle valid yes/no values', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  <url>
    <loc>http://example.com</loc>
    <video:video>
      <video:thumbnail_loc>http://example.com/thumb.jpg</video:thumbnail_loc>
      <video:title>Test</video:title>
      <video:description>Test</video:description>
      <video:family_friendly>yes</video:family_friendly>
      <video:requires_subscription>no</video:requires_subscription>
      <video:live>YES</video:live>
    </video:video>
  </url>
</urlset>`;

      const sitemap: SitemapItem[] = [];
      await pipeline(
        Readable.from([xml]),
        new XMLToSitemapItemStream(),
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      assert.strictEqual(sitemap[0].video![0].family_friendly, 'yes');
      assert.strictEqual(sitemap[0].video![0].requires_subscription, 'no');
      assert.strictEqual(sitemap[0].video![0].live, 'YES');
    });

    it('should handle Infinity priority', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>http://example.com</loc>
    <priority>Infinity</priority>
  </url>
</urlset>`;

      const logger = mock.fn();
      const sitemap: SitemapItem[] = [];
      await pipeline(
        Readable.from([xml]),
        new XMLToSitemapItemStream({ logger }),
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      assert.strictEqual(logger.mock.calls.length, 1);
      assert.strictEqual(logger.mock.calls[0].arguments[0], 'warn');
      assert.ok(
        (logger.mock.calls[0].arguments[1] as string).includes(
          'Invalid priority'
        )
      );
    });

    it('should handle invalid video duration (too large)', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  <url>
    <loc>http://example.com</loc>
    <video:video>
      <video:thumbnail_loc>http://example.com/thumb.jpg</video:thumbnail_loc>
      <video:title>Test</video:title>
      <video:description>Test</video:description>
      <video:duration>99999</video:duration>
    </video:video>
  </url>
</urlset>`;

      const logger = mock.fn();
      const sitemap: SitemapItem[] = [];
      await pipeline(
        Readable.from([xml]),
        new XMLToSitemapItemStream({ logger }),
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      assert.strictEqual(logger.mock.calls.length, 1);
      assert.strictEqual(logger.mock.calls[0].arguments[0], 'warn');
      assert.ok(
        (logger.mock.calls[0].arguments[1] as string).includes(
          'Invalid video duration'
        )
      );
    });

    it('should validate all date fields', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>http://example.com</loc>
    <video:video>
      <video:thumbnail_loc>http://example.com/thumb.jpg</video:thumbnail_loc>
      <video:title>Test</video:title>
      <video:description>Test</video:description>
      <video:publication_date>invalid</video:publication_date>
      <video:expiration_date>also-invalid</video:expiration_date>
    </video:video>
    <news:news>
      <news:publication>
        <news:name>Test News</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>bad-date</news:publication_date>
      <news:title>Test</news:title>
    </news:news>
  </url>
</urlset>`;

      const logger = mock.fn();
      const sitemap: SitemapItem[] = [];
      await pipeline(
        Readable.from([xml]),
        new XMLToSitemapItemStream({ logger }),
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      const warnCalls = logger.mock.calls.filter(
        (c: { arguments: unknown[] }) => c.arguments[0] === 'warn'
      );
      assert.ok(
        warnCalls.some((c: { arguments: unknown[] }) =>
          (c.arguments[1] as string).includes('publication_date')
        )
      );

      assert.ok(
        warnCalls.some((c: { arguments: unknown[] }) =>
          (c.arguments[1] as string).includes('expiration_date')
        )
      );
    });

    it('should handle links without required attributes gracefully', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>http://example.com</loc>
    <xhtml:link/>
  </url>
</urlset>`;

      const logger = mock.fn();
      const sitemap: SitemapItem[] = [];
      await pipeline(
        Readable.from([xml]),
        new XMLToSitemapItemStream({ logger }),
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      assert.strictEqual(logger.mock.calls.length, 1);
      assert.strictEqual(logger.mock.calls[0].arguments[0], 'warn');
      assert.ok(
        (logger.mock.calls[0].arguments[1] as string).includes(
          'missing required rel or href'
        )
      );
    });

    it('should enforce limits on CDATA content too', async () => {
      const longTitle = 'A'.repeat(200);
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>http://example.com</loc>
    <video:video>
      <video:thumbnail_loc>http://example.com/thumb.jpg</video:thumbnail_loc>
      <video:title><![CDATA[${longTitle}]]></video:title>
      <video:description><![CDATA[Test]]></video:description>
    </video:video>
    <news:news>
      <news:publication>
        <news:name><![CDATA[Example News]]></news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>2024-01-15</news:publication_date>
      <news:title><![CDATA[Title]]></news:title>
    </news:news>
  </url>
</urlset>`;

      const logger = mock.fn();
      const sitemap: SitemapItem[] = [];
      await pipeline(
        Readable.from([xml]),
        new XMLToSitemapItemStream({ logger }),
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      assert.strictEqual(logger.mock.calls.length, 1);
      assert.strictEqual(logger.mock.calls[0].arguments[0], 'warn');
      assert.ok(
        (logger.mock.calls[0].arguments[1] as string).includes(
          'video title exceeds max length'
        )
      );
    });

    it('should handle all video and image optional fields', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>http://example.com</loc>
    <video:video>
      <video:thumbnail_loc>http://example.com/thumb.jpg</video:thumbnail_loc>
      <video:title>Test</video:title>
      <video:description>Test</video:description>
      <video:player_loc>http://example.com/player</video:player_loc>
      <video:content_loc>http://example.com/content.mp4</video:content_loc>
      <video:id>video123</video:id>
      <video:restriction>US CA</video:restriction>
      <video:uploader>John Doe</video:uploader>
      <video:platform>web mobile</video:platform>
      <video:price>9.99</video:price>
      <video:category>Sports</video:category>
      <video:gallery_loc>http://example.com/gallery</video:gallery_loc>
    </video:video>
    <image:image>
      <image:loc>http://example.com/img.jpg</image:loc>
      <image:geo_location>Los Angeles, CA</image:geo_location>
      <image:license>http://example.com/license</image:license>
    </image:image>
  </url>
</urlset>`;

      const sitemap: SitemapItem[] = [];
      await pipeline(
        Readable.from([xml]),
        new XMLToSitemapItemStream(),
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      assert.strictEqual(
        sitemap[0].video![0].player_loc,
        'http://example.com/player'
      );

      assert.strictEqual(
        sitemap[0].video![0].content_loc,
        'http://example.com/content.mp4'
      );
      assert.strictEqual(sitemap[0].video![0].id, 'video123');
      assert.strictEqual(sitemap[0].video![0].restriction, 'US CA');
      assert.strictEqual(sitemap[0].video![0].uploader, 'John Doe');
      assert.strictEqual(sitemap[0].video![0].platform, 'web mobile');
      assert.strictEqual(sitemap[0].video![0].price, '9.99');
      assert.strictEqual(sitemap[0].video![0].category, 'Sports');
      assert.strictEqual(
        sitemap[0].video![0].gallery_loc,
        'http://example.com/gallery'
      );
      assert.strictEqual(sitemap[0].img![0].geoLocation, 'Los Angeles, CA');
      assert.strictEqual(
        sitemap[0].img![0].license,
        'http://example.com/license'
      );
    });

    it('should handle news with all fields', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>http://example.com</loc>
    <news:news>
      <news:publication>
        <news:name>Example News</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>2024-01-15</news:publication_date>
      <news:title>Breaking News</news:title>
      <news:access>Registration</news:access>
      <news:genres>Blog, Opinion</news:genres>
      <news:keywords>news, breaking, update</news:keywords>
      <news:stock_tickers>NASDAQ:AAPL, NYSE:GOOGL</news:stock_tickers>
    </news:news>
  </url>
</urlset>`;

      const sitemap: SitemapItem[] = [];
      await pipeline(
        Readable.from([xml]),
        new XMLToSitemapItemStream(),
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      assert.strictEqual(sitemap[0].news?.access, 'Registration');
      assert.strictEqual(sitemap[0].news?.genres, 'Blog, Opinion');
      assert.strictEqual(sitemap[0].news?.keywords, 'news, breaking, update');
      assert.strictEqual(
        sitemap[0].news?.stock_tickers,
        'NASDAQ:AAPL, NYSE:GOOGL'
      );
    });

    it('should handle mobile:mobile tag', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0">
  <url>
    <loc>http://example.com</loc>
    <mobile:mobile/>
  </url>
</urlset>`;

      const sitemap: SitemapItem[] = [];
      await pipeline(
        Readable.from([xml]),
        new XMLToSitemapItemStream(),
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      assert.strictEqual(sitemap[0].url, 'http://example.com');
    });

    it('should handle oversized image caption on first chunk', async () => {
      const longCaption = 'A'.repeat(600);
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>http://example.com</loc>
    <image:image>
      <image:loc>http://example.com/img.jpg</image:loc>
      <image:caption>${longCaption}</image:caption>
    </image:image>
  </url>
</urlset>`;

      const logger = mock.fn();
      const sitemap: SitemapItem[] = [];
      await pipeline(
        Readable.from([xml]),
        new XMLToSitemapItemStream({ logger }),
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      assert.strictEqual(logger.mock.calls.length, 1);
      assert.strictEqual(logger.mock.calls[0].arguments[0], 'warn');
      assert.ok(
        (logger.mock.calls[0].arguments[1] as string).includes(
          'image caption exceeds max length'
        )
      );
      assert.ok(sitemap[0].img![0].caption!.length <= 512);
    });

    it('should handle oversized image title on first chunk', async () => {
      const longTitle = 'T'.repeat(600);
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>http://example.com</loc>
    <image:image>
      <image:loc>http://example.com/img.jpg</image:loc>
      <image:title>${longTitle}</image:title>
    </image:image>
  </url>
</urlset>`;

      const logger = mock.fn();
      const sitemap: SitemapItem[] = [];
      await pipeline(
        Readable.from([xml]),
        new XMLToSitemapItemStream({ logger }),
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      assert.strictEqual(logger.mock.calls.length, 1);
      assert.strictEqual(logger.mock.calls[0].arguments[0], 'warn');
      assert.ok(
        (logger.mock.calls[0].arguments[1] as string).includes(
          'image title exceeds max length'
        )
      );
      assert.ok(sitemap[0].img![0].title!.length <= 512);
    });

    it('should handle video attributes', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  <url>
    <loc>http://example.com</loc>
    <video:video>
      <video:thumbnail_loc>http://example.com/thumb.jpg</video:thumbnail_loc>
      <video:title>Test</video:title>
      <video:description>Test</video:description>
      <video:player_loc autoplay="yes" allow_embed="no">http://example.com/player</video:player_loc>
      <video:restriction relationship="deny">US</video:restriction>
      <video:platform relationship="allow">web mobile</video:platform>
      <video:price currency="USD" resolution="HD" type="rent">9.99</video:price>
      <video:uploader info="http://example.com/uploader">John Doe</video:uploader>
      <video:gallery_loc title="Gallery">http://example.com/gallery</video:gallery_loc>
    </video:video>
  </url>
</urlset>`;

      const sitemap: SitemapItem[] = [];
      await pipeline(
        Readable.from([xml]),
        new XMLToSitemapItemStream(),
        new Writable({
          objectMode: true,
          write(chunk, a, cb): void {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      const video = sitemap[0].video![0];
      assert.strictEqual(video['player_loc:autoplay'], 'yes');
      assert.strictEqual(video['player_loc:allow_embed'], 'no');
      assert.strictEqual(video['restriction:relationship'], 'deny');
      assert.strictEqual(video['platform:relationship'], 'allow');
      assert.strictEqual(video['price:currency'], 'USD');
      assert.strictEqual(video['price:type'], 'rent');
      assert.strictEqual(video['price:resolution'], 'HD');
      assert.strictEqual(video['uploader:info'], 'http://example.com/uploader');
      assert.strictEqual(video['gallery_loc:title'], 'Gallery');
    });
  });

  describe('memory DoS prevention', () => {
    it('caps stored errors to prevent memory DoS (BB-03)', async () => {
      const n = 5000;
      const junk = Array.from(
        { length: n },
        (_, i) => `<evil${i}>x</evil${i}>`
      ).join('');
      const xml = `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${junk}</urlset>`;

      const parser = new XMLToSitemapItemStream({ logger: false });
      await pipeline(
        Readable.from([xml]),
        parser,
        new Writable({
          objectMode: true,
          write(_chunk, _enc, cb) {
            cb();
          },
        })
      );

      assert.ok(parser.errors.length <= LIMITS.MAX_PARSER_ERRORS);
      assert.ok(parser.errorCount > LIMITS.MAX_PARSER_ERRORS);
    });
  });
});
