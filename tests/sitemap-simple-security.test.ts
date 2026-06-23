import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { simpleSitemapAndIndex, EnumChangefreq } from '../dist/index.js';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

describe('simpleSitemapAndIndex - Security Tests', () => {
  let targetFolder: string;

  beforeEach(() => {
    targetFolder = mkdtempSync('sitemap-sec-test-');
  });

  afterEach(() => {
    if (targetFolder && existsSync(targetFolder)) {
      rmSync(targetFolder, { recursive: true, force: true });
    }
  });

  describe('hostname validation', () => {
    it('throws on non-http/https hostname', async () => {
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: 'ftp://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
        }),
        { message: /must use http:\/\/ or https:\/\/ protocol/ }
      );
    });

    it('throws on empty hostname', async () => {
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: '',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
        }),
        { message: /must be a non-empty string/ }
      );
    });

    it('throws on hostname with invalid URL', async () => {
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: 'not a valid url',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
        }),
        { message: /must use http:\/\/ or https:\/\/ protocol/ }
      );
    });

    it('throws on hostname exceeding max length', async () => {
      const longHostname = 'https://' + 'a'.repeat(2100) + '.com';
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: longHostname,
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
        }),
        { message: /exceeds maximum length/ }
      );
    });
  });

  describe('sitemapHostname validation', () => {
    it('throws on invalid sitemapHostname', async () => {
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          sitemapHostname: 'javascript:alert(1)',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
        }),
        { message: /must use http:\/\/ or https:\/\/ protocol/ }
      );
    });

    it('accepts valid sitemapHostname different from hostname', async () => {
      await assert.doesNotReject(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          sitemapHostname: 'https://cdn.example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
        })
      );
    });
  });

  describe('destinationDir validation', () => {
    it('throws on absolute destinationDir path', async () => {
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: '/tmp/sitemaps',
          sourceData: ['https://1.example.com/a'],
        }),
        { message: /must be a relative path/ }
      );
    });

    it('throws on path traversal with ../', async () => {
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: '../../../etc/passwd',
          sourceData: ['https://1.example.com/a'],
        }),
        { message: /contains path traversal sequence/ }
      );
    });

    it('throws on path traversal with .. in middle', async () => {
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: './foo/../../../etc',
          sourceData: ['https://1.example.com/a'],
        }),
        { message: /contains path traversal sequence/ }
      );
    });

    it('throws on null byte in path', async () => {
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: './test\0evil',
          sourceData: ['https://1.example.com/a'],
        }),
        { message: /contains null byte character/ }
      );
    });

    it('accepts valid relative paths', async () => {
      const testDir = join(targetFolder, 'valid-subdir');
      await assert.doesNotReject(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: testDir,
          sourceData: ['https://1.example.com/a'],
        })
      );
    });
  });

  describe('publicBasePath validation', () => {
    it('throws on path traversal in publicBasePath', async () => {
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          publicBasePath: '../../../etc/',
          sourceData: ['https://1.example.com/a'],
        }),
        { message: /contains path traversal sequence/ }
      );
    });

    it('throws on null byte in publicBasePath', async () => {
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          publicBasePath: '/test\0evil/',
          sourceData: ['https://1.example.com/a'],
        }),
        { message: /contains null byte character/ }
      );
    });

    it('throws on newline in publicBasePath', async () => {
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          publicBasePath: '/test\n/evil/',
          sourceData: ['https://1.example.com/a'],
        }),
        { message: /contains invalid whitespace characters/ }
      );
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
      assert.strictEqual(publicBasePath, originalPath);
    });
  });

  describe('limit validation', () => {
    it('throws on negative limit', async () => {
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          limit: -1,
        }),
        { message: /must be a number between 1 and 50000/ }
      );
    });

    it('throws on zero limit', async () => {
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          limit: 0,
        }),
        { message: /must be a number between 1 and 50000/ }
      );
    });

    it('throws on limit exceeding max (50000)', async () => {
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          limit: 50001,
        }),
        { message: /must be a number between 1 and 50000/ }
      );
    });

    it('throws on non-integer limit', async () => {
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          limit: 1.5,
        }),
        { message: /must be a number between 1 and 50000/ }
      );
    });

    it('throws on NaN limit', async () => {
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          limit: NaN,
        }),
        { message: /must be a number between 1 and 50000/ }
      );
    });

    it('throws on Infinity limit', async () => {
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          limit: Infinity,
        }),
        { message: /must be a number between 1 and 50000/ }
      );
    });

    it('accepts limit of 1', async () => {
      await assert.doesNotReject(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          limit: 1,
        })
      );
    });

    it('accepts limit of 50000', async () => {
      await assert.doesNotReject(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          limit: 50000,
        })
      );
    });
  });

  describe('xslUrl validation', () => {
    it('throws on non-http/https xslUrl', async () => {
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          xslUrl: 'file:///etc/passwd',
        }),
        { message: /must use http:\/\/ or https:\/\/ protocol/ }
      );
    });

    it('throws on xslUrl with script tag (lowercase)', async () => {
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          xslUrl: 'https://example.com/<script>alert(1)</script>',
        }),
        { message: /contains potentially malicious content/ }
      );
    });

    it('throws on xslUrl with script tag (mixed case)', async () => {
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          xslUrl: 'https://example.com/<ScRiPt>alert(1)</ScRiPt>',
        }),
        { message: /contains potentially malicious content/ }
      );
    });

    it('throws on xslUrl with script tag (uppercase)', async () => {
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          xslUrl: 'https://example.com/<SCRIPT>alert(1)</SCRIPT>',
        }),
        { message: /contains potentially malicious content/ }
      );
    });

    it('throws on xslUrl with URL-encoded script tag', async () => {
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          xslUrl: 'https://example.com/%3cscript%3ealert(1)%3c/script%3e',
        }),
        { message: /contains URL-encoded malicious content/ }
      );
    });

    it('throws on xslUrl with javascript: protocol (lowercase)', async () => {
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          xslUrl: 'javascript:alert(1)',
        }),
        { message: /must use http:\/\/ or https:\/\/ protocol/ }
      );
    });

    it('throws on xslUrl with javascript: protocol (mixed case)', async () => {
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          xslUrl: 'JaVaScRiPt:alert(1)',
        }),
        { message: /must use http:\/\/ or https:\/\/ protocol/ }
      );
    });

    it('throws on xslUrl with data: protocol', async () => {
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          xslUrl: 'https://example.com/data:text/html,alert(1)',
        }),
        { message: /contains dangerous protocol: data:/ }
      );
    });

    it('throws on xslUrl with vbscript: protocol', async () => {
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          xslUrl: 'https://example.com/vbscript:msgbox(1)',
        }),
        { message: /contains dangerous protocol: vbscript:/ }
      );
    });

    it('throws on xslUrl exceeding max length', async () => {
      const longUrl = 'https://' + 'a'.repeat(2100) + '.com/style.xsl';
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          xslUrl: longUrl,
        }),
        { message: /exceeds maximum length/ }
      );
    });

    it('accepts valid xslUrl', async () => {
      await assert.doesNotReject(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
          xslUrl: 'https://example.com/sitemap.xsl',
        })
      );
    });

    it('works without xslUrl (optional parameter)', async () => {
      await assert.doesNotReject(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a'],
        })
      );
    });
  });

  describe('sourceData validation', () => {
    it('throws on invalid sourceData type (object)', async () => {
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          // @ts-expect-error Testing invalid type
          sourceData: { invalid: 'data' },
        }),
        { message: /Invalid sourceData type/ }
      );
    });

    it('throws on invalid sourceData type (number)', async () => {
      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          // @ts-expect-error Testing invalid type
          sourceData: 123,
        }),
        { message: /Invalid sourceData type/ }
      );
    });

    it('accepts array of strings', async () => {
      await assert.doesNotReject(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: targetFolder,
          sourceData: ['https://1.example.com/a', 'https://2.example.com/b'],
        })
      );
    });

    it('accepts array of SitemapItemLoose objects', async () => {
      await assert.doesNotReject(
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
      );
    });
  });

  describe('error context in messages', () => {
    it('provides context when mkdir fails', async () => {
      // Place a regular file where mkdir expects a directory component so that
      // mkdir('…/blocker/subdir', {recursive:true}) throws ENOTDIR
      const blocker = join(targetFolder, 'blocker');
      writeFileSync(blocker, 'x');
      const invalidDir = join(targetFolder, 'blocker', 'subdir');

      await assert.rejects(
        simpleSitemapAndIndex({
          hostname: 'https://example.com',
          destinationDir: invalidDir,
          sourceData: ['https://1.example.com/a'],
        }),
        { message: /Failed to create destination directory/ }
      );
    });
  });
});
