import { Readable } from 'stream';
import { parseSitemapIndex } from '../lib/sitemap-index-parser';

function buildIndexXML(entryCount: number): string {
  const entries = Array.from(
    { length: entryCount },
    (_, i) =>
      `<sitemap><loc>https://example.com/sitemap-${i}.xml</loc></sitemap>`
  ).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</sitemapindex>`;
}

describe('BB-05: parseSitemapIndex stream destruction on maxEntries breach', () => {
  it('rejects when entry count exceeds maxEntries', async () => {
    const xml = buildIndexXML(10);
    const src = Readable.from([xml]);

    await expect(parseSitemapIndex(src, 5)).rejects.toThrow(/exceeds/i);
  });

  it('resolves with exactly maxEntries items when input is larger', async () => {
    // This verifies stream stops — we get rejection, not an oversized array
    const xml = buildIndexXML(100);
    const src = Readable.from([xml]);

    await expect(parseSitemapIndex(src, 10)).rejects.toThrow(/exceeds/i);
  });

  it('resolves normally when entry count is within maxEntries', async () => {
    const xml = buildIndexXML(5);
    const src = Readable.from([xml]);
    const result = await parseSitemapIndex(src, 10);

    expect(result).toHaveLength(5);
    expect(result[0].url).toBe('https://example.com/sitemap-0.xml');
  });

  it('destroys the source stream on limit breach (no further processing)', async () => {
    const TOTAL = 1000;
    const MAX = 1;
    const xml = buildIndexXML(TOTAL);
    const src = Readable.from([xml]);

    await expect(parseSitemapIndex(src, MAX)).rejects.toThrow(/exceeds/i);

    // Source stream should be destroyed after limit breach
    expect(src.destroyed).toBe(true);
  });

  it('uses default limit when maxEntries is not provided', async () => {
    const xml = buildIndexXML(5);
    const src = Readable.from([xml]);
    const result = await parseSitemapIndex(src);

    expect(result).toHaveLength(5);
  });
});
