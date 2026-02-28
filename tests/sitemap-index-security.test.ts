import { Readable } from 'stream';
import { parseSitemapIndex } from '../lib/sitemap-index-parser';

describe('sitemap-index-parser security', () => {
  describe('parseSitemapIndex stream resource exhaustion (BB-05)', () => {
    it('rejects when maxEntries is exceeded', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://example.com/sitemap-1.xml</loc></sitemap>
  <sitemap><loc>https://example.com/sitemap-2.xml</loc></sitemap>
  <sitemap><loc>https://example.com/sitemap-3.xml</loc></sitemap>
</sitemapindex>`;

      await expect(parseSitemapIndex(Readable.from([xml]), 2)).rejects.toThrow(
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

      await expect(parseSitemapIndex(src, 1)).rejects.toThrow(
        /exceeds maximum allowed entries/
      );

      // Stream must be destroyed — not fully consumed
      expect(src.destroyed).toBe(true);
      // Counter must be far below max — early teardown, not full traversal
      expect(i).toBeLessThan(max / 2);
    });
  });
});
