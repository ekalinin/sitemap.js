import { WriteStream } from 'node:fs';
import {
  Transform,
  type TransformOptions,
  type TransformCallback,
} from 'node:stream';
import { finished } from 'node:stream/promises';
import {
  type IndexItem,
  type SitemapItemLoose,
  type Logger,
  ErrorLevel,
  IndexTagNames,
} from './types.js';
import { resolveLogger } from './utils.js';
import { SitemapStream, stylesheetInclude } from './sitemap-stream.js';
import { element, otag, ctag } from './sitemap-xml.js';
import { LIMITS, DEFAULT_SITEMAP_ITEM_LIMIT } from './constants.js';
import { validateURL, validateXSLUrl } from './validation.js';

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

  /**
   * Receives warnings about invalid index items. Defaults to the console;
   * pass `false` to silence.
   */
  logger?: Logger | false;
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
  logger: Logger;
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
    // Resolve without the level: `level` is a public field that callers may
    // change after construction, so warn() checks it at call time instead
    this.logger = resolveLogger(ErrorLevel.WARN, opts.logger);
    if (opts.xslUrl !== undefined) {
      validateXSLUrl(opts.xslUrl);
    }
    this.xslUrl = opts.xslUrl;
  }

  /** Log a warning unless the current level is SILENT */
  private warn(...message: Parameters<Console['log']>): void {
    if (this.level !== ErrorLevel.SILENT) {
      this.logger('warn', ...message);
    }
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
      // Validate URL using centralized validation (checks protocol, length, format)
      const url = typeof item === 'string' ? item : item.url;
      if (!url || typeof url !== 'string') {
        const error = new Error(
          'Invalid sitemap index item: URL must be a non-empty string'
        );
        if (this.level === ErrorLevel.THROW) {
          callback(error);
          return;
        } else {
          this.warn(error.message, item);
        }
        // The logger is a no-op at SILENT; skip this item
        callback();
        return;
      }

      // Security: Use centralized validation to enforce protocol restrictions,
      // length limits, and prevent injection attacks
      try {
        validateURL(url, 'Sitemap index URL');
      } catch (error) {
        // Wrap the validation error with consistent message format
        const validationMsg =
          error instanceof Error ? error.message : String(error);
        const err = new Error(`Invalid URL in sitemap index: ${validationMsg}`);
        if (this.level === ErrorLevel.THROW) {
          callback(err);
          return;
        } else {
          this.warn(err.message);
        }
        // The logger is a no-op at SILENT; skip this item
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
            } else {
              this.warn(error.message);
            }
            // The logger is a no-op at SILENT; continue without lastmod
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
 * If other streams sit between the sitemap and the WriteStream, such as
 * `createGzip()`, connect them with `pipeline()` from `node:stream` rather than
 * `pipe()`, so a failure in any of them also fails the WriteStream.
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
export interface SitemapAndIndexStreamOptions extends SitemapIndexStreamOptions {
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
   * Settles once the current sitemap and its pipe target have both finished.
   * Rejects if either errors or is destroyed first.
   */
  private currentSitemapFinished?: Promise<void>;

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
    if (this.currentSitemap && this.itemsWritten % this.limit !== 0) {
      this.writeItem(this.currentSitemap, item, callback);
      return;
    }

    const startNextSitemap = (): void => {
      // The stream may have been destroyed while the last sitemap closed.
      if (this.destroyed) {
        return;
      }
      let sitemap: SitemapStream;
      try {
        sitemap = this.createSitemap(encoding);
      } catch (err) {
        callback(err as Error);
        return;
      }
      this.writeItem(sitemap, item, callback);
    };

    if (!this.currentSitemap) {
      startNextSitemap();
      return;
    }
    // Transform delivers items one at a time, so no other item can
    // arrive until this rotation calls back.
    this.closeCurrentSitemap().then(startNextSitemap, callback);
  }

  /**
   * Ends the current sitemap and waits until it and its pipe target, if any,
   * have finished, so each sitemap file is fully written before the next one
   * starts. Rejects if either stream errors or is destroyed before finishing.
   */
  private async closeCurrentSitemap(): Promise<void> {
    const sitemap = this.currentSitemap;
    if (!sitemap) {
      return;
    }
    // The pipe target gets its end() call from the sitemap stream ending.
    sitemap.end();
    await this.currentSitemapFinished;
    this.currentSitemap = undefined;
    this.currentSitemapPipeline = undefined;
    this.currentSitemapFinished = undefined;
  }

  private writeItem(
    sitemap: SitemapStream,
    item: SitemapItemLoose,
    callback: TransformCallback
  ): void {
    if (!sitemap.write(item)) {
      sitemap.once('drain', callback);
    } else {
      process.nextTick(callback);
    }

    // Increment the count of items written
    this.itemsWritten++;
  }

  /**
   * Destroys the open sitemap and its target, if any, so a stopped stream
   * does not leave a file descriptor open.
   */
  _destroy(err: Error | null, cb: (error?: Error | null) => void): void {
    this.currentSitemap?.destroy();
    this.currentSitemapPipeline?.destroy();
    super._destroy(err, cb);
  }

  /**
   * Called when the stream is finished.
   * Closes the last sitemap before writing the end of the sitemap index.
   *
   * @param cb - The callback to invoke when flushing is complete
   */
  _flush(cb: TransformCallback): void {
    this.closeCurrentSitemap()
      .then(() => {
        super._flush(cb);
      })
      .catch(cb);
  }

  /**
   * Asks `getSitemapStream` for the next sitemap, adds it to the index and
   * makes it current. Throws if the callback throws or returns an invalid
   * tuple, or if the index rejects the sitemap's index item, after destroying
   * any streams the callback returned.
   */
  private createSitemap(encoding: string): SitemapStream {
    const sitemapIndex = this.itemsWritten / this.limit;
    let result: ReturnType<getSitemapStreamFunc>;

    try {
      result = this.getSitemapStream(sitemapIndex);
    } catch (err) {
      throw new Error(
        `getSitemapStream callback threw an error for index ${sitemapIndex}: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // Validate the return value
    if (!Array.isArray(result) || result.length !== 3) {
      throw new Error(
        `getSitemapStream must return a 3-element array [IndexItem | string, SitemapStream, WriteStream], got: ${typeof result}`
      );
    }

    const [idxItem, currentSitemap, currentSitemapPipeline] = result;
    // The callback has already opened these streams, so a tuple rejected
    // below must not leave them, or the file they write to, open.
    const discard = (err: Error): Error => {
      for (const stream of [currentSitemap, currentSitemapPipeline]) {
        if (stream && typeof stream.destroy === 'function') {
          stream.destroy();
        }
      }
      return err;
    };

    // Validate each element
    if (
      !idxItem ||
      (typeof idxItem !== 'string' && typeof idxItem !== 'object')
    ) {
      throw discard(
        new Error(
          'getSitemapStream must return an IndexItem or string as the first element'
        )
      );
    }

    if (!currentSitemap || typeof currentSitemap.write !== 'function') {
      throw discard(
        new Error(
          'getSitemapStream must return a SitemapStream as the second element'
        )
      );
    }

    if (
      currentSitemapPipeline &&
      typeof currentSitemapPipeline.write !== 'function'
    ) {
      throw discard(
        new Error(
          'getSitemapStream must return a WriteStream or undefined as the third element'
        )
      );
    }

    // Add the sitemap to the index. SitemapIndexStream._transform calls back
    // synchronously, and at ErrorLevel.THROW it calls back with an error for
    // an invalid index item, which fails this sitemap too.
    let indexItemError: Error | null | undefined;
    super._transform(idxItem, encoding, (err) => {
      indexItemError = err;
    });
    if (indexItemError) {
      throw discard(indexItemError);
    }

    // Stays attached after rotation too, so an error a retired sitemap emits
    // later is reported rather than crashing the process as unhandled.
    currentSitemap.on('error', (err) => this.destroy(err));

    this.currentSitemap = currentSitemap;
    this.currentSitemapPipeline = currentSitemapPipeline;
    // Watch both streams from the start, not only while closing, so a target
    // that fails or goes away mid-sitemap stops this stream instead of
    // leaving a write waiting for 'drain' or crashing on an unhandled error.
    const opts = { readable: false, cleanup: true };
    this.currentSitemapFinished = Promise.all([
      finished(currentSitemap, opts),
      currentSitemapPipeline && finished(currentSitemapPipeline, opts),
    ]).then(() => undefined);
    this.currentSitemapFinished.catch((err: Error) => this.destroy(err));

    return currentSitemap;
  }
}
