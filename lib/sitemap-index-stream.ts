import { Transform, TransformOptions, TransformCallback } from 'stream';
import { IndexItem, SitemapItemLoose, ErrorLevel } from './types';
import { SitemapStream, stylesheetInclude } from './sitemap-stream';
import { element, otag, ctag } from './sitemap-xml';

export enum IndexTagNames {
  sitemap = 'sitemap',
  loc = 'loc',
  lastmod = 'lastmod',
}

const xmlDec = '<?xml version="1.0" encoding="UTF-8"?>';

const sitemapIndexTagStart =
  '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
const closetag = '</sitemapindex>';

export interface SitemapIndexStreamOptions extends TransformOptions {
  level?: ErrorLevel;
  xslUrl?: string;
}
const defaultStreamOpts: SitemapIndexStreamOptions = {};
export class SitemapIndexStream extends Transform {
  level: ErrorLevel;
  xslUrl?: string;
  private hasHeadOutput: boolean;
  constructor(opts = defaultStreamOpts) {
    opts.objectMode = true;
    super(opts);
    this.hasHeadOutput = false;
    this.level = opts.level ?? ErrorLevel.WARN;
    this.xslUrl = opts.xslUrl;
  }

  _transform(
    item: IndexItem | string,
    encoding: string,
    callback: TransformCallback
  ): void {
    if (!this.hasHeadOutput) {
      this.hasHeadOutput = true;
      let stylesheet = '';
      if (this.xslUrl) {
        stylesheet = stylesheetInclude(this.xslUrl);
      }
      this.push(xmlDec + stylesheet + sitemapIndexTagStart);
    }
    this.push(otag(IndexTagNames.sitemap));
    if (typeof item === 'string') {
      this.push(element(IndexTagNames.loc, item));
    } else {
      this.push(element(IndexTagNames.loc, item.url));
      if (item.lastmod) {
        this.push(
          element(IndexTagNames.lastmod, new Date(item.lastmod).toISOString())
        );
      }
    }
    this.push(ctag(IndexTagNames.sitemap));
    callback();
  }

  _flush(cb: TransformCallback): void {
    this.push(closetag);
    cb();
  }
}

type getSitemapStream = (i: number) => [IndexItem | string, SitemapStream];

export interface SitemapAndIndexStreamOptions
  extends SitemapIndexStreamOptions {
  level?: ErrorLevel;
  limit?: number;
  getSitemapStream: getSitemapStream;
}
// const defaultSIStreamOpts: SitemapAndIndexStreamOptions = {};
export class SitemapAndIndexStream extends SitemapIndexStream {
  private i: number;
  private getSitemapStream: getSitemapStream;
  private currentSitemap: SitemapStream;
  private idxItem: IndexItem | string;
  private limit: number;
  constructor(opts: SitemapAndIndexStreamOptions) {
    opts.objectMode = true;
    super(opts);
    this.i = 0;
    this.getSitemapStream = opts.getSitemapStream;
    [this.idxItem, this.currentSitemap] = this.getSitemapStream(0);
    this.limit = opts.limit ?? 45000;
  }

  _writeSMI(item: SitemapItemLoose): void {
    this.currentSitemap.write(item);
    this.i++;
  }

  _transform(
    item: SitemapItemLoose,
    encoding: string,
    callback: TransformCallback
  ): void {
    if (this.i === 0) {
      this._writeSMI(item);
      super._transform(this.idxItem, encoding, callback);
    } else if (this.i % this.limit === 0) {
      this.currentSitemap.end(() => {
        const [idxItem, currentSitemap] = this.getSitemapStream(
          this.i / this.limit
        );
        this.currentSitemap = currentSitemap;
        this._writeSMI(item);
        // push to index stream
        super._transform(idxItem, encoding, callback);
      });
    } else {
      this._writeSMI(item);
      callback();
    }
  }

  _flush(cb: TransformCallback): void {
    this.currentSitemap.end(() => super._flush(cb));
  }
}
