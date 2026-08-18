import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SitemapStream, streamToPromise } from '../dist/lib/sitemap-stream.js';
import {
  InvalidHostnameError,
  InvalidXSLUrlError,
} from '../dist/lib/errors.js';

describe('sitemap-stream security', () => {
  describe('hostname validation', () => {
    it('should accept valid http hostname', () => {
      assert.doesNotThrow(
        () => new SitemapStream({ hostname: 'http://example.com' })
      );
    });

    it('should accept valid https hostname', () => {
      assert.doesNotThrow(
        () => new SitemapStream({ hostname: 'https://example.com' })
      );
    });

    it('should accept hostname with port', () => {
      assert.doesNotThrow(
        () => new SitemapStream({ hostname: 'https://example.com:8080' })
      );
    });

    it('should accept hostname with path', () => {
      assert.doesNotThrow(
        () => new SitemapStream({ hostname: 'https://example.com/path' })
      );
    });

    it('should reject non-http(s) protocol', () => {
      assert.throws(
        () => new SitemapStream({ hostname: 'ftp://example.com' }),
        InvalidHostnameError
      );
    });

    it('should reject javascript: protocol', () => {
      assert.throws(
        () => new SitemapStream({ hostname: 'javascript:alert(1)' }),
        InvalidHostnameError
      );
    });

    it('should reject data: protocol', () => {
      assert.throws(
        () =>
          new SitemapStream({
            hostname: 'data:text/html,<script>alert(1)</script>',
          }),
        InvalidHostnameError
      );
    });

    it('should reject file: protocol', () => {
      assert.throws(
        () => new SitemapStream({ hostname: 'file:///etc/passwd' }),
        InvalidHostnameError
      );
    });

    it('should reject malformed URL', () => {
      assert.throws(
        () => new SitemapStream({ hostname: 'not a url' }),
        InvalidHostnameError
      );
    });

    it('should reject empty hostname', () => {
      assert.throws(
        () => new SitemapStream({ hostname: '' }),
        InvalidHostnameError
      );
    });

    it('should reject hostname exceeding max length', () => {
      const longUrl = 'https://' + 'a'.repeat(2048) + '.com';
      assert.throws(
        () => new SitemapStream({ hostname: longUrl }),
        InvalidHostnameError
      );
    });

    it('should accept hostname at max length', () => {
      // 2048 - 8 for 'https://' = 2040 characters
      const maxUrl = 'https://' + 'a'.repeat(2033) + '.com';
      assert.doesNotThrow(() => new SitemapStream({ hostname: maxUrl }));
    });
  });

  describe('xslUrl validation', () => {
    it('should accept valid http xslUrl', () => {
      assert.doesNotThrow(
        () => new SitemapStream({ xslUrl: 'http://example.com/style.xsl' })
      );
    });

    it('should accept valid https xslUrl', () => {
      assert.doesNotThrow(
        () => new SitemapStream({ xslUrl: 'https://example.com/style.xsl' })
      );
    });

    it('should reject non-http(s) xslUrl', () => {
      assert.throws(
        () => new SitemapStream({ xslUrl: 'ftp://example.com/style.xsl' }),
        InvalidXSLUrlError
      );
    });

    it('should reject javascript: in xslUrl', () => {
      assert.throws(
        () => new SitemapStream({ xslUrl: 'javascript:alert(1)' }),
        InvalidXSLUrlError
      );
    });

    it('should reject xslUrl with <script tag', () => {
      assert.throws(
        () =>
          new SitemapStream({
            xslUrl: 'http://example.com/<script>alert(1)</script>',
          }),
        InvalidXSLUrlError
      );
    });

    it('should reject data: protocol in xslUrl', () => {
      assert.throws(
        () =>
          new SitemapStream({
            xslUrl: 'data:text/html,<script>alert(1)</script>',
          }),
        InvalidXSLUrlError
      );
    });

    it('should reject file: protocol in xslUrl', () => {
      assert.throws(
        () => new SitemapStream({ xslUrl: 'file:///etc/passwd' }),
        InvalidXSLUrlError
      );
    });

    it('should reject malformed xslUrl', () => {
      assert.throws(
        () => new SitemapStream({ xslUrl: 'not a url' }),
        InvalidXSLUrlError
      );
    });

    it('should reject empty xslUrl', () => {
      assert.throws(
        () => new SitemapStream({ xslUrl: '' }),
        InvalidXSLUrlError
      );
    });

    it('should reject xslUrl exceeding max length', () => {
      const longUrl = 'https://' + 'a'.repeat(2048) + '.com/style.xsl';
      assert.throws(
        () => new SitemapStream({ xslUrl: longUrl }),
        InvalidXSLUrlError
      );
    });

    it('should include xslUrl in output when valid', async () => {
      const stream = new SitemapStream({
        xslUrl: 'https://example.com/style.xsl',
      });
      stream.write('https://example.com/page');
      stream.end();
      const result = (await streamToPromise(stream)).toString();
      assert.ok(
        result.includes(
          '<?xml-stylesheet type="text/xsl" href="https://example.com/style.xsl"?>'
        )
      );
    });
  });

  describe('custom namespace validation', () => {
    it('should accept valid custom namespace', async () => {
      const stream = new SitemapStream({
        xmlns: {
          news: false,
          video: false,
          image: false,
          xhtml: false,
          custom: ['xmlns:custom="http://example.com/custom"'],
        },
      });
      stream.write('https://example.com/page');
      stream.end();
      const result = (await streamToPromise(stream)).toString();
      assert.ok(result.includes('xmlns:custom="http://example.com/custom"'));
    });

    it('should accept multiple valid custom namespaces', async () => {
      const stream = new SitemapStream({
        xmlns: {
          news: false,
          video: false,
          image: false,
          xhtml: false,
          custom: [
            'xmlns:custom="http://example.com/custom"',
            'xmlns:other="http://example.com/other"',
          ],
        },
      });
      stream.write('https://example.com/page');
      stream.end();
      const result = (await streamToPromise(stream)).toString();
      assert.ok(result.includes('xmlns:custom="http://example.com/custom"'));
      assert.ok(result.includes('xmlns:other="http://example.com/other"'));
    });

    it('should reject custom namespace with <script tag', () => {
      assert.throws(
        () => {
          const stream = new SitemapStream({
            xmlns: {
              news: false,
              video: false,
              image: false,
              xhtml: false,
              custom: ['xmlns:custom="<script>alert(1)</script>"'],
            },
          });
          stream.write('https://example.com/page');
        },
        { message: /malicious content/ }
      );
    });

    it('should reject custom namespace with javascript:', () => {
      assert.throws(
        () => {
          const stream = new SitemapStream({
            xmlns: {
              news: false,
              video: false,
              image: false,
              xhtml: false,
              custom: ['xmlns:custom="javascript:alert(1)"'],
            },
          });
          stream.write('https://example.com/page');
        },
        { message: /malicious content/ }
      );
    });

    it('should reject custom namespace with data:text/html', () => {
      assert.throws(
        () => {
          const stream = new SitemapStream({
            xmlns: {
              news: false,
              video: false,
              image: false,
              xhtml: false,
              custom: ['xmlns:custom="data:text/html,<html></html>"'],
            },
          });
          stream.write('https://example.com/page');
        },
        { message: /malicious content/ }
      );
    });

    it('should reject malformed custom namespace (no xmlns prefix)', () => {
      assert.throws(
        () => {
          const stream = new SitemapStream({
            xmlns: {
              news: false,
              video: false,
              image: false,
              xhtml: false,
              custom: ['custom="http://example.com"'],
            },
          });
          stream.write('https://example.com/page');
        },
        { message: /Invalid namespace format/ }
      );
    });

    it('should reject malformed custom namespace (no quotes)', () => {
      assert.throws(
        () => {
          const stream = new SitemapStream({
            xmlns: {
              news: false,
              video: false,
              image: false,
              xhtml: false,
              custom: ['xmlns:custom=http://example.com'],
            },
          });
          stream.write('https://example.com/page');
        },
        { message: /Invalid namespace format/ }
      );
    });

    it('should reject custom namespace with invalid prefix', () => {
      assert.throws(
        () => {
          const stream = new SitemapStream({
            xmlns: {
              news: false,
              video: false,
              image: false,
              xhtml: false,
              custom: ['xmlns:123invalid="http://example.com"'],
            },
          });
          stream.write('https://example.com/page');
        },
        { message: /Invalid namespace format/ }
      );
    });

    it('should reject custom namespace exceeding max length', () => {
      const longNamespace =
        'xmlns:custom="http://example.com/' + 'a'.repeat(500) + '"';
      assert.throws(
        () => {
          const stream = new SitemapStream({
            xmlns: {
              news: false,
              video: false,
              image: false,
              xhtml: false,
              custom: [longNamespace],
            },
          });
          stream.write('https://example.com/page');
        },
        { message: /exceeds maximum length/ }
      );
    });

    it('should reject empty custom namespace string', () => {
      assert.throws(
        () => {
          const stream = new SitemapStream({
            xmlns: {
              news: false,
              video: false,
              image: false,
              xhtml: false,
              custom: [''],
            },
          });
          stream.write('https://example.com/page');
        },
        { message: /non-empty string/ }
      );
    });

    it('should reject too many custom namespaces', () => {
      const manyNamespaces = Array.from(
        { length: 25 },
        (_, i) => `xmlns:custom${i}="http://example.com/ns${i}"`
      );
      assert.throws(
        () => {
          const stream = new SitemapStream({
            xmlns: {
              news: false,
              video: false,
              image: false,
              xhtml: false,
              custom: manyNamespaces,
            },
          });
          stream.write('https://example.com/page');
        },
        { message: /Too many custom namespaces/ }
      );
    });

    it('should accept namespace with hyphens and dots in prefix', async () => {
      const stream = new SitemapStream({
        xmlns: {
          news: false,
          video: false,
          image: false,
          xhtml: false,
          custom: ['xmlns:custom-name.v2="http://example.com/custom"'],
        },
      });
      stream.write('https://example.com/page');
      stream.end();
      const result = (await streamToPromise(stream)).toString();
      assert.ok(
        result.includes('xmlns:custom-name.v2="http://example.com/custom"')
      );
    });

    it('should reject custom namespace with angle brackets in URI', () => {
      assert.throws(
        () => {
          const stream = new SitemapStream({
            xmlns: {
              news: false,
              video: false,
              image: false,
              xhtml: false,
              custom: ['xmlns:custom="http://example.com/<test>"'],
            },
          });
          stream.write('https://example.com/page');
        },
        { message: /Invalid namespace format/ }
      );
    });

    it('should work without custom namespaces', async () => {
      const stream = new SitemapStream({
        xmlns: {
          news: false,
          video: false,
          image: false,
          xhtml: false,
        },
      });
      stream.write('https://example.com/page');
      stream.end();
      const result = (await streamToPromise(stream)).toString();
      assert.ok(
        result.includes(
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        )
      );
    });
  });

  describe('integration - combined security features', () => {
    it('should work with all valid security features', async () => {
      const stream = new SitemapStream({
        hostname: 'https://example.com',
        xslUrl: 'https://example.com/style.xsl',
        xmlns: {
          news: true,
          video: true,
          image: true,
          xhtml: true,
          custom: ['xmlns:custom="http://example.com/custom"'],
        },
      });
      stream.write({ url: '/page', changefreq: 'daily' });
      stream.end();
      const result = (await streamToPromise(stream)).toString();

      assert.ok(
        result.includes(
          '<?xml-stylesheet type="text/xsl" href="https://example.com/style.xsl"?>'
        )
      );
      assert.ok(result.includes('xmlns:custom="http://example.com/custom"'));
      assert.ok(result.includes('<loc>https://example.com/page</loc>'));
      assert.ok(result.includes('<changefreq>daily</changefreq>'));
    });

    it('should reject if both hostname and xslUrl are invalid', () => {
      assert.throws(
        () =>
          new SitemapStream({
            hostname: 'ftp://example.com',
            xslUrl: 'ftp://example.com/style.xsl',
          })
      );
    });

    it('should validate custom namespaces even with valid hostname', () => {
      assert.throws(
        () => {
          const stream = new SitemapStream({
            hostname: 'https://example.com',
            xmlns: {
              news: false,
              video: false,
              image: false,
              xhtml: false,
              custom: ['xmlns:bad="javascript:alert(1)"'],
            },
          });
          stream.write('/page');
        },
        { message: /malicious content/ }
      );
    });
  });

  describe('edge cases', () => {
    it('should work without any options', async () => {
      const stream = new SitemapStream();
      stream.write('https://example.com/page');
      stream.end();
      const result = (await streamToPromise(stream)).toString();
      assert.ok(result.includes('<loc>https://example.com/page</loc>'));
    });

    it('should handle hostname with special characters', () => {
      assert.doesNotThrow(
        () =>
          new SitemapStream({
            hostname: 'https://example.com/path?query=1&other=2',
          })
      );
    });

    it('should handle xslUrl with query parameters', () => {
      assert.doesNotThrow(
        () => new SitemapStream({ xslUrl: 'https://example.com/style.xsl?v=1' })
      );
    });

    it('should handle hostname with unicode characters', () => {
      assert.doesNotThrow(
        () => new SitemapStream({ hostname: 'https://例え.jp' })
      );
    });
  });
});
