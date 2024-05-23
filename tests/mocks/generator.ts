export function el(tagName: string, content: string = simpleText): string {
  return `<${tagName}>${content}</${tagName}>`;
}

export const simpleText = 'Example text&><\'"&><\'"';
export const simpleTextEscaped = 'Example text&amp;>&lt;\'"&amp;>&lt;\'"';
export const simpleURL =
  'https://example.com/path?some=value&another#!fragment';
export const simpleURLEscaped =
  'https://example.com/path?some=value&amp;another#!fragment';
export const integer = 1;
export const float = 0.99;
export const date = '2011-06-27T00:00:00.000Z';
export const escapable = '&><\'"';
export const attrEscaped = '&amp;>&lt;&apos;&quot;';
export const textEscaped = '&amp;>&lt;\'"';
