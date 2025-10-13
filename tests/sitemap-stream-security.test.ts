import { SitemapStream, streamToPromise } from '../lib/sitemap-stream.js';
import { InvalidHostnameError, InvalidXSLUrlError } from '../lib/errors.js';

describe('sitemap-stream security', () => {
  describe('hostname validation', () => {
    it('should accept valid http hostname', () => {
      expect(
        () => new SitemapStream({ hostname: 'http://example.com' })
      ).not.toThrow();
    });

    it('should accept valid https hostname', () => {
      expect(
        () => new SitemapStream({ hostname: 'https://example.com' })
      ).not.toThrow();
    });

    it('should accept hostname with port', () => {
      expect(
        () => new SitemapStream({ hostname: 'https://example.com:8080' })
      ).not.toThrow();
    });

    it('should accept hostname with path', () => {
      expect(
        () => new SitemapStream({ hostname: 'https://example.com/path' })
      ).not.toThrow();
    });

    it('should reject non-http(s) protocol', () => {
      expect(
        () => new SitemapStream({ hostname: 'ftp://example.com' })
      ).toThrow(InvalidHostnameError);
    });

    it('should reject javascript: protocol', () => {
      expect(
        () => new SitemapStream({ hostname: 'javascript:alert(1)' })
      ).toThrow(InvalidHostnameError);
    });

    it('should reject data: protocol', () => {
      expect(
        () =>
          new SitemapStream({
            hostname: 'data:text/html,<script>alert(1)</script>',
          })
      ).toThrow(InvalidHostnameError);
    });

    it('should reject file: protocol', () => {
      expect(
        () => new SitemapStream({ hostname: 'file:///etc/passwd' })
      ).toThrow(InvalidHostnameError);
    });

    it('should reject malformed URL', () => {
      expect(() => new SitemapStream({ hostname: 'not a url' })).toThrow(
        InvalidHostnameError
      );
    });

    it('should reject empty hostname', () => {
      expect(() => new SitemapStream({ hostname: '' })).toThrow(
        InvalidHostnameError
      );
    });

    it('should reject hostname exceeding max length', () => {
      const longUrl = 'https://' + 'a'.repeat(2048) + '.com';
      expect(() => new SitemapStream({ hostname: longUrl })).toThrow(
        InvalidHostnameError
      );
    });

    it('should accept hostname at max length', () => {
      // 2048 - 8 for 'https://' = 2040 characters
      const maxUrl = 'https://' + 'a'.repeat(2033) + '.com';
      expect(() => new SitemapStream({ hostname: maxUrl })).not.toThrow();
    });
  });

  describe('xslUrl validation', () => {
    it('should accept valid http xslUrl', () => {
      expect(
        () => new SitemapStream({ xslUrl: 'http://example.com/style.xsl' })
      ).not.toThrow();
    });

    it('should accept valid https xslUrl', () => {
      expect(
        () => new SitemapStream({ xslUrl: 'https://example.com/style.xsl' })
      ).not.toThrow();
    });

    it('should reject non-http(s) xslUrl', () => {
      expect(
        () => new SitemapStream({ xslUrl: 'ftp://example.com/style.xsl' })
      ).toThrow(InvalidXSLUrlError);
    });

    it('should reject javascript: in xslUrl', () => {
      expect(
        () => new SitemapStream({ xslUrl: 'javascript:alert(1)' })
      ).toThrow(InvalidXSLUrlError);
    });

    it('should reject xslUrl with <script tag', () => {
      expect(
        () =>
          new SitemapStream({
            xslUrl: 'http://example.com/<script>alert(1)</script>',
          })
      ).toThrow(InvalidXSLUrlError);
    });

    it('should reject data: protocol in xslUrl', () => {
      expect(
        () =>
          new SitemapStream({
            xslUrl: 'data:text/html,<script>alert(1)</script>',
          })
      ).toThrow(InvalidXSLUrlError);
    });

    it('should reject file: protocol in xslUrl', () => {
      expect(() => new SitemapStream({ xslUrl: 'file:///etc/passwd' })).toThrow(
        InvalidXSLUrlError
      );
    });

    it('should reject malformed xslUrl', () => {
      expect(() => new SitemapStream({ xslUrl: 'not a url' })).toThrow(
        InvalidXSLUrlError
      );
    });

    it('should reject empty xslUrl', () => {
      expect(() => new SitemapStream({ xslUrl: '' })).toThrow(
        InvalidXSLUrlError
      );
    });

    it('should reject xslUrl exceeding max length', () => {
      const longUrl = 'https://' + 'a'.repeat(2048) + '.com/style.xsl';
      expect(() => new SitemapStream({ xslUrl: longUrl })).toThrow(
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
      expect(result).toContain(
        '<?xml-stylesheet type="text/xsl" href="https://example.com/style.xsl"?>'
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
      expect(result).toContain('xmlns:custom="http://example.com/custom"');
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
      expect(result).toContain('xmlns:custom="http://example.com/custom"');
      expect(result).toContain('xmlns:other="http://example.com/other"');
    });

    it('should reject custom namespace with <script tag', () => {
      expect(() => {
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
      }).toThrow(/malicious content/);
    });

    it('should reject custom namespace with javascript:', () => {
      expect(() => {
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
      }).toThrow(/malicious content/);
    });

    it('should reject custom namespace with data:text/html', () => {
      expect(() => {
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
      }).toThrow(/malicious content/);
    });

    it('should reject malformed custom namespace (no xmlns prefix)', () => {
      expect(() => {
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
      }).toThrow(/Invalid namespace format/);
    });

    it('should reject malformed custom namespace (no quotes)', () => {
      expect(() => {
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
      }).toThrow(/Invalid namespace format/);
    });

    it('should reject custom namespace with invalid prefix', () => {
      expect(() => {
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
      }).toThrow(/Invalid namespace format/);
    });

    it('should reject custom namespace exceeding max length', () => {
      const longNamespace =
        'xmlns:custom="http://example.com/' + 'a'.repeat(500) + '"';
      expect(() => {
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
      }).toThrow(/exceeds maximum length/);
    });

    it('should reject empty custom namespace string', () => {
      expect(() => {
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
      }).toThrow(/non-empty string/);
    });

    it('should reject too many custom namespaces', () => {
      const manyNamespaces = Array.from(
        { length: 25 },
        (_, i) => `xmlns:custom${i}="http://example.com/ns${i}"`
      );
      expect(() => {
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
      }).toThrow(/Too many custom namespaces/);
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
      expect(result).toContain(
        'xmlns:custom-name.v2="http://example.com/custom"'
      );
    });

    it('should reject custom namespace with angle brackets in URI', () => {
      expect(() => {
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
      }).toThrow(/Invalid namespace format/);
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
      expect(result).toContain(
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
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

      expect(result).toContain(
        '<?xml-stylesheet type="text/xsl" href="https://example.com/style.xsl"?>'
      );
      expect(result).toContain('xmlns:custom="http://example.com/custom"');
      expect(result).toContain('<loc>https://example.com/page</loc>');
      expect(result).toContain('<changefreq>daily</changefreq>');
    });

    it('should reject if both hostname and xslUrl are invalid', () => {
      expect(
        () =>
          new SitemapStream({
            hostname: 'ftp://example.com',
            xslUrl: 'ftp://example.com/style.xsl',
          })
      ).toThrow(); // Should throw on hostname first
    });

    it('should validate custom namespaces even with valid hostname', () => {
      expect(() => {
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
      }).toThrow(/malicious content/);
    });
  });

  describe('edge cases', () => {
    it('should work without any options', async () => {
      const stream = new SitemapStream();
      stream.write('https://example.com/page');
      stream.end();
      const result = (await streamToPromise(stream)).toString();
      expect(result).toContain('<loc>https://example.com/page</loc>');
    });

    it('should handle hostname with special characters', () => {
      expect(
        () =>
          new SitemapStream({
            hostname: 'https://example.com/path?query=1&other=2',
          })
      ).not.toThrow();
    });

    it('should handle xslUrl with query parameters', () => {
      expect(
        () => new SitemapStream({ xslUrl: 'https://example.com/style.xsl?v=1' })
      ).not.toThrow();
    });

    it('should handle hostname with unicode characters', () => {
      expect(
        () => new SitemapStream({ hostname: 'https://例え.jp' })
      ).not.toThrow();
    });
  });
});
