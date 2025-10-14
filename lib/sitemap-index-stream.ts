import { WriteStream } from 'node:fs';
import { Transform, TransformOptions, TransformCallback } from 'node:stream';
import {
  IndexItem,
  SitemapItemLoose,
  ErrorLevel,
  IndexTagNames,
} from './types.js';
import { SitemapStream, stylesheetInclude } from './sitemap-stream.js';
import { element, otag, ctag } from './sitemap-xml.js';
import { LIMITS, DEFAULT_SITEMAP_ITEM_LIMIT } from './constants.js';

// Re-export IndexTagNames for backward compatibility
export { IndexTagNames };

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

    try {
      // Validate URL
      const url = typeof item === 'string' ? item : item.url;
      if (!url || typeof url !== 'string') {
        const error = new Error(
          'Invalid sitemap index item: URL must be a non-empty string'
        );
        if (this.level === ErrorLevel.THROW) {
          callback(error);
          return;
        } else if (this.level === ErrorLevel.WARN) {
          console.warn(error.message, item);
        }
        // For SILENT or after WARN, skip this item
        callback();
        return;
      }

      // Basic URL validation
      try {
        new URL(url);
      } catch {
        const error = new Error(`Invalid URL in sitemap index: ${url}`);
        if (this.level === ErrorLevel.THROW) {
          callback(error);
          return;
        } else if (this.level === ErrorLevel.WARN) {
          console.warn(error.message);
        }
        // For SILENT or after WARN, skip this item
        callback();
        return;
      }

      this.push(otag(IndexTagNames.sitemap));
      if (typeof item === 'string') {
        this.push(element(IndexTagNames.loc, item));
      } else {
        this.push(element(IndexTagNames.loc, item.url));
        if (item.lastmod) {
          try {
            const lastmod: string = new Date(item.lastmod).toISOString();
            this.push(
              element(
                IndexTagNames.lastmod,
                this.lastmodDateOnly ? lastmod.slice(0, 10) : lastmod
              )
            );
          } catch {
            const error = new Error(
              `Invalid lastmod date in sitemap index: ${item.lastmod}`
            );
            if (this.level === ErrorLevel.THROW) {
              callback(error);
              return;
            } else if (this.level === ErrorLevel.WARN) {
              console.warn(error.message);
            }
            // Continue without lastmod for SILENT or after WARN
          }
        }
      }
      this.push(ctag(IndexTagNames.sitemap));
      callback();
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)));
    }
  }

  _flush(cb: TransformCallback): void {
    if (!this.hasHeadOutput) {
      this.writeHeadOutput();
    }

    this.push(closetag);
    cb();
  }
}

/**
 * Callback function type for creating new sitemap streams when the item limit is reached.
 *
 * This function is called by SitemapAndIndexStream to create a new sitemap file when
 * the current one reaches the item limit.
 *
 * @param i - The zero-based index of the sitemap file being created (0 for first sitemap,
 *            1 for second, etc.)
 * @returns A tuple containing:
 *          - [0]: IndexItem or URL string to add to the sitemap index
 *          - [1]: SitemapStream instance for writing sitemap items
 *          - [2]: WriteStream where the sitemap will be piped (the stream will be
 *                 awaited for 'finish' before creating the next sitemap)
 *
 * @example
 * ```typescript
 * const getSitemapStream = (i: number) => {
 *   const sitemapStream = new SitemapStream();
 *   const path = `./sitemap-${i}.xml`;
 *   const writeStream = createWriteStream(path);
 *   sitemapStream.pipe(writeStream);
 *   return [`https://example.com/${path}`, sitemapStream, writeStream];
 * };
 * ```
 */
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
   * Flag to prevent race conditions when creating new sitemap files.
   * Set to true while waiting for the current sitemap to finish and
   * a new one to be created.
   */
  private isCreatingSitemap: boolean;

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
    this.limit = opts.limit ?? DEFAULT_SITEMAP_ITEM_LIMIT;
    this.isCreatingSitemap = false;

    // Validate limit is within acceptable range per sitemaps.org spec
    // See: https://www.sitemaps.org/protocol.html#index
    if (
      this.limit < LIMITS.MIN_SITEMAP_ITEM_LIMIT ||
      this.limit > LIMITS.MAX_SITEMAP_ITEM_LIMIT
    ) {
      throw new Error(
        `limit must be between ${LIMITS.MIN_SITEMAP_ITEM_LIMIT} and ${LIMITS.MAX_SITEMAP_ITEM_LIMIT} per sitemaps.org spec, got ${this.limit}`
      );
    }
  }

  _transform(
    item: SitemapItemLoose,
    encoding: string,
    callback: TransformCallback
  ): void {
    if (this.itemsWritten % this.limit === 0) {
      // Prevent race condition if multiple items arrive during sitemap creation
      if (this.isCreatingSitemap) {
        // Wait and retry on next tick
        process.nextTick(() => this._transform(item, encoding, callback));
        return;
      }

      if (this.currentSitemap) {
        this.isCreatingSitemap = true;
        const currentSitemap = this.currentSitemap;
        const currentPipeline = this.currentSitemapPipeline;

        // Set up promises with proper cleanup to prevent memory leaks
        const onFinish = new Promise<void>((resolve, reject) => {
          const finishHandler = () => {
            currentSitemap.off('error', errorHandler);
            resolve();
          };
          const errorHandler = (err: Error) => {
            currentSitemap.off('finish', finishHandler);
            reject(err);
          };
          currentSitemap.on('finish', finishHandler);
          currentSitemap.on('error', errorHandler);
          currentSitemap.end();
        });

        const onPipelineFinish = currentPipeline
          ? new Promise<void>((resolve, reject) => {
              const finishHandler = () => {
                currentPipeline.off('error', errorHandler);
                resolve();
              };
              const errorHandler = (err: Error) => {
                currentPipeline.off('finish', finishHandler);
                reject(err);
              };
              currentPipeline.on('finish', finishHandler);
              currentPipeline.on('error', errorHandler);
            })
          : Promise.resolve();

        Promise.all([onFinish, onPipelineFinish])
          .then(() => {
            this.isCreatingSitemap = false;
            this.createSitemap(encoding);
            this.writeItem(item, callback);
          })
          .catch((err) => {
            this.isCreatingSitemap = false;
            callback(err);
          });
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
   * Includes proper event listener cleanup to prevent memory leaks.
   *
   * @param cb - The callback to invoke when flushing is complete
   */
  _flush(cb: TransformCallback): void {
    const currentSitemap = this.currentSitemap;
    const currentPipeline = this.currentSitemapPipeline;

    const onFinish = new Promise<void>((resolve, reject) => {
      if (currentSitemap) {
        const finishHandler = () => {
          currentSitemap.off('error', errorHandler);
          resolve();
        };
        const errorHandler = (err: Error) => {
          currentSitemap.off('finish', finishHandler);
          reject(err);
        };
        currentSitemap.on('finish', finishHandler);
        currentSitemap.on('error', errorHandler);
        currentSitemap.end();
      } else {
        resolve();
      }
    });

    const onPipelineFinish = new Promise<void>((resolve, reject) => {
      if (currentPipeline) {
        const finishHandler = () => {
          currentPipeline.off('error', errorHandler);
          resolve();
        };
        const errorHandler = (err: Error) => {
          currentPipeline.off('finish', finishHandler);
          reject(err);
        };
        currentPipeline.on('finish', finishHandler);
        currentPipeline.on('error', errorHandler);
        // The pipeline (pipe target) will get its end() call
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
    const sitemapIndex = this.itemsWritten / this.limit;
    let result: ReturnType<getSitemapStreamFunc>;

    try {
      result = this.getSitemapStream(sitemapIndex);
    } catch (err) {
      this.emit(
        'error',
        new Error(
          `getSitemapStream callback threw an error for index ${sitemapIndex}: ${err instanceof Error ? err.message : String(err)}`
        )
      );
      return;
    }

    // Validate the return value
    if (!Array.isArray(result) || result.length !== 3) {
      this.emit(
        'error',
        new Error(
          `getSitemapStream must return a 3-element array [IndexItem | string, SitemapStream, WriteStream], got: ${typeof result}`
        )
      );
      return;
    }

    const [idxItem, currentSitemap, currentSitemapPipeline] = result;

    // Validate each element
    if (
      !idxItem ||
      (typeof idxItem !== 'string' && typeof idxItem !== 'object')
    ) {
      this.emit(
        'error',
        new Error(
          'getSitemapStream must return an IndexItem or string as the first element'
        )
      );
      return;
    }

    if (!currentSitemap || typeof currentSitemap.write !== 'function') {
      this.emit(
        'error',
        new Error(
          'getSitemapStream must return a SitemapStream as the second element'
        )
      );
      return;
    }

    if (
      currentSitemapPipeline &&
      typeof currentSitemapPipeline.write !== 'function'
    ) {
      this.emit(
        'error',
        new Error(
          'getSitemapStream must return a WriteStream or undefined as the third element'
        )
      );
      return;
    }

    // Propagate errors from the sitemap stream
    currentSitemap.on('error', (err) => this.emit('error', err));

    this.currentSitemap = currentSitemap;
    this.currentSitemapPipeline = currentSitemapPipeline;

    super._transform(idxItem, encoding, () => {
      // We are not too concerned about waiting for the index item to be written
      // as we'll wait for the file to finish at the end, and index file write
      // volume tends to be small in comparison to sitemap writes.
      // noop
    });
  }
}
