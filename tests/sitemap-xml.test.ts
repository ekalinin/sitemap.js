import { text } from '../lib/sitemap-xml';

describe('text function', () => {
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
