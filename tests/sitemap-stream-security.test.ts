import { stylesheetInclude } from '../lib/sitemap-stream';

describe('BB-01: XML injection via xslUrl', () => {
  it('escapes double quotes in xslUrl', () => {
    const result = stylesheetInclude(
      'https://evil.com/x.xsl" onload="alert(1)'
    );
    expect(result).not.toContain('" onload="');
    expect(result).toContain('&quot;');
  });

  it('escapes less-than signs in xslUrl', () => {
    const result = stylesheetInclude('https://evil.com/<script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;');
  });

  it('escapes greater-than signs in xslUrl', () => {
    const result = stylesheetInclude('https://evil.com/>evil</');
    expect(result).not.toContain('>evil<');
    expect(result).toContain('&gt;');
  });

  it('escapes ampersands in xslUrl', () => {
    const result = stylesheetInclude('https://evil.com/x?a=1&b=2');
    expect(result).not.toContain('&b=');
    expect(result).toContain('&amp;');
  });

  it('produces a valid single processing instruction for an injection payload', () => {
    const payload = '"><evil attr="pwned';
    const result = stylesheetInclude(payload);
    expect(result).not.toContain('<evil');
    expect(result).not.toContain('</evil>');
    expect(result).toMatch(
      /^<\?xml-stylesheet type="text\/xsl" href="[^"]*"\?>$/
    );
  });

  it('passes through a clean URL unchanged except for safe chars', () => {
    const url = 'https://example.com/styles/sitemap.xsl';
    const result = stylesheetInclude(url);
    expect(result).toBe(`<?xml-stylesheet type="text/xsl" href="${url}"?>`);
  });
});
