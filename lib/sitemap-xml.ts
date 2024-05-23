import { TagNames } from './types';
import { StringObj } from './sitemap-item-stream';
import { IndexTagNames } from './sitemap-index-stream';

const invalidXMLUnicodeRegex =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u0084\u0086-\u009F\uD800-\uDFFF\p{NChar}]/gu;
const amp = /&/g;
const lt = /</g;
const apos = /'/g;
const quot = /"/g;
export function text(txt: string): string {
  return txt
    .replace(amp, '&amp;')
    .replace(lt, '&lt;')
    .replace(invalidXMLUnicodeRegex, '');
}

export function otag(
  nodeName: TagNames | IndexTagNames,
  attrs?: StringObj,
  selfClose = false
): string {
  let attrstr = '';
  for (const k in attrs) {
    const val = attrs[k]
      .replace(amp, '&amp;')
      .replace(lt, '&lt;')
      .replace(apos, '&apos;')
      .replace(quot, '&quot;')
      .replace(invalidXMLUnicodeRegex, '');
    attrstr += ` ${k}="${val}"`;
  }
  return `<${nodeName}${attrstr}${selfClose ? '/' : ''}>`;
}

export function ctag(nodeName: TagNames | IndexTagNames): string {
  return `</${nodeName}>`;
}

export function element(
  nodeName: TagNames,
  attrs: StringObj,
  innerText: string
): string;
export function element(
  nodeName: TagNames | IndexTagNames,
  innerText: string
): string;
export function element(nodeName: TagNames, attrs: StringObj): string;
export function element(
  nodeName: TagNames | IndexTagNames,
  attrs: string | StringObj,
  innerText?: string
): string {
  if (typeof attrs === 'string') {
    return otag(nodeName) + text(attrs) + ctag(nodeName);
  } else if (innerText) {
    return otag(nodeName, attrs) + text(innerText) + ctag(nodeName);
  } else {
    return otag(nodeName, attrs, true);
  }
}
