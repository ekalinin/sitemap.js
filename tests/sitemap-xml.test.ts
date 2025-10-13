import { text, otag, ctag, element } from '../lib/sitemap-xml.js';
import { TagNames, IndexTagNames } from '../lib/types.js';
import { InvalidXMLAttributeNameError } from '../lib/errors.js';

describe('text function', () => {
  describe('basic XML entity escaping', () => {
    it('should replace ampersand with &amp;', () => {
      const input = 'Hello & World';
      const output = text(input);
      expect(output).toBe('Hello &amp; World');
    });

    it('should replace less than sign with &lt;', () => {
      const input = 'Hello < World';
      const output = text(input);
      expect(output).toBe('Hello &lt; World');
    });

    it('should replace greater than sign with &gt;', () => {
      const input = 'Hello > World';
      const output = text(input);
      expect(output).toBe('Hello &gt; World');
    });

    it('should not escape quotes in text content', () => {
      const input = 'Hello "World" and \'Friend\'';
      const output = text(input);
      expect(output).toBe('Hello "World" and \'Friend\'');
    });

    it('should escape multiple special characters', () => {
      const input = 'A & B < C > D';
      const output = text(input);
      expect(output).toBe('A &amp; B &lt; C &gt; D');
    });
  });

  describe('type validation', () => {
    it('should throw TypeError for non-string input', () => {
      expect(() => text(null as unknown as string)).toThrow(TypeError);
      expect(() => text(undefined as unknown as string)).toThrow(TypeError);
      expect(() => text(123 as unknown as string)).toThrow(TypeError);
      expect(() => text({} as unknown as string)).toThrow(TypeError);
    });

    it('should provide descriptive error message for invalid types', () => {
      expect(() => text(42 as unknown as string)).toThrow(
        'text() requires a string, received number: 42'
      );
    });
  });

  describe('invalid XML unicode character removal', () => {
    it.each([
      ['\u0000', 'Hello \u0000 World', 'Hello  World'],
      ['\u0008', 'Hello \u0008 World', 'Hello  World'],
      ['\u000B', 'Hello \u000B World', 'Hello  World'],
      ['\u000C', 'Hello \u000C World', 'Hello  World'],
      ['\u001F', 'Hello \u001F World', 'Hello  World'],
      ['\u007F', 'Hello \u007F World', 'Hello  World'],
      ['\u0084', 'Hello \u0084 World', 'Hello  World'],
      ['\u0086', 'Hello \u0086 World', 'Hello  World'],
      ['\u009F', 'Hello \u009F World', 'Hello  World'],
      ['\uD800', 'Hello \uD800 World', 'Hello  World'],
      ['\uDFFF', 'Hello \uDFFF World', 'Hello  World'],
      ['\uFDD0', 'Hello \uFDD0 World', 'Hello  World'],
      ['\uFDDF', 'Hello \uFDDF World', 'Hello  World'],
      ['\u{1FFFE}', 'Hello \u{1FFFE} World', 'Hello  World'],
      ['\u{1FFFF}', 'Hello \u{1FFFF} World', 'Hello  World'],
      ['\u{2FFFE}', 'Hello \u{2FFFE} World', 'Hello  World'],
      ['\u{2FFFF}', 'Hello \u{2FFFF} World', 'Hello  World'],
      ['\u{3FFFE}', 'Hello \u{3FFFE} World', 'Hello  World'],
      ['\u{3FFFF}', 'Hello \u{3FFFF} World', 'Hello  World'],
      ['\u{4FFFE}', 'Hello \u{4FFFE} World', 'Hello  World'],
      ['\u{4FFFF}', 'Hello \u{4FFFF} World', 'Hello  World'],
      ['\u{5FFFE}', 'Hello \u{5FFFE} World', 'Hello  World'],
      ['\u{5FFFF}', 'Hello \u{5FFFF} World', 'Hello  World'],
      ['\u{6FFFE}', 'Hello \u{6FFFE} World', 'Hello  World'],
      ['\u{6FFFF}', 'Hello \u{6FFFF} World', 'Hello  World'],
      ['\u{7FFFE}', 'Hello \u{7FFFE} World', 'Hello  World'],
      ['\u{7FFFF}', 'Hello \u{7FFFF} World', 'Hello  World'],
      ['\u{8FFFE}', 'Hello \u{8FFFE} World', 'Hello  World'],
      ['\u{8FFFF}', 'Hello \u{8FFFF} World', 'Hello  World'],
      ['\u{9FFFE}', 'Hello \u{9FFFE} World', 'Hello  World'],
      ['\u{9FFFF}', 'Hello \u{9FFFF} World', 'Hello  World'],
      ['\u{AFFFE}', 'Hello \u{AFFFE} World', 'Hello  World'],
      ['\u{AFFFF}', 'Hello \u{AFFFF} World', 'Hello  World'],
      ['\u{BFFFE}', 'Hello \u{BFFFE} World', 'Hello  World'],
      ['\u{BFFFF}', 'Hello \u{BFFFF} World', 'Hello  World'],
      ['\u{CFFFE}', 'Hello \u{CFFFE} World', 'Hello  World'],
      ['\u{CFFFF}', 'Hello \u{CFFFF} World', 'Hello  World'],
      ['\u{DFFFE}', 'Hello \u{DFFFE} World', 'Hello  World'],
      ['\u{DFFFF}', 'Hello \u{DFFFF} World', 'Hello  World'],
      ['\u{EFFFE}', 'Hello \u{EFFFE} World', 'Hello  World'],
      ['\u{EFFFF}', 'Hello \u{EFFFF} World', 'Hello  World'],
      ['\u{FFFFE}', 'Hello \u{FFFFE} World', 'Hello  World'],
      ['\u{FFFFF}', 'Hello \u{FFFFF} World', 'Hello  World'],
      ['\u{10FFFE}', 'Hello \u{10FFFE} World', 'Hello  World'],
      ['\u{10FFFF}', 'Hello \u{10FFFF} World', 'Hello  World'],
    ])(
      'should remove invalid XML unicode character %s',
      (char, input, expected) => {
        const output = text(input);
        expect(output).toBe(expected);
      }
    );
  });
});

describe('otag function', () => {
  describe('basic tag generation', () => {
    it('should generate simple opening tag without attributes', () => {
      const result = otag(TagNames.url);
      expect(result).toBe('<url>');
    });

    it('should generate tag with single attribute', () => {
      const result = otag(TagNames['video:player_loc'], { autoplay: 'ap=1' });
      expect(result).toBe('<video:player_loc autoplay="ap=1">');
    });

    it('should generate tag with multiple attributes', () => {
      const result = otag(TagNames['xhtml:link'], {
        rel: 'alternate',
        hreflang: 'en',
      });
      expect(result).toBe('<xhtml:link rel="alternate" hreflang="en">');
    });

    it('should generate self-closing tag', () => {
      const result = otag(TagNames['image:image'], {}, true);
      expect(result).toBe('<image:image/>');
    });

    it('should generate self-closing tag with attributes', () => {
      const result = otag(TagNames['xhtml:link'], { rel: 'alternate' }, true);
      expect(result).toBe('<xhtml:link rel="alternate"/>');
    });
  });

  describe('attribute value escaping', () => {
    it('should escape ampersand in attribute values', () => {
      const result = otag(TagNames.loc, { test: 'A & B' });
      expect(result).toBe('<loc test="A &amp; B">');
    });

    it('should escape less than in attribute values', () => {
      const result = otag(TagNames.loc, { test: 'A < B' });
      expect(result).toBe('<loc test="A &lt; B">');
    });

    it('should escape greater than in attribute values', () => {
      const result = otag(TagNames.loc, { test: 'A > B' });
      expect(result).toBe('<loc test="A &gt; B">');
    });

    it('should escape double quotes in attribute values', () => {
      const result = otag(TagNames.loc, { test: 'Say "Hello"' });
      expect(result).toBe('<loc test="Say &quot;Hello&quot;">');
    });

    it('should escape single quotes in attribute values', () => {
      const result = otag(TagNames.loc, { test: "It's working" });
      expect(result).toBe('<loc test="It&apos;s working">');
    });

    it('should escape all special characters in attribute values', () => {
      const result = otag(TagNames.loc, { test: '&<>"\'' });
      expect(result).toBe('<loc test="&amp;&lt;&gt;&quot;&apos;">');
    });
  });

  describe('attribute name validation', () => {
    it('should accept valid simple attribute names', () => {
      expect(() => otag(TagNames.loc, { href: 'test' })).not.toThrow();
      expect(() => otag(TagNames.loc, { rel: 'test' })).not.toThrow();
      expect(() => otag(TagNames.loc, { type: 'test' })).not.toThrow();
    });

    it('should accept valid namespaced attribute names', () => {
      expect(() => otag(TagNames.loc, { 'xml:lang': 'en' })).not.toThrow();
      expect(() => otag(TagNames.loc, { 'xlink:href': 'test' })).not.toThrow();
    });

    it('should accept attribute names with hyphens', () => {
      expect(() => otag(TagNames.loc, { 'data-value': 'test' })).not.toThrow();
    });

    it('should accept attribute names with underscores', () => {
      expect(() => otag(TagNames.loc, { attr_name: 'test' })).not.toThrow();
    });

    it('should reject attribute names with invalid characters', () => {
      expect(() => otag(TagNames.loc, { '<script>': 'test' })).toThrow(
        InvalidXMLAttributeNameError
      );

      expect(() => otag(TagNames.loc, { 'attr>': 'test' })).toThrow(
        InvalidXMLAttributeNameError
      );

      expect(() => otag(TagNames.loc, { 'attr=': 'test' })).toThrow(
        InvalidXMLAttributeNameError
      );
    });

    it('should reject attribute names starting with digits', () => {
      expect(() => otag(TagNames.loc, { '123attr': 'test' })).toThrow(
        InvalidXMLAttributeNameError
      );
    });

    it('should reject attribute names with spaces', () => {
      expect(() => otag(TagNames.loc, { 'attr name': 'test' })).toThrow(
        InvalidXMLAttributeNameError
      );
    });
  });

  describe('type validation', () => {
    it('should throw TypeError for non-string nodeName', () => {
      expect(() => otag(null as unknown as TagNames)).toThrow(TypeError);
      expect(() => otag(123 as unknown as TagNames)).toThrow(TypeError);
    });

    it('should throw TypeError for non-string attribute values', () => {
      expect(() =>
        otag(TagNames.loc, { test: 123 as unknown as string })
      ).toThrow(TypeError);

      expect(() =>
        otag(TagNames.loc, { test: null as unknown as string })
      ).toThrow(TypeError);
    });

    it('should provide descriptive error message for invalid attribute value types', () => {
      expect(() =>
        otag(TagNames.loc, { test: 42 as unknown as string })
      ).toThrow(
        'otag() attribute "test" value must be a string, received number: 42'
      );
    });
  });

  describe('index tag names', () => {
    it('should work with IndexTagNames', () => {
      const result = otag(IndexTagNames.sitemap as unknown as TagNames);
      expect(result).toBe('<sitemap>');
    });

    it('should work with IndexTagNames and attributes', () => {
      const result = otag(IndexTagNames.loc as unknown as TagNames, {
        test: 'value',
      });
      expect(result).toBe('<loc test="value">');
    });
  });
});

describe('ctag function', () => {
  it('should generate closing tag for simple tag names', () => {
    const result = ctag(TagNames.url);
    expect(result).toBe('</url>');
  });

  it('should generate closing tag for namespaced tag names', () => {
    const result = ctag(TagNames['video:video']);
    expect(result).toBe('</video:video>');
  });

  it('should generate closing tag for index tag names', () => {
    const result = ctag(IndexTagNames.sitemap as unknown as TagNames);
    expect(result).toBe('</sitemap>');
  });

  it('should throw TypeError for non-string nodeName', () => {
    expect(() => ctag(null as unknown as TagNames)).toThrow(TypeError);
    expect(() => ctag(123 as unknown as TagNames)).toThrow(TypeError);
  });
});

describe('element function', () => {
  describe('pattern 1: element with text content', () => {
    it('should generate element with simple text content', () => {
      const result = element(TagNames.loc, 'https://example.com');
      expect(result).toBe('<loc>https://example.com</loc>');
    });

    it('should escape text content', () => {
      const result = element(TagNames.loc, 'A & B < C');
      expect(result).toBe('<loc>A &amp; B &lt; C</loc>');
    });
  });

  describe('pattern 2: element with attributes and text', () => {
    it('should generate element with attributes and text content', () => {
      const result = element(
        TagNames['video:player_loc'],
        { autoplay: 'ap=1' },
        'https://example.com/video'
      );
      expect(result).toBe(
        '<video:player_loc autoplay="ap=1">https://example.com/video</video:player_loc>'
      );
    });

    it('should escape both attributes and text', () => {
      const result = element(TagNames.loc, { test: 'A & B' }, 'C & D');
      expect(result).toBe('<loc test="A &amp; B">C &amp; D</loc>');
    });
  });

  describe('pattern 3: self-closing element with attributes', () => {
    it('should generate self-closing element with attributes', () => {
      const result = element(TagNames['xhtml:link'], {
        rel: 'alternate',
        href: 'https://example.com',
      });
      expect(result).toBe(
        '<xhtml:link rel="alternate" href="https://example.com"/>'
      );
    });

    it('should escape attribute values in self-closing element', () => {
      const result = element(TagNames['xhtml:link'], {
        href: 'https://example.com?a=1&b=2',
      });
      expect(result).toBe(
        '<xhtml:link href="https://example.com?a=1&amp;b=2"/>'
      );
    });
  });

  describe('security - combined escaping', () => {
    it('should prevent XML injection via text content', () => {
      const malicious = '</loc><script>alert("xss")</script><loc>';
      const result = element(TagNames.loc, malicious);
      expect(result).toBe(
        '<loc>&lt;/loc&gt;&lt;script&gt;alert("xss")&lt;/script&gt;&lt;loc&gt;</loc>'
      );
      expect(result).not.toContain('<script>');
    });

    it('should prevent XML injection via attributes', () => {
      const result = element(TagNames.loc, {
        test: '"><script>alert("xss")</script><x y="',
      });
      expect(result).toBe(
        '<loc test="&quot;&gt;&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;&lt;x y=&quot;"/>'
      );
      expect(result).not.toContain('<script>');
    });

    it('should handle CDATA-like injection attempts', () => {
      const malicious = ']]><script>alert("xss")</script><![CDATA[';
      const result = element(TagNames.loc, malicious);
      expect(result).toContain('&lt;script&gt;');
      expect(result).toContain('&gt;');
    });
  });
});
