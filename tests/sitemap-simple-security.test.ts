import { simpleSitemapAndIndex } from '../index';
import { mkdtempSync, rmSync } from 'fs';

describe('BB-04: Reject absolute destinationDir paths', () => {
  let targetFolder: string;

  beforeEach(() => {
    targetFolder = mkdtempSync('sitemap-sec-test-');
  });

  afterEach(() => {
    rmSync(targetFolder, { recursive: true, force: true });
  });

  it('throws when destinationDir is an absolute path like /tmp/sitemaps', async () => {
    await expect(
      simpleSitemapAndIndex({
        hostname: 'https://example.com',
        sourceData: ['https://example.com/page'],
        destinationDir: '/tmp/sitemaps',
      })
    ).rejects.toThrow(/absolute/i);
  });

  it('throws when destinationDir is the root path /', async () => {
    await expect(
      simpleSitemapAndIndex({
        hostname: 'https://example.com',
        sourceData: ['https://example.com/page'],
        destinationDir: '/',
      })
    ).rejects.toThrow(/absolute/i);
  });

  it('throws when destinationDir is a home-relative absolute path', async () => {
    await expect(
      simpleSitemapAndIndex({
        hostname: 'https://example.com',
        sourceData: ['https://example.com/page'],
        destinationDir: '/home/user/sitemaps',
      })
    ).rejects.toThrow(/absolute/i);
  });

  it('accepts a relative destinationDir', async () => {
    await expect(
      simpleSitemapAndIndex({
        hostname: 'https://example.com',
        sourceData: ['https://example.com/page'],
        destinationDir: targetFolder,
        gzip: false,
      })
    ).resolves.toBeUndefined();
  });
});
