import { Readable } from 'stream';
import { XMLToSitemapItemStream } from '../lib/sitemap-parser';
import { SitemapItem } from '../lib/types';

const MAX_URL_ENTRIES = 50_000;

function buildSitemapXML(urlCount: number): string {
  const urls = Array.from(
    { length: urlCount },
    (_, i) => `<url><loc>https://example.com/page-${i}</loc></url>`
  ).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

describe('BB-02: URL count hard limit in XMLToSitemapItemStream', () => {
  it('stops emitting items after MAX_URL_ENTRIES URLs', (done) => {
    const xml = buildSitemapXML(MAX_URL_ENTRIES + 10);
    const src = Readable.from([xml]);
    const items: SitemapItem[] = [];

    src
      .pipe(new XMLToSitemapItemStream({ logger: false }))
      .on('data', (item: SitemapItem) => items.push(item))
      .on('end', () => {
        expect(items.length).toBeLessThanOrEqual(MAX_URL_ENTRIES);
        done();
      })
      .on('error', done);
  }, 30000);

  it('does not exceed the limit even with a large oversupply', (done) => {
    const xml = buildSitemapXML(MAX_URL_ENTRIES + 500);
    const src = Readable.from([xml]);
    const items: SitemapItem[] = [];

    src
      .pipe(new XMLToSitemapItemStream({ logger: false }))
      .on('data', (item: SitemapItem) => items.push(item))
      .on('end', () => {
        expect(items.length).toBeLessThanOrEqual(MAX_URL_ENTRIES);
        done();
      })
      .on('error', done);
  }, 30000);
});
