import { promisify } from 'util';
import { URL } from 'url';
import { stat, createWriteStream } from 'fs';
import { createGzip } from 'zlib';
import {
  Transform,
  TransformOptions,
  TransformCallback,
  Writable,
} from 'stream';
import { IndexItem, SitemapItemLoose, ErrorLevel } from './types';
import { UndefinedTargetFolder } from './errors';
import { chunk } from './utils';
import { SitemapStream, stylesheetInclude } from './sitemap-stream';
import { element, otag, ctag } from './sitemap-xml';
import { WriteStream } from 'fs';

export enum IndexTagNames {
  sitemap = 'sitemap',
  loc = 'loc',
  lastmod = 'lastmod',
}

const statPromise = promisify(stat);
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

/**
 * Shortcut for `new SitemapIndex (...)`.
 * Create several sitemaps and an index automatically from a list of urls
 *
 * @deprecated Use SitemapAndIndexStream
 * @param   {Object}        conf
 * @param   {String|Array}  conf.urls
 * @param   {String}        conf.targetFolder where do you want the generated index and maps put
 * @param   {String}        conf.hostname required for index file, will also be used as base url for sitemap items
 * @param   {String}        conf.sitemapName what do you want to name the files it generats
 * @param   {Number}        conf.sitemapSize maximum number of entries a sitemap should have before being split
 * @param   {Boolean}       conf.gzip whether to gzip the files (defaults to true)
 * @return  {SitemapIndex}
 */
export async function createSitemapsAndIndex({
  urls,
  targetFolder,
  hostname,
  sitemapName = 'sitemap',
  sitemapSize = 50000,
  gzip = true,
  xslUrl,
}: {
  urls: (string | SitemapItemLoose)[];
  targetFolder: string;
  hostname?: string;
  sitemapName?: string;
  sitemapSize?: number;
  gzip?: boolean;
  xslUrl?: string;
}): Promise<boolean> {
  const indexStream = new SitemapIndexStream({ xslUrl });

  try {
    const stats = await statPromise(targetFolder);
    if (!stats.isDirectory()) {
      throw new UndefinedTargetFolder();
    }
  } catch (e) {
    throw new UndefinedTargetFolder();
  }

  const indexWS = createWriteStream(
    targetFolder + '/' + sitemapName + '-index.xml'
  );
  indexStream.pipe(indexWS);
  const smPromises = chunk(urls, sitemapSize).map(
    (chunk: (string | SitemapItemLoose)[], idx): Promise<boolean> => {
      return new Promise((resolve, reject): void => {
        const extension = '.xml' + (gzip ? '.gz' : '');
        const filename = sitemapName + '-' + idx + extension;
        indexStream.write(new URL(filename, hostname).toString());

        const ws = createWriteStream(targetFolder + '/' + filename);
        const sms = new SitemapStream({ hostname, xslUrl });
        let pipe: Writable;
        if (gzip) {
          pipe = sms.pipe(createGzip()).pipe(ws);
        } else {
          pipe = sms.pipe(ws);
        }
        chunk.forEach((smi) => sms.write(smi));
        sms.end();
        pipe.on('finish', () => resolve(true));
        pipe.on('error', (e) => reject(e));
      });
    }
  );
  return Promise.all(smPromises).then(() => {
    indexStream.end();
    return true;
  });
}

type getSitemapStream = (
  i: number
) => [IndexItem | string, SitemapStream, WriteStream];
/** @deprecated */
type getSitemapStreamDeprecated = (
  i: number
) => [IndexItem | string, SitemapStream];

export interface SitemapAndIndexStreamOptions
  extends SitemapIndexStreamOptions {
  level?: ErrorLevel;
  limit?: number;
  getSitemapStream: getSitemapStream;
}
export interface SitemapAndIndexStreamOptionsDeprecated
  extends SitemapIndexStreamOptions {
  level?: ErrorLevel;
  limit?: number;
  getSitemapStream: getSitemapStreamDeprecated;
}
// const defaultSIStreamOpts: SitemapAndIndexStreamOptions = {};
export class SitemapAndIndexStream extends SitemapIndexStream {
  private i: number;
  private getSitemapStream: getSitemapStream | getSitemapStreamDeprecated;
  private currentSitemap: SitemapStream;
  private currentSitemapPipeline?: WriteStream;
  private idxItem: IndexItem | string;
  private limit: number;
  /**
   * @deprecated this version does not properly wait for everything to write before resolving
   * pass a 3rd param in your return from getSitemapStream that is the writeable stream
   * to remove this warning
   */
  constructor(opts: SitemapAndIndexStreamOptionsDeprecated);
  constructor(opts: SitemapAndIndexStreamOptions);
  constructor(
    opts: SitemapAndIndexStreamOptions | SitemapAndIndexStreamOptionsDeprecated
  ) {
    opts.objectMode = true;
    super(opts);
    this.i = 0;
    this.getSitemapStream = opts.getSitemapStream;
    [
      this.idxItem,
      this.currentSitemap,
      this.currentSitemapPipeline,
    ] = this.getSitemapStream(0);
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
      const onFinish = () => {
        const [
          idxItem,
          currentSitemap,
          currentSitemapPipeline,
        ] = this.getSitemapStream(this.i / this.limit);
        this.currentSitemap = currentSitemap;
        this.currentSitemapPipeline = currentSitemapPipeline;
        this._writeSMI(item);
        // push to index stream
        super._transform(idxItem, encoding, callback);
      };
      this.currentSitemapPipeline?.on('finish', onFinish);
      this.currentSitemap.end(
        !this.currentSitemapPipeline ? onFinish : undefined
      );
    } else {
      this._writeSMI(item);
      callback();
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
