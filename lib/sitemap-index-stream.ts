import { Transform, TransformOptions, TransformCallback } from 'stream';
import { IndexItem, SitemapItemLoose, ErrorLevel } from './types';
import { SitemapStream, stylesheetInclude } from './sitemap-stream';
import { element, otag, ctag } from './sitemap-xml';
import { WriteStream } from 'fs';

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
  lastmodDateOnly?: boolean;
  level?: ErrorLevel;
  xslUrl?: string;
}
const defaultStreamOpts: SitemapIndexStreamOptions = {};
export class SitemapIndexStream extends Transform {
  lastmodDateOnly: boolean;
  level: ErrorLevel;
  xslUrl?: string;
  private hasHeadOutput: boolean;
  constructor(opts = defaultStreamOpts) {
    opts.objectMode = true;
    super(opts);
    this.hasHeadOutput = false;
    this.lastmodDateOnly = opts.lastmodDateOnly || false;
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
        const lastmod: string = new Date(item.lastmod).toISOString();
        this.push(
          element(
            IndexTagNames.lastmod,
            this.lastmodDateOnly ? lastmod.slice(0, 10) : lastmod
          )
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

type getSitemapStream = (
  i: number
) => [IndexItem | string, SitemapStream, WriteStream];

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
  private currentSitemapPipeline?: WriteStream;
  private idxItem: IndexItem | string;
  private limit: number;
  constructor(opts: SitemapAndIndexStreamOptions) {
    opts.objectMode = true;
    super(opts);
    this.i = 0;
    this.getSitemapStream = opts.getSitemapStream;
    [this.idxItem, this.currentSitemap, this.currentSitemapPipeline] =
      this.getSitemapStream(0);
    this.currentSitemap.on('error', (err) => this.emit('error', err));
    this.limit = opts.limit ?? 45000;
  }

  _writeSMI(item: SitemapItemLoose, callback: () => void): void {
    this.i++;
    if (!this.currentSitemap.write(item)) {
      this.currentSitemap.once('drain', callback);
    } else {
      process.nextTick(callback);
    }
  }

  _transform(
    item: SitemapItemLoose,
    encoding: string,
    callback: TransformCallback
  ): void {
    if (this.i === 0) {
      this._writeSMI(item, () =>
        super._transform(this.idxItem, encoding, callback)
      );
    } else if (this.i % this.limit === 0) {
      const onFinish = () => {
        const [idxItem, currentSitemap, currentSitemapPipeline] =
          this.getSitemapStream(this.i / this.limit);
        currentSitemap.on('error', (err) => this.emit('error', err));
        this.currentSitemap = currentSitemap;
        this.currentSitemapPipeline = currentSitemapPipeline;
        // push to index stream
        this._writeSMI(item, () =>
          // push to index stream
          super._transform(idxItem, encoding, callback)
        );
      };
      this.currentSitemapPipeline?.on('finish', onFinish);
      this.currentSitemap.end(
        !this.currentSitemapPipeline ? onFinish : undefined
      );
    } else {
      this._writeSMI(item, callback);
    }
  }

  _flush(cb: TransformCallback): void {
    const onFinish = () => super._flush(cb);
    this.currentSitemapPipeline?.on('finish', onFinish);
    this.currentSitemap.end(
      !this.currentSitemapPipeline ? onFinish : undefined
    );
  }
}
