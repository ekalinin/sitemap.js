import {
  Transform,
  TransformOptions,
  TransformCallback,
  Readable,
  Writable,
} from 'stream';
import { SitemapItemLoose, ErrorLevel, ErrorHandler } from './types';
import { validateSMIOptions, normalizeURL } from './utils';
import { SitemapItemToXMLString } from './sitemap-item-stream';
import { EmptyStream, EmptySitemap } from './errors';

const xmlDec = '<?xml version="1.0" encoding="UTF-8"?>';
export const stylesheetInclude = (url: string): string => {
  return `<?xml-stylesheet type="text/xsl" href="${url}"?>`;
};
const urlsetTagStart =
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';

export interface NSArgs {
  news: boolean;
  video: boolean;
  xhtml: boolean;
  image: boolean;
  custom?: string[];
}
const getURLSetNs: (opts: NSArgs, xslURL?: string) => string = (
  { news, video, image, xhtml, custom },
  xslURL
) => {
  let ns = xmlDec;
  if (xslURL) {
    ns += stylesheetInclude(xslURL);
  }

  ns += urlsetTagStart;

  if (news) {
    ns += ' xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"';
  }

  if (xhtml) {
    ns += ' xmlns:xhtml="http://www.w3.org/1999/xhtml"';
  }

  if (image) {
    ns += ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"';
  }

  if (video) {
    ns += ' xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"';
  }

  if (custom) {
    ns += ' ' + custom.join(' ');
  }

  return ns + '>';
};

export const closetag = '</urlset>';
export interface SitemapStreamOptions extends TransformOptions {
  /**
   * Byte limit to allow in the sitemap
   *
   * Sitemaps are supposed to be 50 MB or less in total size
   *
   * Writing throws if count would be exceeded by the write
   *
   * @default unlimited
   */
  byteLimit?: number;
  /**
   * Count of items to allow in the sitemap
   *
   * Sitemaps are supposed to have 50,000 or less items
   *
   * Writing throws if count would be exceeded by the write
   *
   * @default unlimited
   */
  countLimit?: number;
  hostname?: string;
  level?: ErrorLevel;
  lastmodDateOnly?: boolean;
  xmlns?: NSArgs;
  xslUrl?: string;
  errorHandler?: ErrorHandler;
}
const defaultXMLNS: NSArgs = {
  news: true,
  xhtml: true,
  image: true,
  video: true,
};
const defaultStreamOpts: SitemapStreamOptions = {
  xmlns: defaultXMLNS,
};
/**
 * A [Transform](https://nodejs.org/api/stream.html#stream_implementing_a_transform_stream)
 * for turning a
 * [Readable stream](https://nodejs.org/api/stream.html#stream_readable_streams)
 * of either [SitemapItemOptions](#sitemap-item-options) or url strings into a
 * Sitemap. The readable stream it transforms **must** be in object mode.
 */
export class SitemapStream extends Transform {
  private byteLimit?: number;
  private countLimit?: number;
  private hostname?: string;
  private level: ErrorLevel;
  private hasHeadOutput: boolean;
  private xmlNS: NSArgs;
  private xslUrl?: string;
  private errorHandler?: ErrorHandler;
  private lastmodDateOnly: boolean;
  private _itemCount: number;
  private _byteCount: number;
  private _wroteCloseTag: boolean;

  constructor(opts = defaultStreamOpts) {
    opts.objectMode = true;
    super(opts);
    this.hasHeadOutput = false;
    this.hostname = opts.hostname;
    this.level = opts.level || ErrorLevel.WARN;
    this.errorHandler = opts.errorHandler;
    this.lastmodDateOnly = opts.lastmodDateOnly || false;
    this.xmlNS = opts.xmlns || defaultXMLNS;
    this.xslUrl = opts.xslUrl;
    this.byteLimit = opts.byteLimit;
    this.countLimit = opts.countLimit;
    this._byteCount = 0;
    this._itemCount = 0;
    this._wroteCloseTag = false;
  }

  public get byteCount(): number {
    return this._byteCount;
  }

  public get itemCount(): number {
    return this._itemCount;
  }

  public get wroteCloseTag(): boolean {
    return this._wroteCloseTag;
  }

  _transform(
    item: SitemapItemLoose,
    encoding: string,
    callback: TransformCallback
  ): void {
    if (!this.hasHeadOutput) {
      // Add the opening tag size and closing tag size (since we have to close)
      this.hasHeadOutput = true;
      const headOutput = getURLSetNs(this.xmlNS, this.xslUrl);
      this._byteCount += headOutput.length + closetag.length;
      this.push(headOutput);
    }

    // Reject if item limit would be exceeded
    if (this.countLimit !== undefined && this._itemCount === this.countLimit) {
      // Write the close tag as the stream will be ended by raising an error
      this.push(closetag);
      this._wroteCloseTag = true;

      callback(
        new Error(
          'Item count limit would be exceeded, not writing, stream will close'
        )
      );
      return;
    }

    const itemOutput = SitemapItemToXMLString(
      validateSMIOptions(
        normalizeURL(item, this.hostname, this.lastmodDateOnly),
        this.level,
        this.errorHandler
      )
    );

    // Check if the size would be exceeded by the new item
    // and throw if it would exceed (when size limit enabled)
    if (this.byteLimit !== undefined) {
      if (this._byteCount + itemOutput.length > this.byteLimit) {
        // Write the close tag as the stream will be ended by raising an error
        this.push(closetag);
        this._wroteCloseTag = true;

        callback(
          new Error(
            'Byte count limit would be exceeded, not writing, stream will close'
          )
        );
        return;
      }
    }

    this.push(itemOutput);
    this._byteCount += itemOutput.length;
    this._itemCount += 1;

    callback();
  }

  _flush(cb: TransformCallback): void {
    if (this._wroteCloseTag) {
      cb();
    } else if (!this.hasHeadOutput) {
      this._wroteCloseTag = true;
      cb(new EmptySitemap());
    } else {
      this._wroteCloseTag = true;
      this.push(closetag);
      cb();
    }
  }
}

/**
 * Takes a stream returns a promise that resolves when stream emits finish
 * @param stream what you want wrapped in a promise
 */
export function streamToPromise(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject): void => {
    const drain: Buffer[] = [];
    stream
      .pipe(
        new Writable({
          write(chunk, enc, next): void {
            drain.push(chunk);
            next();
          },
        })
      )
      .on('error', () => reject)
      .on('finish', () => {
        if (!drain.length) {
          reject(new EmptyStream());
        } else {
          resolve(Buffer.concat(drain));
        }
      });
  });
}
