import { simpleSitemapAndIndex } from '../index';
import { existsSync, mkdtempSync, rmSync } from 'fs';

describe('sitemap-simple security', () => {
  describe('destinationDir absolute path rejection (BB-04)', () => {
    it('throws on absolute destinationDir path', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: '/tmp/sitemaps',
          sourceData: ['https://example.com/a'],
        })
      ).rejects.toThrow(/must be a relative path/);
    });

    it('throws on root path /', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: '/',
          sourceData: ['https://example.com/a'],
        })
      ).rejects.toThrow(/must be a relative path/);
    });

    it('throws on path traversal with ../', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: '../../../etc/passwd',
          sourceData: ['https://example.com/a'],
        })
      ).rejects.toThrow(/contains path traversal sequence/);
    });

    it('accepts a relative destinationDir path', async () => {
      const dir = mkdtempSync('sitemap-sec-test-');
      try {
        await expect(
          simpleSitemapAndIndex({
            hostname: 'https://example.com',
            destinationDir: dir,
            sourceData: ['https://example.com/a'],
          })
        ).resolves.toBeUndefined();
      } finally {
        if (existsSync(dir)) {
          rmSync(dir, { recursive: true, force: true });
        }
      }
    });
  });
});
