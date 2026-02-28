import { promisify } from 'util';
import { pipeline as pipe, Writable, Readable } from 'stream';
import { XMLToSitemapItemStream } from '../lib/sitemap-parser';
import { LIMITS } from '../lib/constants';
import { SitemapItem } from '../lib/types';

const pipeline = promisify(pipe);

describe('sitemap-parser security', () => {
  describe('URL count hard limit (BB-02)', () => {
    it('stops emitting items after the 50k URL limit', async () => {
      const urls = Array(50010)
        .fill('<url><loc>http://example.com</loc></url>')
        .join('');
      const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

      const sitemap: SitemapItem[] = [];
      const logger = jest.fn();

      await pipeline(
        Readable.from([xml]),
        new XMLToSitemapItemStream({ logger }),
        new Writable({
          objectMode: true,
          write(chunk, _enc, cb) {
            sitemap.push(chunk);
            cb();
          },
        })
      );

      expect(logger).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('exceeds maximum of 50000 URLs')
      );
      // Must not exceed the hard limit
      expect(sitemap.length).toBeLessThanOrEqual(LIMITS.MAX_URL_ENTRIES);
    });
  });

  describe('parser error array memory DoS (BB-03)', () => {
    it('caps stored errors at MAX_PARSER_ERRORS when fed many invalid tags', async () => {
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

      expect(parser.errors.length).toBeLessThanOrEqual(
        LIMITS.MAX_PARSER_ERRORS
      );
      expect(parser.errorCount).toBeGreaterThan(LIMITS.MAX_PARSER_ERRORS);
    });
  });
});
