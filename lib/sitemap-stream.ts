import { SitemapItem } from './sitemap-item';
import { ISitemapItemOptionsLoose, ErrorLevel } from './types';
import { Transform, TransformOptions, TransformCallback } from 'stream';
import { ISitemapOptions, Sitemap } from './sitemap';
export const preamble = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">';
export const closetag = '</urlset>';
export interface ISitemapStreamOpts extends TransformOptions, Pick<ISitemapOptions, 'hostname' | 'level'> {
}
const defaultStreamOpts: ISitemapStreamOpts = {};
export class SitemapStream extends Transform {
  hostname?: string;
  level: ErrorLevel;
  hasHeadOutput: boolean;
  constructor(opts = defaultStreamOpts) {
    opts.objectMode = true;
    super(opts);
    this.hasHeadOutput = false;
    this.hostname = opts.hostname;
    this.level = opts.level || ErrorLevel.WARN;
  }

  _transform(item: ISitemapItemOptionsLoose, encoding: string, callback: TransformCallback): void {
    if (!this.hasHeadOutput) {
      this.hasHeadOutput = true;
      this.push(preamble);
    }
    this.push(SitemapItem.justItem(Sitemap.normalizeURL(item, undefined, this.hostname), this.level));
    callback();
  }

  _flush(cb: TransformCallback): void {
    this.push(closetag);
    cb();
  }
}
