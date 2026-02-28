import { stylesheetInclude } from '../lib/sitemap-stream';

describe('sitemap-stream security', () => {
  describe('stylesheetInclude XML escaping (BB-01)', () => {
    it('escapes double-quotes to prevent attribute breakout', () => {
      const url = 'https://example.com/style.xsl?a="b"';
      const result = stylesheetInclude(url);
      expect(result).not.toContain('"b"');
      expect(result).toContain('&quot;');
      // Output must be a single well-formed PI with no stray attributes
      expect(result).toMatch(
        /^<\?xml-stylesheet type="text\/xsl" href="[^"]*"\?>$/
      );
    });

    it('escapes < to prevent tag injection', () => {
      const url = 'https://example.com/x?q=<evil>';
      const result = stylesheetInclude(url);
      expect(result).not.toContain('<evil>');
      expect(result).toContain('&lt;');
    });

    it('escapes > to prevent tag injection', () => {
      const url = 'https://example.com/x?q=>injected';
      const result = stylesheetInclude(url);
      expect(result).not.toContain('>injected');
      expect(result).toContain('&gt;');
    });

    it('escapes & to produce valid XML', () => {
      const url = 'https://example.com/x?a=1&b=2';
      const result = stylesheetInclude(url);
      expect(result).not.toMatch(/&[^a-z#]/); // no bare & except entity refs
      expect(result).toContain('&amp;');
    });

    it('does not double-escape already-safe URLs', () => {
      const url = 'https://example.com/style.xsl';
      const result = stylesheetInclude(url);
      expect(result).toBe(
        '<?xml-stylesheet type="text/xsl" href="https://example.com/style.xsl"?>'
      );
    });

    it('prevents full injection payload from breaking PI', () => {
      const url = 'https://attacker.test/x.xsl"?><evil>pwned</evil><!--';
      const result = stylesheetInclude(url);
      // Unescaped angle brackets must not appear (they would break XML structure)
      expect(result).not.toContain('<evil>');
      expect(result).not.toContain('</evil>');
      // The href value must be quoted with exactly one pair of " delimiters
      // i.e. the regex must match (no stray unescaped " inside the value)
      expect(result).toMatch(
        /^<\?xml-stylesheet type="text\/xsl" href="[^"]*"\?>$/
      );
      // Must be a single valid PI
      expect(result.startsWith('<?xml-stylesheet')).toBe(true);
      expect(result.endsWith('?>')).toBe(true);
    });
  });
});
