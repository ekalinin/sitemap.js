import { simpleSitemapAndIndex, EnumChangefreq } from '../index.js';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { existsSync, unlinkSync } from 'node:fs';

function removeFilesArray(files: string[]): void {
  if (files && files.length) {
    files.forEach(function (file: string) {
      if (existsSync(file)) {
        unlinkSync(file);
      }
    });
  }
}

describe('simpleSitemapAndIndex - Security Tests', () => {
  let targetFolder: string;

  beforeEach(() => {
    targetFolder = tmpdir();
    removeFilesArray([
      resolve(targetFolder, `./sitemap-index.xml.gz`),
      resolve(targetFolder, `./sitemap-0.xml.gz`),
      resolve(targetFolder, `./sitemap-1.xml.gz`),
    ]);
  });

  afterEach(() => {
    removeFilesArray([
      resolve(targetFolder, `./sitemap-index.xml.gz`),
      resolve(targetFolder, `./sitemap-0.xml.gz`),
      resolve(targetFolder, `./sitemap-1.xml.gz`),
    ]);
  });

  describe('hostname validation', () => {
    it('throws on non-http/https hostname', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'ftp://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
        })
      ).rejects.toThrow(/must use http:\/\/ or https:\/\/ protocol/);
    });

    it('throws on empty hostname', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: '',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
        })
      ).rejects.toThrow(/must be a non-empty string/);
    });

    it('throws on hostname with invalid URL', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'not a valid url',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
        })
      ).rejects.toThrow(/must use http:\/\/ or https:\/\/ protocol/);
    });

    it('throws on hostname exceeding max length', async () => {
      const longHostname = 'https://' + 'a'.repeat(2100) + '.com';
      await expect(
        simpleSitemapAndIndex({
          hostname: longHostname,
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
        })
      ).rejects.toThrow(/exceeds maximum length/);
    });
  });

  describe('sitemapHostname validation', () => {
    it('throws on invalid sitemapHostname', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          sitemapHostname: 'javascript:alert(1)',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
        })
      ).rejects.toThrow(/must use http:\/\/ or https:\/\/ protocol/);
    });

    it('accepts valid sitemapHostname different from hostname', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          sitemapHostname: 'https://cdn.example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('destinationDir validation', () => {
    it('throws on path traversal with ../', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: '../../../etc/passwd',
          sourceData: ['https://1.example.com/a'],
        })
      ).rejects.toThrow(/contains path traversal sequence/);
    });

    it('throws on path traversal with .. in middle', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: './foo/../../../etc',
          sourceData: ['https://1.example.com/a'],
        })
      ).rejects.toThrow(/contains path traversal sequence/);
    });

    it('throws on null byte in path', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: './test\0evil',
          sourceData: ['https://1.example.com/a'],
        })
      ).rejects.toThrow(/contains null byte character/);
    });

    it('accepts valid relative paths', async () => {
      const testDir = resolve(targetFolder, './valid-subdir');
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: testDir,
          sourceData: ['https://1.example.com/a'],
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('publicBasePath validation', () => {
    it('throws on path traversal in publicBasePath', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          publicBasePath: '../../../etc/',
          sourceData: ['https://1.example.com/a'],
        })
      ).rejects.toThrow(/contains path traversal sequence/);
    });

    it('throws on null byte in publicBasePath', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          publicBasePath: '/test\0evil/',
          sourceData: ['https://1.example.com/a'],
        })
      ).rejects.toThrow(/contains null byte character/);
    });

    it('throws on newline in publicBasePath', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          publicBasePath: '/test\n/evil/',
          sourceData: ['https://1.example.com/a'],
        })
      ).rejects.toThrow(/contains invalid whitespace characters/);
    });

    it('does not mutate publicBasePath parameter', async () => {
      const publicBasePath = '/foo/bar';
      const originalPath = publicBasePath;
      await simpleSitemapAndIndex({
        hostname: 'https://example.com',
        destinationDir: targetFolder,
        publicBasePath,
        sourceData: ['https://1.example.com/a'],
      });
      expect(publicBasePath).toBe(originalPath);
    });
  });

  describe('limit validation', () => {
    it('throws on negative limit', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          limit: -1,
        })
      ).rejects.toThrow(/must be a number between 1 and 50000/);
    });

    it('throws on zero limit', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          limit: 0,
        })
      ).rejects.toThrow(/must be a number between 1 and 50000/);
    });

    it('throws on limit exceeding max (50000)', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          limit: 50001,
        })
      ).rejects.toThrow(/must be a number between 1 and 50000/);
    });

    it('throws on non-integer limit', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          limit: 1.5,
        })
      ).rejects.toThrow(/must be a number between 1 and 50000/);
    });

    it('throws on NaN limit', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          limit: NaN,
        })
      ).rejects.toThrow(/must be a number between 1 and 50000/);
    });

    it('throws on Infinity limit', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          limit: Infinity,
        })
      ).rejects.toThrow(/must be a number between 1 and 50000/);
    });

    it('accepts limit of 1', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          limit: 1,
        })
      ).resolves.toBeUndefined();
    });

    it('accepts limit of 50000', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          limit: 50000,
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('xslUrl validation', () => {
    it('throws on non-http/https xslUrl', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          xslUrl: 'file:///etc/passwd',
        })
      ).rejects.toThrow(/must use http:\/\/ or https:\/\/ protocol/);
    });

    it('throws on xslUrl with script tag', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          xslUrl: 'https://example.com/<script>alert(1)</script>',
        })
      ).rejects.toThrow(/contains potentially malicious content/);
    });

    it('throws on xslUrl with javascript:', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          xslUrl: 'javascript:alert(1)',
        })
      ).rejects.toThrow(/must use http:\/\/ or https:\/\/ protocol/);
    });

    it('throws on xslUrl exceeding max length', async () => {
      const longUrl = 'https://' + 'a'.repeat(2100) + '.com/style.xsl';
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          xslUrl: longUrl,
        })
      ).rejects.toThrow(/exceeds maximum length/);
    });

    it('accepts valid xslUrl', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          xslUrl: 'https://example.com/sitemap.xsl',
        })
      ).resolves.toBeUndefined();
    });

    it('works without xslUrl (optional parameter)', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('sourceData validation', () => {
    it('throws on invalid sourceData type (object)', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          // @ts-expect-error Testing invalid type
          sourceData: { invalid: 'data' },
        })
      ).rejects.toThrow(/Invalid sourceData type/);
    });

    it('throws on invalid sourceData type (number)', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          // @ts-expect-error Testing invalid type
          sourceData: 123,
        })
      ).rejects.toThrow(/Invalid sourceData type/);
    });

    it('accepts array of strings', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a', 'https://2.example.com/b'],
        })
      ).resolves.toBeUndefined();
    });

    it('accepts array of SitemapItemLoose objects', async () => {
      await expect(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: [
            { url: 'https://1.example.com/a', priority: 0.8 },
            {
              url: 'https://2.example.com/b',
              changefreq: EnumChangefreq.DAILY,
            },
          ],
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('error context in messages', () => {
    it('provides context when mkdir fails', async () => {
      // Use a path that will fail on permission error (platform-specific)
      const invalidDir = '/root/nonexistent-' + Date.now();
      const result = simpleSitemapAndIndex({
        hostname: 'https://example.com',
        destinationDir: invalidDir,
        sourceData: ['https://1.example.com/a'],
      });

      await expect(result).rejects.toThrow(
        /Failed to create destination directory/
      );
    });
  });
});
