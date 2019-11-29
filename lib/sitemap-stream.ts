import {
  Transform,
  TransformOptions,
  TransformCallback,
  Readable,
  Writable,
} from 'stream';
import { SitemapItemLoose, ErrorLevel, SitemapStreamOptions } from './types';
import { validateSMIOptions, normalizeURL } from './utils';
import { SitemapItemStream } from './sitemap-item-stream';
export const preamble =
  '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">';
export const closetag = '</urlset>';
export interface SitemapStreamOpts
  extends TransformOptions,
    Pick<SitemapStreamOptions, 'hostname' | 'level' | 'lastmodDateOnly'> {
  errorHandler?: (error: Error, level: ErrorLevel) => void;
}
const defaultStreamOpts: SitemapStreamOpts = {};
/**
 * A [Transform](https://nodejs.org/api/stream.html#stream_implementing_a_transform_stream)
 * for turning a
 * [Readable stream](https://nodejs.org/api/stream.html#stream_readable_streams)
 * of either [SitemapItemOptions](#sitemap-item-options) or url strings into a
 * Sitemap. The readable stream it transforms **must** be in object mode.
 */
export class SitemapStream extends Transform {
  errorHandler?: (error: Error, level: ErrorLevel) => void;
  hostname?: string;
  level: ErrorLevel;
  private hasHeadOutput: boolean;
  private smiStream: SitemapItemStream;
  lastmodDateOnly: boolean;
  constructor(opts = defaultStreamOpts) {
    opts.objectMode = true;
    super(opts);
    this.hasHeadOutput = false;
    this.hostname = opts.hostname;
    this.level = opts.level || ErrorLevel.WARN;
    this.smiStream = new SitemapItemStream({ level: opts.level });
    this.smiStream.on('data', data => this.push(data));
    this.lastmodDateOnly = opts.lastmodDateOnly || false;
    this.errorHandler = opts.errorHandler;
  }

  _transform(
    item: SitemapItemLoose,
    encoding: string,
    callback: TransformCallback
  ): void {
    if (!this.hasHeadOutput) {
      this.hasHeadOutput = true;
      this.push(preamble);
    }
    this.smiStream.write(
      validateSMIOptions(
        normalizeURL(item, this.hostname, this.lastmodDateOnly),
        this.level,
        this.errorHandler
      )
    );
    callback();
  }

  _flush(cb: TransformCallback): void {
    this.push(closetag);
    cb();
  }
}

/**
 * Takes a stream returns a promise that resolves when stream emits finish
 * @param stream what you want wrapped in a promise
 */
export function streamToPromise(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject): void => {
    let drain: Buffer;
    stream
      .pipe(
        new Writable({
          write(chunk, enc, next): void {
            if (!drain) {
              drain = chunk;
            } else {
              drain = Buffer.concat([drain, chunk]);
            }
            next();
          },
        })
      )
      .on('error', reject)
      .on('finish', () => resolve(drain));
  });
}
