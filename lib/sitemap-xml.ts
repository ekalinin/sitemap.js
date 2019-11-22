import { ValidTagNames } from './sitemap-parser';
import { IStringObj } from './sitemap-item';

export function text(txt: string): string {
  return txt.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

export function otag(
  nodeName: ValidTagNames,
  attrs?: IStringObj,
  selfClose = false
): string {
  let attrstr = '';
  for (const k in attrs) {
    const val = attrs[k]
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/'/g, '&apos;')
      .replace(/"/g, '&quot;');
    attrstr += ` ${k}="${val}"`;
  }
  return `<${nodeName}${attrstr}${selfClose ? '/' : ''}>`;
}

export function ctag(nodeName: ValidTagNames): string {
  return `</${nodeName}>`;
}

export function element(
  nodeName: ValidTagNames,
  attrs: IStringObj,
  innerText: string
): string;
export function element(nodeName: ValidTagNames, innerText: string): string;
export function element(nodeName: ValidTagNames, attrs: IStringObj): string;
export function element(
  nodeName: ValidTagNames,
  attrs: string | IStringObj,
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
