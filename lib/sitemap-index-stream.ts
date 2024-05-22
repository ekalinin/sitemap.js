import { WriteStream } from 'fs';
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

/**
 * Options for the SitemapIndexStream
 */
export interface SitemapIndexStreamOptions extends TransformOptions {
  /**
   * Whether to output the lastmod date only (no time)
   *
   * @default false
   */
  lastmodDateOnly?: boolean;

  /**
   * How to handle errors in passed in urls
   *
   * @default ErrorLevel.WARN
   */
  level?: ErrorLevel;

  /**
   * URL to an XSL stylesheet to include in the XML
   */
  xslUrl?: string;
}
const defaultStreamOpts: SitemapIndexStreamOptions = {};

/**
 * `SitemapIndexStream` is a Transform stream that takes `IndexItem`s or sitemap URL strings and outputs a stream of sitemap index XML.
 *
 * It automatically handles the XML declaration and the opening and closing tags for the sitemap index.
 *
 * ⚠️ CAUTION: This object is `readable` and must be read (e.g. piped to a file or to /dev/null)
 * before `finish` will be emitted. Failure to read the stream will result in hangs.
 *
 * @extends {Transform}
 */
export class SitemapIndexStream extends Transform {
  lastmodDateOnly: boolean;
  level: ErrorLevel;
  xslUrl?: string;
  private hasHeadOutput: boolean;

  /**
   * `SitemapIndexStream` is a Transform stream that takes `IndexItem`s or sitemap URL strings and outputs a stream of sitemap index XML.
   *
   * It automatically handles the XML declaration and the opening and closing tags for the sitemap index.
   *
   * ⚠️ CAUTION: This object is `readable` and must be read (e.g. piped to a file or to /dev/null)
   * before `finish` will be emitted. Failure to read the stream will result in hangs.
   *
   * @param {SitemapIndexStreamOptions} [opts=defaultStreamOpts] - Stream options.
   */
  constructor(opts = defaultStreamOpts) {
    opts.objectMode = true;
    super(opts);
    this.hasHeadOutput = false;
    this.lastmodDateOnly = opts.lastmodDateOnly || false;
    this.level = opts.level ?? ErrorLevel.WARN;
    this.xslUrl = opts.xslUrl;
  }

  private writeHeadOutput(): void {
    this.hasHeadOutput = true;
    let stylesheet = '';
    if (this.xslUrl) {
      stylesheet = stylesheetInclude(this.xslUrl);
    }
    this.push(xmlDec + stylesheet + sitemapIndexTagStart);
  }

  _transform(
    item: IndexItem | string,
    encoding: string,
    callback: TransformCallback
  ): void {
    if (!this.hasHeadOutput) {
      this.writeHeadOutput();
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
    if (!this.hasHeadOutput) {
      this.writeHeadOutput();
    }

    this.push(closetag);
    cb();
  }
}

type getSitemapStreamFunc = (
  i: number
) => [IndexItem | string, SitemapStream, WriteStream];

/**
 * Options for the SitemapAndIndexStream
 *
 * @extends {SitemapIndexStreamOptions}
 */
export interface SitemapAndIndexStreamOptions
  extends SitemapIndexStreamOptions {
  /**
   * Max number of items in each sitemap XML file.
   *
   * When the limit is reached the current sitemap file will be closed,
   * a wait for `finish` on the target write stream will happen,
   * and a new sitemap file will be created.
   *
   * Range: 1 - 50,000
   *
   * @default 45000
   */
  limit?: number;

  /**
   * Callback for SitemapIndexAndStream that creates a new sitemap stream for a given sitemap index.
   *
   * Called when a new sitemap file is needed.
   *
   * The write stream is the destination where the sitemap was piped.
   * SitemapAndIndexStream will wait for the `finish` event on each sitemap's
   * write stream before moving on to the next sitemap. This ensures that the
   * contents of the write stream will be fully written before being used
   * by any following operations (e.g. uploading, reading contents for unit tests).
   *
   * @param i - The index of the sitemap file
   * @returns A tuple containing the index item to be written into the sitemap index, the sitemap stream, and the write stream for the sitemap pipe destination
   */
  getSitemapStream: getSitemapStreamFunc;
}

/**
 * `SitemapAndIndexStream` is a Transform stream that takes in sitemap items,
 * writes them to sitemap files, adds the sitemap files to a sitemap index,
 * and creates new sitemap files when the count limit is reached.
 *
 * It waits for the target stream of the current sitemap file to finish before
 * moving on to the next if the target stream is returned by the `getSitemapStream`
 * callback in the 3rd position of the tuple.
 *
 * ⚠️ CAUTION: This object is `readable` and must be read (e.g. piped to a file or to /dev/null)
 * before `finish` will be emitted. Failure to read the stream will result in hangs.
 *
 * @extends {SitemapIndexStream}
 */
export class SitemapAndIndexStream extends SitemapIndexStream {
  private itemsWritten: number;
  private getSitemapStream: getSitemapStreamFunc;
  private currentSitemap?: SitemapStream;
  private limit: number;
  private currentSitemapPipeline?: WriteStream;

  /**
   * `SitemapAndIndexStream` is a Transform stream that takes in sitemap items,
   * writes them to sitemap files, adds the sitemap files to a sitemap index,
   * and creates new sitemap files when the count limit is reached.
   *
   * It waits for the target stream of the current sitemap file to finish before
   * moving on to the next if the target stream is returned by the `getSitemapStream`
   * callback in the 3rd position of the tuple.
   *
   * ⚠️ CAUTION: This object is `readable` and must be read (e.g. piped to a file or to /dev/null)
   * before `finish` will be emitted. Failure to read the stream will result in hangs.
   *
   * @param {SitemapAndIndexStreamOptions} opts - Stream options.
   */
  constructor(opts: SitemapAndIndexStreamOptions) {
    opts.objectMode = true;
    super(opts);
    this.itemsWritten = 0;
    this.getSitemapStream = opts.getSitemapStream;
    this.limit = opts.limit ?? 45000;
  }

  _transform(
    item: SitemapItemLoose,
    encoding: string,
    callback: TransformCallback
  ): void {
    if (this.itemsWritten % this.limit === 0) {
      if (this.currentSitemap) {
        const onFinish = new Promise<void>((resolve, reject) => {
          this.currentSitemap?.on('finish', resolve);
          this.currentSitemap?.on('error', reject);
          this.currentSitemap?.end();
        });

        const onPipelineFinish = this.currentSitemapPipeline
          ? new Promise<void>((resolve, reject) => {
              this.currentSitemapPipeline?.on('finish', resolve);
              this.currentSitemapPipeline?.on('error', reject);
            })
          : Promise.resolve();

        Promise.all([onFinish, onPipelineFinish])
          .then(() => {
            this.createSitemap(encoding);
            this.writeItem(item, callback);
          })
          .catch(callback);
        return;
      } else {
        this.createSitemap(encoding);
      }
    }

    this.writeItem(item, callback);
  }

  private writeItem(item: SitemapItemLoose, callback: TransformCallback): void {
    if (!this.currentSitemap) {
      callback(new Error('No sitemap stream available'));
      return;
    }

    if (!this.currentSitemap.write(item)) {
      this.currentSitemap.once('drain', callback);
    } else {
      process.nextTick(callback);
    }

    // Increment the count of items written
    this.itemsWritten++;
  }

  /**
   * Called when the stream is finished.
   * If there is a current sitemap, we wait for it to finish before calling the callback.
   *
   * @param cb
   */
  _flush(cb: TransformCallback): void {
    const onFinish = new Promise<void>((resolve, reject) => {
      if (this.currentSitemap) {
        this.currentSitemap.on('finish', resolve);
        this.currentSitemap.on('error', reject);
        this.currentSitemap.end();
      } else {
        resolve();
      }
    });

    const onPipelineFinish = new Promise<void>((resolve, reject) => {
      if (this.currentSitemapPipeline) {
        this.currentSitemapPipeline.on('finish', resolve);
        this.currentSitemapPipeline.on('error', reject);
        // The pipeline (pipe target) will get it's end() call
        // from the sitemap stream ending.
      } else {
        resolve();
      }
    });

    Promise.all([onFinish, onPipelineFinish])
      .then(() => {
        super._flush(cb);
      })
      .catch((err) => {
        cb(err);
      });
  }

  private createSitemap(encoding: string): void {
    const [idxItem, currentSitemap, currentSitemapPipeline] =
      this.getSitemapStream(this.itemsWritten / this.limit);
    currentSitemap.on('error', (err) => this.emit('error', err));
    this.currentSitemap = currentSitemap;
    this.currentSitemapPipeline = currentSitemapPipeline;
    super._transform(idxItem, encoding, () => {
      // We are not too fussed about waiting for the index item to be written
      // we we'll wait for the file to finish at the end
      // and index file write volume tends to be small in comprarison to sitemap
      // writes.
      // noop
    });
  }
}
